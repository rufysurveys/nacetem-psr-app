-- Shared remote contests. Apply after migrations 001-003.
BEGIN;

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS question_seconds integer NOT NULL DEFAULT 15;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS reveal_seconds integer NOT NULL DEFAULT 3;
ALTER TABLE public.game_questions ADD COLUMN IF NOT EXISTS question_text text;
ALTER TABLE public.game_questions ADD COLUMN IF NOT EXISTS options jsonb;
ALTER TABLE public.game_questions ADD COLUMN IF NOT EXISTS correct_option_index integer;
CREATE TABLE IF NOT EXISTS public.game_connections (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id, client_id)
);
CREATE INDEX IF NOT EXISTS game_connections_recent ON public.game_connections(game_id, last_seen);
ALTER TABLE public.game_connections ENABLE ROW LEVEL SECURITY;

-- Replace permissive policies from the original prototype. All contest writes
-- go through authenticated functions below, never client-calculated scores.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN
      ('games','game_players','game_questions','questions','answers','results','game_connections','profiles')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;
CREATE POLICY games_read ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY players_read ON public.game_players FOR SELECT TO authenticated USING (true);
CREATE POLICY results_read ON public.results FOR SELECT TO authenticated USING (true);
CREATE POLICY answers_read ON public.answers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profile_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.games, public.game_players, public.game_questions, public.questions,
  public.answers, public.results, public.game_connections FROM anon, authenticated;
GRANT SELECT ON public.games, public.game_players, public.answers, public.results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.create_remote_game(
  p_title text, p_mode text, p_target_org text, p_start timestamptz,
  p_cutoff timestamptz, p_max_players integer, p_description text DEFAULT ''
) RETURNS public.games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.games; BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in with a real account to schedule a contest'; END IF;
  IF length(trim(p_title)) = 0 OR p_start <= now() OR p_cutoff > p_start OR p_cutoff <= now()
    OR p_max_players NOT BETWEEN 2 AND 1000 THEN
    RAISE EXCEPTION 'Choose a future start and cutoff (cutoff no later than start), and 2-1000 participants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.questions) THEN
    RAISE EXCEPTION 'The shared question bank is empty. Ask the administrator to import the question seed';
  END IF;
  INSERT INTO public.games(host_id,title,competition_mode,target_org,start_datetime,cutoff_datetime,max_players,status,description)
  VALUES(auth.uid(),trim(p_title),p_mode,p_target_org,p_start,p_cutoff,p_max_players,'scheduled',p_description) RETURNING * INTO g;
  INSERT INTO public.game_players(game_id,user_id) VALUES(g.id,auth.uid());
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.join_remote_game(p_game_id uuid)
RETURNS public.game_players LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.games; player public.game_players; BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in with a real account to join a contest'; END IF;
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  SELECT * INTO player FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid();
  IF FOUND THEN RETURN player; END IF;
  IF g.status NOT IN ('scheduled','open') OR now() > g.cutoff_datetime THEN
    RAISE EXCEPTION 'Registration is closed for this tournament';
  END IF;
  IF (SELECT count(*) FROM public.game_players WHERE game_id=p_game_id) >= g.max_players THEN
    RAISE EXCEPTION 'This tournament is full';
  END IF;
  INSERT INTO public.game_players(game_id,user_id) VALUES(p_game_id,auth.uid()) RETURNING * INTO player;
  RETURN player;
END $$;

