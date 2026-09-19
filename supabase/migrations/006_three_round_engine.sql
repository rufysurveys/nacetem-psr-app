BEGIN;
ALTER TABLE games ADD COLUMN engine_version integer NOT NULL DEFAULT 1;
ALTER TABLE games ADD COLUMN is_proctored boolean NOT NULL DEFAULT false;
ALTER TABLE games ADD COLUMN settled_order integer NOT NULL DEFAULT -1;
ALTER TABLE games ADD COLUMN jackpot_started boolean NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN section_key text;
ALTER TABLE questions ADD COLUMN rule_ref text;
ALTER TABLE questions ADD COLUMN rule_excerpt text;
ALTER TABLE questions ADD COLUMN source_file text;
ALTER TABLE questions ADD COLUMN source_row integer;
ALTER TABLE questions ADD COLUMN question_kind text NOT NULL DEFAULT 'quiz' CHECK(question_kind IN ('quiz','scenario'));
ALTER TABLE questions ADD COLUMN challenge_tier integer NOT NULL DEFAULT 1 CHECK(challenge_tier BETWEEN 1 AND 3);
ALTER TABLE game_questions ADD COLUMN round_number integer NOT NULL DEFAULT 1;
ALTER TABLE game_questions ADD COLUMN opens_offset integer NOT NULL DEFAULT 0;
ALTER TABLE game_questions ADD COLUMN answer_offset integer NOT NULL DEFAULT 0;
ALTER TABLE game_questions ADD COLUMN closes_offset integer NOT NULL DEFAULT 15;
ALTER TABLE game_questions ADD COLUMN ends_offset integer NOT NULL DEFAULT 21;
ALTER TABLE game_questions ADD COLUMN base_points integer NOT NULL DEFAULT 10;
ALTER TABLE game_questions ADD COLUMN life_cost integer NOT NULL DEFAULT 0;
ALTER TABLE game_questions ADD COLUMN section_key text;
ALTER TABLE game_questions ADD COLUMN rule_ref text;
ALTER TABLE game_questions ADD COLUMN rule_excerpt text;
ALTER TABLE game_questions ADD COLUMN explanation text;
ALTER TABLE game_questions ADD COLUMN source_ref text;
ALTER TABLE game_players ADD COLUMN life_tokens integer NOT NULL DEFAULT 3;
ALTER TABLE game_players ADD COLUMN jackpot_balance integer NOT NULL DEFAULT 100;
ALTER TABLE answers ADD COLUMN points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE answers ADD COLUMN wager_delta integer NOT NULL DEFAULT 0;
ALTER TABLE answers ADD COLUMN lives_lost integer NOT NULL DEFAULT 0;
CREATE TABLE contest_rounds(game_id uuid REFERENCES games ON DELETE CASCADE,round_number integer,section_key text NOT NULL,sections jsonb NOT NULL,spin_offset integer NOT NULL,end_offset integer NOT NULL,PRIMARY KEY(game_id,round_number));
CREATE TABLE contest_lifelines(game_id uuid REFERENCES games ON DELETE CASCADE,user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,kind text CHECK(kind IN ('fifty','peek')),question_id uuid,hidden_options jsonb,PRIMARY KEY(game_id,user_id,kind));
CREATE TABLE contest_wagers(game_id uuid REFERENCES games ON DELETE CASCADE,user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,question_id uuid,amount integer NOT NULL CHECK(amount IN (0,10,25,50,100)),PRIMARY KEY(game_id,user_id,question_id));
ALTER TABLE contest_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_lifelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_wagers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON contest_rounds,contest_lifelines,contest_wagers FROM PUBLIC,anon,authenticated;

