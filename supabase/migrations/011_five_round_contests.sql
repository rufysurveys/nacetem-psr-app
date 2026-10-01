BEGIN;

ALTER TABLE public.contest_lifelines
  DROP CONSTRAINT IF EXISTS contest_lifelines_pkey;
ALTER TABLE public.contest_lifelines
  ADD COLUMN round_number integer NOT NULL DEFAULT 1 CHECK (round_number BETWEEN 1 AND 5);
ALTER TABLE public.contest_lifelines
  ADD CONSTRAINT contest_lifelines_pkey PRIMARY KEY (game_id, user_id, kind, round_number);

CREATE TABLE public.contest_round_awards (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  correct_answers integer NOT NULL,
  response_time_ms integer NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, round_number)
);
ALTER TABLE public.contest_round_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contest_round_awards FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_remote_game(p_game_id uuid)
RETURNS public.games
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  g public.games;
  round_no integer;
  start_s integer := 0;
  order_no integer := 0;
  slot integer;
  answer_s integer;
  reveal_s integer;
  wager_s integer;
  section text;
  choices jsonb;
  q public.questions;
  i integer;
  round_count integer;
BEGIN
  PERFORM public.app_require_member(p_game_id);
  SELECT * INTO g FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF g.host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the tournament host can start this match'; END IF;
  IF g.status = 'active' THEN RETURN g; END IF;
  IF g.status NOT IN ('scheduled', 'open', 'full') THEN RAISE EXCEPTION 'This match cannot be started'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_connections WHERE game_id=p_game_id AND user_id=auth.uid() AND last_seen>now()-interval '25 seconds')
    OR NOT EXISTS (SELECT 1 FROM public.game_connections WHERE game_id=p_game_id AND user_id<>auth.uid() AND last_seen>now()-interval '25 seconds' AND public.app_is_active_user(user_id)) THEN
    RAISE EXCEPTION 'The host and at least one other participant must be connected';
  END IF;
  IF g.is_proctored THEN
    PERFORM public.proctor_check(p_game_id, auth.uid());
    IF EXISTS (
      SELECT 1 FROM public.game_players p
      WHERE p.game_id=p_game_id
        AND EXISTS (SELECT 1 FROM public.game_connections c WHERE c.game_id=p_game_id AND c.user_id=p.user_id AND c.last_seen>clock_timestamp()-interval '25 seconds')
        AND NOT EXISTS (SELECT 1 FROM public.proctor_sessions s WHERE s.game_id=p_game_id AND s.user_id=p.user_id AND s.ready AND s.last_seen>clock_timestamp()-interval '15 seconds')
    ) THEN RAISE EXCEPTION 'Every connected participant must complete proctor setup before the host starts'; END IF;
  END IF;
  INSERT INTO public.game_players(game_id,user_id) VALUES(p_game_id,g.host_id) ON CONFLICT DO NOTHING;

  FOR round_no IN 1..5 LOOP
    SELECT jsonb_agg(s.section_key ORDER BY s.section_key) INTO choices FROM (
      SELECT section_key
      FROM public.questions
      WHERE NOT is_archived
        AND section_key IS NOT NULL
        AND question_kind = CASE WHEN round_no <= 3 THEN 'quiz' ELSE 'scenario' END
        AND NOT EXISTS (SELECT 1 FROM public.game_questions gq WHERE gq.game_id=p_game_id AND gq.question_id=questions.id)
      GROUP BY section_key HAVING count(*) >= 5
    ) s;
    IF choices IS NULL THEN RAISE EXCEPTION 'Not enough verified questions or scenarios for all five rounds'; END IF;
    SELECT value INTO section FROM jsonb_array_elements_text(choices) ORDER BY random() LIMIT 1;

    answer_s := CASE WHEN round_no = 4 THEN 30 WHEN round_no = 5 THEN 20 ELSE 15 END;
    reveal_s := CASE WHEN round_no >= 4 THEN 10 ELSE 6 END;
    wager_s := CASE WHEN round_no = 5 THEN 10 ELSE 0 END;
    slot := answer_s + reveal_s + wager_s;

    INSERT INTO public.contest_rounds(game_id,round_number,section_key,sections,spin_offset,end_offset)
      VALUES(p_game_id,round_no,section,choices,start_s,start_s+6+5*slot);

    i := 0;
    FOR q IN
      SELECT * FROM (
        SELECT * FROM public.questions
        WHERE NOT is_archived AND section_key=section
          AND question_kind=CASE WHEN round_no <= 3 THEN 'quiz' ELSE 'scenario' END
          AND NOT EXISTS (SELECT 1 FROM public.game_questions gq WHERE gq.game_id=p_game_id AND gq.question_id=questions.id)
        ORDER BY random() LIMIT 5
      ) selected ORDER BY challenge_tier,id
    LOOP
      INSERT INTO public.game_questions(
        game_id,question_id,question_order,question_text,options,correct_option_index,round_number,
        opens_offset,answer_offset,closes_offset,ends_offset,base_points,life_cost,section_key,
        rule_ref,rule_excerpt,explanation,source_ref
      ) VALUES (
        p_game_id,q.id,order_no,q.question_text,q.options,q.correct_option_index,round_no,
        start_s+6+i*slot,start_s+6+i*slot+wager_s,start_s+6+i*slot+wager_s+answer_s,start_s+6+(i+1)*slot,
        CASE WHEN round_no=5 THEN 50 WHEN round_no=4 THEN 30 WHEN round_no=3 AND i>=3 THEN 30 WHEN round_no=2 THEN 20 ELSE 10 END,
        CASE WHEN round_no=5 THEN 0 WHEN round_no=4 THEN 1 WHEN round_no=3 AND i>=3 THEN 2 WHEN round_no=3 THEN 1 ELSE 0 END,
        section,q.rule_ref,q.rule_excerpt,q.explanation,
        concat_ws(' ',q.source_file,CASE WHEN q.source_row IS NOT NULL THEN 'row '||q.source_row END)
      );
      i := i + 1;
      order_no := order_no + 1;
    END LOOP;
    start_s := start_s + 6 + 5*slot;
  END LOOP;

  UPDATE public.games SET status='active',engine_version=3,started_at=clock_timestamp()+interval '3 seconds',settled_order=-1,jackpot_started=false
    WHERE id=p_game_id RETURNING * INTO g;
  UPDATE public.game_players SET status='playing',life_tokens=3,jackpot_balance=100 WHERE game_id=p_game_id;
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION public.contest_v2_advance(p_game uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; q public.game_questions; pl record; elapsed numeric; round_count integer; finale_round integer; r record; BEGIN
  SELECT * INTO g FROM public.games WHERE id=p_game;
  IF g.status<>'active' OR g.engine_version NOT IN (2,3) THEN RETURN; END IF;
  finale_round:=CASE WHEN g.engine_version=2 THEN 3 ELSE 5 END;
  elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
  IF NOT EXISTS(SELECT 1 FROM public.game_questions WHERE game_id=p_game AND question_order>g.settled_order AND closes_offset<=elapsed)
    AND (g.jackpot_started OR elapsed<(SELECT spin_offset FROM public.contest_rounds WHERE game_id=p_game AND round_number=finale_round))
    AND elapsed<(SELECT max(end_offset) FROM public.contest_rounds WHERE game_id=p_game) THEN RETURN; END IF;
  SELECT * INTO g FROM public.games WHERE id=p_game FOR UPDATE;
  IF g.status<>'active' THEN RETURN; END IF;
  elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
  IF NOT g.jackpot_started AND elapsed>=(SELECT spin_offset FROM public.contest_rounds WHERE game_id=p_game AND round_number=finale_round) THEN
    UPDATE public.games SET jackpot_started=true WHERE id=p_game;
    UPDATE public.game_players SET current_score=current_score+100 WHERE game_id=p_game;
  END IF;
  FOR q IN SELECT * FROM public.game_questions WHERE game_id=p_game AND question_order>g.settled_order AND closes_offset<=elapsed ORDER BY question_order LOOP
    FOR pl IN SELECT user_id FROM public.game_players p WHERE game_id=p_game AND NOT EXISTS(SELECT 1 FROM public.answers a WHERE a.game_id=p_game AND a.question_id=q.question_id AND a.user_id=p.user_id) LOOP
      PERFORM public.contest_v2_score(p_game,q.question_id,pl.user_id,-1,(q.closes_offset-q.answer_offset)*1000);
    END LOOP;
    UPDATE public.games SET settled_order=q.question_order WHERE id=p_game;
  END LOOP;
  FOR r IN SELECT * FROM public.contest_rounds WHERE game_id=p_game AND round_number<=finale_round AND end_offset<=elapsed ORDER BY round_number LOOP
    INSERT INTO public.contest_round_awards(game_id,round_number,user_id,correct_answers,response_time_ms)
    SELECT p_game,r.round_number,ranked.user_id,ranked.correct_answers,ranked.response_time_ms
    FROM (
      SELECT p.user_id,count(a.id) FILTER (WHERE a.is_correct)::integer AS correct_answers,
        coalesce(sum(a.response_time_ms) FILTER (WHERE a.is_correct),2147483647)::integer AS response_time_ms
      FROM public.game_players p
      LEFT JOIN public.game_questions round_q ON round_q.game_id=p.game_id AND round_q.round_number=r.round_number
      LEFT JOIN public.answers a ON a.game_id=p.game_id AND a.question_id=round_q.question_id AND a.user_id=p.user_id
      WHERE p.game_id=p_game
      GROUP BY p.user_id
      HAVING count(a.id) FILTER (WHERE a.is_correct)>0
      ORDER BY count(a.id) FILTER (WHERE a.is_correct) DESC,
        coalesce(sum(a.response_time_ms) FILTER (WHERE a.is_correct),2147483647),p.user_id
      LIMIT 1
    ) ranked
    ON CONFLICT(game_id,round_number) DO NOTHING;
  END LOOP;
  IF elapsed>=(SELECT max(end_offset) FROM public.contest_rounds WHERE game_id=p_game) THEN
    SELECT count(*) INTO round_count FROM public.game_questions WHERE game_id=p_game;
    IF g.engine_version=2 THEN round_count:=15; END IF;
    INSERT INTO public.results(game_id,user_id,total_score,total_accuracy,rank,xp_earned)
    SELECT p_game,p.user_id,p.current_score,round(100.0*count(a.id) FILTER(WHERE a.is_correct)/greatest(round_count,1),2),
      dense_rank() OVER(ORDER BY p.current_score DESC,count(a.id) FILTER(WHERE a.is_correct) DESC,sum(a.response_time_ms))::integer,greatest(0,p.current_score)
    FROM public.game_players p LEFT JOIN public.answers a ON a.game_id=p.game_id AND a.user_id=p.user_id WHERE p.game_id=p_game GROUP BY p.user_id,p.current_score
    ON CONFLICT(game_id,user_id) DO NOTHING;
    UPDATE public.games SET status='completed' WHERE id=p_game;
    UPDATE public.game_players SET status='completed' WHERE game_id=p_game;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.contest_v2_score(p_game uuid,p_question uuid,p_user uuid,p_option integer,p_elapsed integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q public.game_questions; pl public.game_players; prior public.answers; correct boolean; base integer:=0; bonus integer:=0; stake integer:=0; delta integer:=0; lost integer:=0; engine integer; BEGIN
  SELECT * INTO pl FROM public.game_players WHERE game_id=p_game AND user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join the room first'; END IF;
  SELECT * INTO prior FROM public.answers WHERE game_id=p_game AND question_id=p_question AND user_id=p_user;
  IF FOUND THEN RETURN jsonb_build_object('is_correct',prior.is_correct,'points_earned',prior.points_earned,'current_total_score',pl.current_score); END IF;
  SELECT * INTO q FROM public.game_questions WHERE game_id=p_game AND question_id=p_question;
  SELECT engine_version INTO engine FROM public.games WHERE id=p_game;
  correct:=p_option=q.correct_option_index;
  IF engine=2 THEN
    IF q.round_number=3 AND pl.life_tokens<=0 THEN correct:=false;p_option:=-1;END IF;
    IF correct THEN base:=q.base_points;bonus:=greatest(0,ceil((q.closes_offset-q.answer_offset-p_elapsed/1000.0)/(q.closes_offset-q.answer_offset)*CASE WHEN q.round_number=2 THEN 10 ELSE 5 END))::integer;END IF;
    IF q.round_number=3 AND pl.life_tokens>0 THEN
      SELECT coalesce(amount,0) INTO stake FROM public.contest_wagers WHERE game_id=p_game AND user_id=p_user AND question_id=p_question;
      stake:=coalesce(stake,0);delta:=CASE WHEN correct THEN stake ELSE -stake END;
      lost:=CASE WHEN correct THEN 0 ELSE least(q.life_cost,pl.life_tokens) END;
    END IF;
    INSERT INTO public.answers(game_id,question_id,user_id,selected_option,is_correct,response_time_ms,points_earned,wager_delta,lives_lost)
      VALUES(p_game,p_question,p_user,p_option,correct,p_elapsed,base+bonus+delta,delta,lost);
    UPDATE public.game_players SET current_score=current_score+base+bonus+delta,life_tokens=life_tokens-lost,jackpot_balance=jackpot_balance+delta
      WHERE game_id=p_game AND user_id=p_user RETURNING * INTO pl;
    RETURN jsonb_build_object('is_correct',correct,'points_earned',base+bonus+delta,'current_total_score',pl.current_score);
  END IF;
  IF q.round_number IN (3,4) AND pl.life_tokens<=0 THEN correct:=false;p_option:=-1;END IF;
  IF correct THEN base:=q.base_points;bonus:=greatest(0,ceil((q.closes_offset-q.answer_offset-p_elapsed/1000.0)/(q.closes_offset-q.answer_offset)*CASE WHEN q.round_number IN (2,4) THEN 10 ELSE 5 END))::integer;END IF;
  IF q.round_number=5 AND pl.life_tokens>0 THEN
    SELECT coalesce(amount,0) INTO stake FROM public.contest_wagers WHERE game_id=p_game AND user_id=p_user AND question_id=p_question;
    stake:=coalesce(stake,0);delta:=CASE WHEN correct THEN stake ELSE -stake END;
  END IF;
  IF q.round_number IN (3,4) AND pl.life_tokens>0 THEN lost:=CASE WHEN correct THEN 0 ELSE least(q.life_cost,pl.life_tokens) END;END IF;
  INSERT INTO public.answers(game_id,question_id,user_id,selected_option,is_correct,response_time_ms,points_earned,wager_delta,lives_lost)
    VALUES(p_game,p_question,p_user,p_option,correct,p_elapsed,base+bonus+delta,delta,lost);
  UPDATE public.game_players SET current_score=current_score+base+bonus+delta,life_tokens=life_tokens-lost,jackpot_balance=jackpot_balance+delta
    WHERE game_id=p_game AND user_id=p_user RETURNING * INTO pl;
  RETURN jsonb_build_object('is_correct',correct,'points_earned',base+bonus+delta,'current_total_score',pl.current_score);
END $$;

CREATE OR REPLACE FUNCTION public.submit_player_answer(p_game_id uuid,p_question_id uuid,p_selected_option integer,p_response_time_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; q public.game_questions; elapsed integer; received timestamptz:=clock_timestamp(); BEGIN
  PERFORM public.app_require_member(p_game_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  IF g.engine_version=1 THEN RETURN public.contest_v2_answer_internal(p_game_id,p_question_id,p_selected_option,p_response_time_ms); END IF;
  PERFORM public.contest_v2_advance(p_game_id);
  PERFORM 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
  IF EXISTS(SELECT 1 FROM public.answers WHERE game_id=p_game_id AND question_id=p_question_id AND user_id=auth.uid()) THEN RETURN public.contest_v2_score(p_game_id,p_question_id,auth.uid(),p_selected_option,0); END IF;
  SELECT * INTO q FROM public.game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
  IF NOT FOUND OR g.status<>'active' THEN RAISE EXCEPTION 'No active question'; END IF;
  elapsed:=floor(extract(epoch FROM(received-g.started_at))*1000)::integer-q.answer_offset*1000;
  IF elapsed<0 OR elapsed>=(q.closes_offset-q.answer_offset)*1000 THEN RAISE EXCEPTION 'The answer window has closed or has not started'; END IF;
  IF p_selected_option IS NULL OR p_selected_option NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid option'; END IF;
  IF q.round_number IN (3,4) AND (SELECT life_tokens FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid())<=0 THEN RAISE EXCEPTION 'No lives remain. Watch the rest of the contest'; END IF;
  RETURN public.contest_v2_score(p_game_id,p_question_id,auth.uid(),p_selected_option,elapsed);
END $$;

CREATE OR REPLACE FUNCTION public.use_contest_lifeline(p_game_id uuid,p_question_id uuid,p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; q public.game_questions; elapsed numeric; hidden jsonb; BEGIN
  PERFORM public.app_require_member(p_game_id);PERFORM public.contest_v2_advance(p_game_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  PERFORM 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
  SELECT * INTO q FROM public.game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
  elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
  IF NOT FOUND OR g.status<>'active' OR elapsed<q.answer_offset OR elapsed>=q.closes_offset THEN RAISE EXCEPTION 'Use lifelines during the answer window'; END IF;
  IF EXISTS(SELECT 1 FROM public.answers WHERE game_id=p_game_id AND question_id=p_question_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Your answer is already saved'; END IF;
  IF p_kind='fifty' THEN SELECT jsonb_agg(i) INTO hidden FROM(SELECT i FROM generate_series(0,3) i WHERE i<>q.correct_option_index ORDER BY random() LIMIT 2) s;
  ELSIF p_kind<>'peek' THEN RAISE EXCEPTION 'Unknown lifeline'; END IF;
  INSERT INTO public.contest_lifelines(game_id,user_id,kind,question_id,hidden_options,round_number)
    VALUES(p_game_id,auth.uid(),p_kind,p_question_id,hidden,q.round_number) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'You already used this lifeline in this round'; END IF;
  RETURN jsonb_build_object('hidden_options',hidden,'peek',CASE WHEN p_kind='peek' THEN q.rule_ref||': '||q.rule_excerpt ELSE NULL END);
END $$;

CREATE OR REPLACE FUNCTION public.place_contest_wager(p_game_id uuid,p_question_id uuid,p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; q public.game_questions; pl public.game_players; elapsed numeric; BEGIN
  PERFORM public.app_require_member(p_game_id);PERFORM public.contest_v2_advance(p_game_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  SELECT * INTO pl FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join the room first'; END IF;
  SELECT * INTO q FROM public.game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
  elapsed:=extract(epoch FROM(clock_timestamp()-g.started_at));
  IF NOT FOUND OR g.status<>'active' OR q.round_number<>(CASE WHEN g.engine_version=2 THEN 3 ELSE 5 END)
    OR elapsed<q.opens_offset OR elapsed>=q.answer_offset THEN RAISE EXCEPTION 'The wager window is closed'; END IF;
  IF (g.engine_version=3 AND pl.life_tokens<=0) OR p_amount NOT IN (0,10,25,50,100) OR p_amount>pl.jackpot_balance THEN
    RAISE EXCEPTION 'Choose an affordable points wager while eligible';
  END IF;
  INSERT INTO public.contest_wagers(game_id,user_id,question_id,amount) VALUES(p_game_id,auth.uid(),p_question_id,p_amount) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'Your wager is already locked'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.remote_room_state(p_game_id uuid,p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; r public.contest_rounds; q public.game_questions; elapsed numeric; phase text:='lobby'; boundary timestamptz; question_json jsonb; answer_json jsonb; players_json jsonb; lifelines jsonb; awards_json jsonb; server_now timestamptz; total_questions integer:=15; BEGIN
  PERFORM public.app_require_member(p_game_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  IF g.engine_version=1 AND g.status IN ('active','completed') THEN RETURN public.contest_state_internal(p_game_id,p_client_id); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
  INSERT INTO public.game_connections VALUES(p_game_id,auth.uid(),p_client_id,clock_timestamp()) ON CONFLICT(game_id,user_id,client_id) DO UPDATE SET last_seen=excluded.last_seen;
  PERFORM public.contest_v2_advance(p_game_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  SELECT count(*) INTO total_questions FROM public.game_questions WHERE game_id=p_game_id;
  server_now:=clock_timestamp();elapsed:=extract(epoch FROM(server_now-g.started_at));
  IF g.status='completed' THEN phase:='completed';
  ELSIF g.status='cancelled' THEN phase:='cancelled';
  ELSIF g.status='active' THEN
    SELECT * INTO r FROM public.contest_rounds WHERE game_id=p_game_id AND end_offset>elapsed ORDER BY round_number LIMIT 1;
    IF elapsed<0 THEN phase:='countdown';boundary:=g.started_at;
    ELSIF elapsed<r.spin_offset+6 THEN phase:='wheel';boundary:=g.started_at+make_interval(secs=>r.spin_offset+6);
    ELSE
      SELECT * INTO q FROM public.game_questions WHERE game_id=p_game_id AND opens_offset<=elapsed AND ends_offset>elapsed ORDER BY question_order LIMIT 1;
      phase:=CASE WHEN elapsed<q.answer_offset THEN 'wager' WHEN elapsed<q.closes_offset THEN 'answer' ELSE 'reveal' END;
      boundary:=g.started_at+make_interval(secs=>CASE phase WHEN 'wager' THEN q.answer_offset WHEN 'answer' THEN q.closes_offset ELSE q.ends_offset END);
      SELECT jsonb_build_object('selected_option',a.selected_option,'is_correct',a.is_correct,'points_earned',a.points_earned,'lives_lost',a.lives_lost,'wager_delta',a.wager_delta) INTO answer_json
        FROM public.answers a WHERE a.game_id=p_game_id AND a.question_id=q.question_id AND a.user_id=auth.uid();
      question_json:=jsonb_build_object('id',q.question_id,'question_text',q.question_text,'options',q.options,'question_order',q.question_order,'round_number',q.round_number,'base_points',q.base_points,'life_cost',q.life_cost,
        'rule_ref',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.rule_ref END,'explanation',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.explanation END,
        'correct_option_index',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.correct_option_index END,'source_ref',CASE WHEN phase='reveal' OR answer_json IS NOT NULL THEN q.source_ref END);
    END IF;
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.rank NULLS LAST,t.current_score DESC,t.joined_at),'[]') INTO players_json FROM(
    SELECT p.user_id,pr.full_name,pr.department,p.current_score,p.life_tokens,p.jackpot_balance,p.joined_at,re.total_accuracy,re.rank,
      EXISTS(SELECT 1 FROM public.game_connections c WHERE c.game_id=p_game_id AND c.user_id=p.user_id AND c.last_seen>server_now-interval '25 seconds') AND public.app_is_active_user(p.user_id) AS connected
    FROM public.game_players p JOIN public.profiles pr ON pr.user_id=p.user_id LEFT JOIN public.results re ON re.game_id=p.game_id AND re.user_id=p.user_id WHERE p.game_id=p_game_id) t;
  SELECT jsonb_build_object('used_fifty',EXISTS(SELECT 1 FROM public.contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND kind='fifty' AND round_number=q.round_number),
    'used_peek',EXISTS(SELECT 1 FROM public.contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND kind='peek' AND round_number=q.round_number),
    'hidden_options',(SELECT hidden_options FROM public.contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND question_id=q.question_id AND kind='fifty' AND round_number=q.round_number),
    'peek',CASE WHEN EXISTS(SELECT 1 FROM public.contest_lifelines WHERE game_id=p_game_id AND user_id=auth.uid() AND question_id=q.question_id AND kind='peek' AND round_number=q.round_number) THEN q.rule_ref||': '||q.rule_excerpt END) INTO lifelines;
  SELECT coalesce(jsonb_agg(jsonb_build_object('round_number',a.round_number,'user_id',a.user_id,'full_name',p.full_name,'correct_answers',a.correct_answers,'response_time_ms',a.response_time_ms) ORDER BY a.round_number),'[]'::jsonb)
    INTO awards_json FROM public.contest_round_awards a JOIN public.profiles p ON p.user_id=a.user_id WHERE a.game_id=p_game_id;
  RETURN jsonb_build_object('game',to_jsonb(g),'server_now',server_now,'phase',phase,'boundary',boundary,'round',to_jsonb(r),'question',question_json,'answer',answer_json,'players',players_json,'lifelines',lifelines,
    'wager',(SELECT amount FROM public.contest_wagers WHERE game_id=p_game_id AND question_id=q.question_id AND user_id=auth.uid()),'question_count',total_questions,'round_awards',awards_json);
END $$;

REVOKE ALL ON FUNCTION public.start_remote_game(uuid),public.submit_player_answer(uuid,uuid,integer,integer),public.use_contest_lifeline(uuid,uuid,text),public.place_contest_wager(uuid,uuid,integer),public.remote_room_state(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_remote_game(uuid),public.submit_player_answer(uuid,uuid,integer,integer),public.use_contest_lifeline(uuid,uuid,text),public.place_contest_wager(uuid,uuid,integer),public.remote_room_state(uuid,uuid) TO authenticated;

COMMIT;