CREATE OR REPLACE FUNCTION public.start_remote_game(p_game_id uuid)
RETURNS public.games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.games; BEGIN
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR g.host_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the tournament host can start this match';
  END IF;
  IF g.status = 'active' THEN RETURN g; END IF;
  IF g.status NOT IN ('scheduled','open','full') THEN RAISE EXCEPTION 'This match cannot be started'; END IF;
  IF now() < g.start_datetime THEN RAISE EXCEPTION 'Wait until the scheduled start time'; END IF;
  IF (SELECT count(DISTINCT user_id) FROM public.game_connections WHERE game_id=p_game_id AND last_seen > now()-interval '25 seconds') < 2 THEN
    RAISE EXCEPTION 'At least two participants must be connected';
  END IF;
  INSERT INTO public.game_questions(game_id,question_id,question_order,question_text,options,correct_option_index)
  SELECT p_game_id,id,row_number() OVER (ORDER BY random())::integer-1,question_text,options,correct_option_index
  FROM (SELECT * FROM public.questions ORDER BY random() LIMIT 10) q;
  IF NOT FOUND THEN RAISE EXCEPTION 'The shared question bank is empty'; END IF;
  UPDATE public.games SET status='active',started_at=clock_timestamp()+interval '5 seconds' WHERE id=p_game_id RETURNING * INTO g;
  UPDATE public.game_players SET status='playing' WHERE game_id=p_game_id;
  RETURN g;
END $$;