CREATE FUNCTION contest_v2_score(p_game uuid,p_question uuid,p_user uuid,p_option integer,p_elapsed integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q game_questions; pl game_players; prior answers; correct boolean; base integer:=0; bonus integer:=0; stake integer:=0; delta integer:=0; lost integer:=0; BEGIN
 SELECT * INTO pl FROM game_players WHERE game_id=p_game AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join the room first'; END IF;
 SELECT * INTO prior FROM answers WHERE game_id=p_game AND question_id=p_question AND user_id=p_user;
 IF FOUND THEN RETURN jsonb_build_object('is_correct',prior.is_correct,'points_earned',prior.points_earned,'current_total_score',pl.current_score); END IF;
 SELECT * INTO q FROM game_questions WHERE game_id=p_game AND question_id=p_question;
 correct:=p_option=q.correct_option_index;
 IF q.round_number=3 AND pl.life_tokens<=0 THEN correct:=false; p_option:=-1; END IF;
 IF correct THEN base:=q.base_points; bonus:=greatest(0,ceil((q.closes_offset-q.answer_offset-p_elapsed/1000.0)/(q.closes_offset-q.answer_offset)*CASE WHEN q.round_number=2 THEN 10 ELSE 5 END))::integer; END IF;
 IF q.round_number=3 AND pl.life_tokens>0 THEN
   SELECT coalesce(amount,0) INTO stake FROM contest_wagers WHERE game_id=p_game AND user_id=p_user AND question_id=p_question;
   stake:=coalesce(stake,0); delta:=CASE WHEN correct THEN stake ELSE -stake END;
   lost:=CASE WHEN correct THEN 0 ELSE least(q.life_cost,pl.life_tokens) END;
 END IF;
 INSERT INTO answers(game_id,question_id,user_id,selected_option,is_correct,response_time_ms,points_earned,wager_delta,lives_lost)
 VALUES(p_game,p_question,p_user,p_option,correct,p_elapsed,base+bonus+delta,delta,lost);
 UPDATE game_players SET current_score=current_score+base+bonus+delta,life_tokens=life_tokens-lost,jackpot_balance=jackpot_balance+delta WHERE game_id=p_game AND user_id=p_user RETURNING * INTO pl;
 RETURN jsonb_build_object('is_correct',correct,'points_earned',base+bonus+delta,'current_total_score',pl.current_score);
END $$;

CREATE FUNCTION contest_v2_advance(p_game uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; q game_questions; pl record; elapsed numeric; BEGIN
 SELECT * INTO g FROM games WHERE id=p_game;
 IF g.status<>'active' OR g.engine_version<>2 THEN RETURN; END IF;
 elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
 IF NOT EXISTS(SELECT 1 FROM game_questions WHERE game_id=p_game AND question_order>g.settled_order AND closes_offset<=elapsed)
   AND (g.jackpot_started OR elapsed<(SELECT spin_offset FROM contest_rounds WHERE game_id=p_game AND round_number=3))
   AND elapsed<(SELECT max(end_offset) FROM contest_rounds WHERE game_id=p_game) THEN RETURN; END IF;
 SELECT * INTO g FROM games WHERE id=p_game FOR UPDATE;
 IF g.status<>'active' THEN RETURN; END IF;
 elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
 IF NOT g.jackpot_started AND elapsed>=(SELECT spin_offset FROM contest_rounds WHERE game_id=p_game AND round_number=3) THEN
   UPDATE games SET jackpot_started=true WHERE id=p_game;
   UPDATE game_players SET current_score=current_score+100 WHERE game_id=p_game;
 END IF;
 FOR q IN SELECT * FROM game_questions WHERE game_id=p_game AND question_order>g.settled_order AND closes_offset<=elapsed ORDER BY question_order LOOP
   FOR pl IN SELECT user_id FROM game_players p WHERE game_id=p_game AND NOT EXISTS(SELECT 1 FROM answers a WHERE a.game_id=p_game AND a.question_id=q.question_id AND a.user_id=p.user_id) LOOP
     PERFORM contest_v2_score(p_game,q.question_id,pl.user_id,-1,(q.closes_offset-q.answer_offset)*1000);
   END LOOP;
   UPDATE games SET settled_order=q.question_order WHERE id=p_game;
 END LOOP;
 IF elapsed>=(SELECT max(end_offset) FROM contest_rounds WHERE game_id=p_game) THEN
   INSERT INTO results(game_id,user_id,total_score,total_accuracy,rank,xp_earned)
   SELECT p_game,p.user_id,p.current_score,round(100.0*count(a.id) FILTER(WHERE a.is_correct)/15,2),
     dense_rank() OVER(ORDER BY p.current_score DESC,count(a.id) FILTER(WHERE a.is_correct) DESC,sum(a.response_time_ms))::integer,greatest(0,p.current_score)
   FROM game_players p LEFT JOIN answers a ON a.game_id=p.game_id AND a.user_id=p.user_id WHERE p.game_id=p_game GROUP BY p.user_id,p.current_score
   ON CONFLICT(game_id,user_id) DO NOTHING;
   UPDATE games SET status='completed' WHERE id=p_game;
   UPDATE game_players SET status='completed' WHERE game_id=p_game;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION start_remote_game(p_game_id uuid) RETURNS games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; round_no integer; start_s integer:=0; order_no integer:=0; slot integer; answer_s integer; reveal_s integer; wager_s integer; section text; choices jsonb; q questions; i integer; used_section text; BEGIN
 PERFORM app_require_member(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id FOR UPDATE;
 IF g.host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the tournament host can start this match'; END IF;
 IF g.status='active' THEN RETURN g; END IF;
 IF g.status NOT IN ('scheduled','open','full') THEN RAISE EXCEPTION 'This match cannot be started'; END IF;
 IF NOT EXISTS(SELECT 1 FROM game_connections WHERE game_id=p_game_id AND user_id=auth.uid() AND last_seen>now()-interval '25 seconds')
 OR NOT EXISTS(SELECT 1 FROM game_connections WHERE game_id=p_game_id AND user_id<>auth.uid() AND last_seen>now()-interval '25 seconds' AND app_is_active_user(user_id)) THEN RAISE EXCEPTION 'The host and at least one other participant must be connected'; END IF;
 INSERT INTO game_players(game_id,user_id) VALUES(p_game_id,g.host_id) ON CONFLICT DO NOTHING;
 FOR round_no IN 1..3 LOOP
   SELECT jsonb_agg(s.section_key ORDER BY s.section_key) INTO choices FROM (
     SELECT section_key FROM questions WHERE NOT is_archived AND section_key IS NOT NULL AND question_kind=CASE WHEN round_no=1 THEN 'quiz' ELSE 'scenario' END
       AND NOT EXISTS(SELECT 1 FROM game_questions gq WHERE gq.game_id=p_game_id AND gq.question_id=questions.id)
     GROUP BY section_key HAVING count(*)>=5) s;
   IF choices IS NULL THEN RAISE EXCEPTION 'Not enough verified questions or scenarios for all three rounds'; END IF;
   SELECT value INTO section FROM jsonb_array_elements_text(choices) ORDER BY random() LIMIT 1;
   answer_s:=CASE WHEN round_no=2 THEN 25 ELSE 15 END; reveal_s:=CASE WHEN round_no=2 THEN 8 ELSE 6 END; wager_s:=CASE WHEN round_no=3 THEN 8 ELSE 0 END;
   slot:=answer_s+reveal_s+wager_s;
   INSERT INTO contest_rounds VALUES(p_game_id,round_no,section,choices,start_s,start_s+6+5*slot);
   i:=0;
   FOR q IN SELECT * FROM (SELECT * FROM questions WHERE NOT is_archived AND section_key=section AND question_kind=CASE WHEN round_no=1 THEN 'quiz' ELSE 'scenario' END
     AND NOT EXISTS(SELECT 1 FROM game_questions gq WHERE gq.game_id=p_game_id AND gq.question_id=questions.id) ORDER BY random() LIMIT 5) selected ORDER BY challenge_tier,id LOOP
     INSERT INTO game_questions(game_id,question_id,question_order,question_text,options,correct_option_index,round_number,opens_offset,answer_offset,closes_offset,ends_offset,base_points,life_cost,section_key,rule_ref,rule_excerpt,explanation,source_ref)
     VALUES(p_game_id,q.id,order_no,q.question_text,q.options,q.correct_option_index,round_no,start_s+6+i*slot,start_s+6+i*slot+wager_s,start_s+6+i*slot+wager_s+answer_s,start_s+6+(i+1)*slot,
       CASE WHEN round_no=2 THEN 20 WHEN round_no=3 AND i>=3 THEN 30 ELSE 10 END,CASE WHEN round_no<>3 THEN 0 WHEN i>=3 THEN 2 ELSE 1 END,
       section,q.rule_ref,q.rule_excerpt,q.explanation,concat_ws(' ',q.source_file,CASE WHEN q.source_row IS NOT NULL THEN 'row '||q.source_row END));
     i:=i+1;order_no:=order_no+1;
   END LOOP;
   start_s:=start_s+6+5*slot;
 END LOOP;
 UPDATE games SET status='active',engine_version=2,started_at=clock_timestamp()+interval '3 seconds',settled_order=-1,jackpot_started=false WHERE id=p_game_id RETURNING * INTO g;
 UPDATE game_players SET status='playing',life_tokens=3,jackpot_balance=100 WHERE game_id=p_game_id;
 RETURN g;
END $$;

CREATE OR REPLACE FUNCTION submit_player_answer(p_game_id uuid,p_question_id uuid,p_selected_option integer,p_response_time_ms integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; q game_questions; elapsed integer; received timestamptz:=clock_timestamp(); BEGIN
 PERFORM app_require_member(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id;
 IF g.engine_version=1 THEN RETURN contest_answer_internal(p_game_id,p_question_id,p_selected_option,p_response_time_ms); END IF;
 PERFORM contest_v2_advance(p_game_id);
 PERFORM 1 FROM game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
 IF EXISTS(SELECT 1 FROM answers WHERE game_id=p_game_id AND question_id=p_question_id AND user_id=auth.uid()) THEN RETURN contest_v2_score(p_game_id,p_question_id,auth.uid(),p_selected_option,0); END IF;
 SELECT * INTO q FROM game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
 IF NOT FOUND OR g.status<>'active' THEN RAISE EXCEPTION 'No active question'; END IF;
 elapsed:=floor(extract(epoch FROM(received-g.started_at))*1000)::integer-q.answer_offset*1000;
 IF elapsed<0 OR elapsed>=(q.closes_offset-q.answer_offset)*1000 THEN RAISE EXCEPTION 'The answer window has closed or has not started'; END IF;
 IF p_selected_option IS NULL OR p_selected_option NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid option'; END IF;
 IF q.round_number=3 AND (SELECT life_tokens FROM game_players WHERE game_id=p_game_id AND user_id=auth.uid())<=0 THEN RAISE EXCEPTION 'No lives remain. Watch the rest of the contest'; END IF;
 RETURN contest_v2_score(p_game_id,p_question_id,auth.uid(),p_selected_option,elapsed);
END $$;

CREATE FUNCTION use_contest_lifeline(p_game_id uuid,p_question_id uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; q game_questions; elapsed numeric; hidden jsonb; BEGIN
 PERFORM app_require_member(p_game_id);PERFORM contest_v2_advance(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id;
 PERFORM 1 FROM game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
 SELECT * INTO q FROM game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
 elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
 IF NOT FOUND OR g.status<>'active' OR elapsed<q.answer_offset OR elapsed>=q.closes_offset THEN RAISE EXCEPTION 'Use lifelines during the answer window'; END IF;
 IF EXISTS(SELECT 1 FROM answers WHERE game_id=p_game_id AND question_id=p_question_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Your answer is already saved'; END IF;
 IF p_kind='fifty' THEN SELECT jsonb_agg(i) INTO hidden FROM(SELECT i FROM generate_series(0,3) i WHERE i<>q.correct_option_index ORDER BY random() LIMIT 2) s;
 ELSIF p_kind<>'peek' THEN RAISE EXCEPTION 'Unknown lifeline'; END IF;
 INSERT INTO contest_lifelines VALUES(p_game_id,auth.uid(),p_kind,p_question_id,hidden) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'This lifeline has already been used'; END IF;
 RETURN jsonb_build_object('hidden_options',hidden,'peek',CASE WHEN p_kind='peek' THEN q.rule_ref||': '||q.rule_excerpt ELSE NULL END);
END $$;

CREATE FUNCTION place_contest_wager(p_game_id uuid,p_question_id uuid,p_amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; q game_questions; pl game_players; elapsed numeric; BEGIN
 PERFORM app_require_member(p_game_id);PERFORM contest_v2_advance(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id;
 SELECT * INTO pl FROM game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
 SELECT * INTO q FROM game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
 elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
 IF NOT FOUND OR g.status<>'active' OR q.round_number<>3 OR elapsed<q.opens_offset OR elapsed>=q.answer_offset THEN RAISE EXCEPTION 'The wager window is closed'; END IF;
 IF pl.life_tokens<=0 OR p_amount NOT IN (0,10,25,50,100) OR p_amount>pl.jackpot_balance THEN RAISE EXCEPTION 'Choose an affordable points wager while you have lives'; END IF;
 INSERT INTO contest_wagers VALUES(p_game_id,auth.uid(),p_question_id,p_amount) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'Your wager is already locked'; END IF;
END $$;

CREATE OR REPLACE FUNCTION remote_room_state(p_game_id uuid,p_client_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games; r contest_rounds; q game_questions; elapsed numeric; phase text:='lobby'; boundary timestamptz; question_json jsonb; answer_json jsonb; players_json jsonb; lifelines jsonb; server_now timestamptz; BEGIN
 PERFORM app_require_member(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id;
 IF g.engine_version=1 AND g.status IN ('active','completed') THEN RETURN contest_state_internal(p_game_id,p_client_id); END IF;
 IF NOT EXISTS(SELECT 1 FROM game_players WHERE game_id=p_game_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
 INSERT INTO game_connections VALUES(p_game_id,auth.uid(),p_client_id,clock_timestamp()) ON CONFLICT(game_id,user_id,client_id) DO UPDATE SET last_seen=excluded.last_seen;
 PERFORM contest_v2_advance(p_game_id);
 SELECT * INTO g FROM games WHERE id=p_game_id;
 server_now:=clock_timestamp();elapsed:=extract(epoch FROM(server_now-g.started_at));
 IF g.status='completed' THEN phase:='completed';
 ELSIF g.status='cancelled' THEN phase:='cancelled';
 ELSIF g.status='active' THEN
   SELECT * INTO r FROM contest_rounds WHERE game_id=p_game_id AND end_offset>elapsed ORDER BY round_number LIMIT 1;
   IF elapsed<0 THEN phase:='countdown';boundary:=g.started_at;
   ELSIF elapsed<r.spin_offset+6 THEN phase:='wheel';boundary:=g.started_at+make_interval(secs=>r.spin_offset+6);
   ELSE
     SELECT * INTO q FROM game_questions WHERE game_id=p_game_id AND opens_offset<=elapsed AND ends_offset>elapsed ORDER BY question_order LIMIT 1;
     phase:=CASE WHEN elapsed<q.answer_offset THEN 'wager' WHEN elapsed<q.closes_offset THEN 'answer' ELSE 'reveal' END;
     boundary:=g.started_at+make_interval(secs=>CASE phase WHEN 'wager' THEN q.answer_offset WHEN 'answer' THEN q.closes_offset ELSE q.ends_offset END);
     SELECT jsonb_build_object('selected_option',selected_option,'is_correct',is_correct,'points_earned',points_earned,'lives_lost',lives_lost,'wager_delta',wager_delta) INTO answer_json FROM answers WHERE game_id=p_game_id AND question_id=q.question_id AND user_id=auth.uid();
     question_json:=jsonb_build_object('id',q.question_id,'question_text',q.question_text,'options',q.options,'question_order',q.question_order,'round_number',q.round_number,'base_points',q.base_points,'life_cost',q.life_cost,
       'rule_ref',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.rule_ref END,'explanation',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.explanation END,
       'correct_option_index',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.correct_option_index END,'source_ref',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.source_ref END);
   END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.rank NULLS LAST,t.current_score DESC,t.joined_at),'[]') INTO players_json FROM(
   SELECT p.user_id,pr.full_name,pr.department,p.current_score,p.life_tokens,p.jackpot_balance,p.joined_at,re.total_accuracy,re.rank,
   EXISTS(SELECT 1 FROM game_connections c WHERE c.game_id=p_game_id AND c.user_id=p.user_id AND c.last_seen>server_now-interval '25 seconds') AND app_is_active_user(p.user_id) AS connected
   FROM game_players p JOIN profiles pr ON pr.user_id=p.user_id LEFT JOIN results re ON re.game_id=p.game_id AND re.user_id=p.user_id WHERE p.game_id=p_game_id) t;
 SELECT jsonb_build_object('used_fifty',EXISTS(SELECT 1 FROM contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND kind='fifty'),
   'used_peek',EXISTS(SELECT 1 FROM contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND kind='peek'),
   'hidden_options',(SELECT hidden_options FROM contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND question_id=q.question_id AND kind='fifty'),
   'peek',CASE WHEN EXISTS(SELECT 1 FROM contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND question_id=q.question_id AND kind='peek') THEN q.rule_ref||': '||q.rule_excerpt END) INTO lifelines;
 RETURN jsonb_build_object('game',to_jsonb(g),'server_now',server_now,'phase',phase,'boundary',boundary,'round',to_jsonb(r),'question',question_json,'answer',answer_json,'players',players_json,'lifelines',lifelines,
   'wager',(SELECT amount FROM contest_wagers WHERE game_id=p_game_id AND question_id=q.question_id AND user_id=auth.uid()),'question_count',15);
END $$;

REVOKE ALL ON FUNCTION contest_v2_score(uuid,uuid,uuid,integer,integer),contest_v2_advance(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION use_contest_lifeline(uuid,uuid,text),place_contest_wager(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION use_contest_lifeline(uuid,uuid,text),place_contest_wager(uuid,uuid,integer) TO authenticated;
COMMIT;