-- Receipt time is authoritative; a browser cannot claim a faster answer.
-- The membership lock and unique answer constraint make retries idempotent.
CREATE OR REPLACE FUNCTION public.submit_player_answer(
 p_game_id uuid,p_question_id uuid,p_selected_option integer,p_response_time_ms integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.games; q public.game_questions; a public.answers; elapsed integer;
  points integer; total integer; correct boolean; received timestamptz := clock_timestamp(); BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to answer'; END IF;
  PERFORM 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;
  SELECT * INTO a FROM public.answers WHERE game_id=p_game_id AND question_id=p_question_id AND user_id=auth.uid();
  IF FOUND THEN
    SELECT current_score INTO total FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid();
    RETURN jsonb_build_object('is_correct',a.is_correct,'current_total_score',total,'points_earned',
      CASE WHEN a.is_correct THEN 100+greatest(0,375-a.response_time_ms/40) ELSE 0 END);
  END IF;
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  SELECT * INTO q FROM public.game_questions WHERE game_id=p_game_id AND question_id=p_question_id;
  IF NOT FOUND OR g.status <> 'active' OR g.started_at IS NULL THEN RAISE EXCEPTION 'No active question'; END IF;
  elapsed := floor(extract(epoch FROM (received-g.started_at))*1000)::integer - q.question_order*(g.question_seconds+g.reveal_seconds)*1000;
  IF elapsed < 0 OR elapsed >= g.question_seconds*1000 THEN RAISE EXCEPTION 'The answer window has closed or has not started'; END IF;
  IF p_selected_option < 0 OR p_selected_option >= jsonb_array_length(q.options) THEN RAISE EXCEPTION 'Invalid option'; END IF;
  correct := p_selected_option = q.correct_option_index;
  points := CASE WHEN correct THEN 100+greatest(0,375-elapsed/40) ELSE 0 END;
  INSERT INTO public.answers(game_id,question_id,user_id,selected_option,is_correct,response_time_ms)
  VALUES(p_game_id,p_question_id,auth.uid(),p_selected_option,correct,elapsed);
  UPDATE public.game_players SET current_score=current_score+points WHERE game_id=p_game_id AND user_id=auth.uid() RETURNING current_score INTO total;
  RETURN jsonb_build_object('is_correct',correct,'points_earned',points,'current_total_score',total);
END $$;

CREATE OR REPLACE FUNCTION public.remote_room_state(p_game_id uuid,p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.games; n integer; idx integer; current_question jsonb; players jsonb; own_answer jsonb;
  server_now timestamptz := clock_timestamp(); BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Join this tournament to enter the lobby';
  END IF;
  INSERT INTO public.game_connections(game_id,user_id,client_id,last_seen) VALUES(p_game_id,auth.uid(),p_client_id,server_now)
  ON CONFLICT(game_id,user_id,client_id) DO UPDATE SET last_seen=excluded.last_seen;
  SELECT * INTO g FROM public.games WHERE id=p_game_id;
  SELECT count(*) INTO n FROM public.game_questions WHERE game_id=p_game_id;
  IF g.status='active' AND g.started_at IS NOT NULL AND server_now >= g.started_at + make_interval(secs => n*(g.question_seconds+g.reveal_seconds)) THEN
    -- Only the first caller finalizes. Concurrent callers wait and then see the committed results.
    SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
    IF g.status='active' THEN
      INSERT INTO public.results(game_id,user_id,total_score,total_accuracy,rank,xp_earned)
      SELECT p_game_id,p.user_id,p.current_score,
        round(100.0*count(a.id) FILTER (WHERE a.is_correct)/greatest(n,1),2),
        dense_rank() OVER (ORDER BY p.current_score DESC,count(a.id) FILTER (WHERE a.is_correct) DESC,
          coalesce(sum(a.response_time_ms),0)+(n-count(a.id))*g.question_seconds*1000)::integer, p.current_score
      FROM public.game_players p LEFT JOIN public.answers a ON a.game_id=p.game_id AND a.user_id=p.user_id
      WHERE p.game_id=p_game_id GROUP BY p.user_id,p.current_score
      ON CONFLICT(game_id,user_id) DO NOTHING;
      UPDATE public.games SET status='completed' WHERE id=p_game_id RETURNING * INTO g;
      UPDATE public.game_players SET status='completed' WHERE game_id=p_game_id;
    END IF;
  END IF;
  IF g.status='active' AND server_now>=g.started_at THEN
    idx := floor(extract(epoch FROM (server_now-g.started_at))/(g.question_seconds+g.reveal_seconds))::integer;
    SELECT jsonb_build_object('id',question_id,'question_text',question_text,'options',options,'question_order',question_order,
      'opens_at',g.started_at+make_interval(secs => idx*(g.question_seconds+g.reveal_seconds)),
      'closes_at',g.started_at+make_interval(secs => idx*(g.question_seconds+g.reveal_seconds)+g.question_seconds))
    INTO current_question FROM public.game_questions WHERE game_id=p_game_id AND question_order=idx;
    SELECT jsonb_build_object('selected_option',a.selected_option,'is_correct',a.is_correct) INTO own_answer
    FROM public.answers a JOIN public.game_questions q ON q.game_id=a.game_id AND q.question_id=a.question_id
    WHERE a.game_id=p_game_id AND a.user_id=auth.uid() AND q.question_order=idx;
  END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.rank NULLS LAST,t.current_score DESC,t.joined_at),'[]'::jsonb) INTO players FROM (
    SELECT p.user_id,pr.full_name,pr.department,p.current_score,p.joined_at,
      EXISTS(SELECT 1 FROM public.game_connections c WHERE c.game_id=p_game_id AND c.user_id=p.user_id AND c.last_seen>server_now-interval '25 seconds') AS connected,
      r.total_accuracy,r.rank
    FROM public.game_players p JOIN public.profiles pr ON pr.user_id=p.user_id
    LEFT JOIN public.results r ON r.game_id=p.game_id AND r.user_id=p.user_id WHERE p.game_id=p_game_id
  ) t;
  RETURN jsonb_build_object('game',row_to_json(g),'server_now',server_now,'question_count',n,
    'question',current_question,'answer',own_answer,'players',players);
END $$;

CREATE OR REPLACE FUNCTION public.leave_remote_room(p_game_id uuid,p_client_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.game_connections WHERE game_id=p_game_id AND client_id=p_client_id AND user_id=auth.uid();
$$;

REVOKE ALL ON FUNCTION public.create_remote_game(text,text,text,timestamptz,timestamptz,integer,text),
 public.join_remote_game(uuid),public.start_remote_game(uuid),public.remote_room_state(uuid,uuid),
 public.leave_remote_room(uuid,uuid),public.submit_player_answer(uuid,uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_remote_game(text,text,text,timestamptz,timestamptz,integer,text),
 public.join_remote_game(uuid),public.start_remote_game(uuid),public.remote_room_state(uuid,uuid),
 public.leave_remote_room(uuid,uuid),public.submit_player_answer(uuid,uuid,integer,integer) TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='game_players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
  END IF;
END $$;
COMMIT;
