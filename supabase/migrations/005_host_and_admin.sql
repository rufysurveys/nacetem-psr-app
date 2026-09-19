BEGIN;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Roles and account restrictions are separate from editable member profiles.
CREATE TABLE public.app_access (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  suspended boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);
CREATE TABLE public.admin_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_access,public.admin_audit FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.app_is_active_user(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, pg_temp AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM profiles WHERE user_id=p_user_id)
    AND NOT EXISTS(SELECT 1 FROM app_access WHERE user_id=p_user_id AND (suspended OR deleted_at IS NOT NULL));
$$;
CREATE FUNCTION public.app_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, pg_temp AS $$
  SELECT app_is_active_user(auth.uid()) AND EXISTS(SELECT 1 FROM app_access WHERE user_id=auth.uid() AND role='admin');
$$;
CREATE FUNCTION public.app_get_access() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public, pg_temp AS $$
  SELECT jsonb_build_object('active',app_is_active_user(auth.uid()),'is_admin',app_is_admin());
$$;
CREATE FUNCTION public.app_require_member(p_game_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN
  IF NOT app_is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Sign in with an active member account. Contact the administrator if your access was removed.'; END IF;
  IF p_game_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games WHERE id=p_game_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This tournament was removed or does not exist';
  END IF;
END $$;
CREATE FUNCTION public.app_require_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN IF NOT app_is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF; END $$;

-- Wrap existing tested game operations so suspended/deleted members cannot
-- continue using old sessions or call contest RPCs directly.
ALTER FUNCTION public.create_remote_game(text,text,text,timestamptz,timestamptz,integer,text) RENAME TO contest_create_internal;
ALTER FUNCTION public.join_remote_game(uuid) RENAME TO contest_join_internal;
ALTER FUNCTION public.remote_room_state(uuid,uuid) RENAME TO contest_state_internal;
ALTER FUNCTION public.submit_player_answer(uuid,uuid,integer,integer) RENAME TO contest_answer_internal;
REVOKE ALL ON FUNCTION public.contest_create_internal(text,text,text,timestamptz,timestamptz,integer,text),
  public.contest_join_internal(uuid),public.contest_state_internal(uuid,uuid),
  public.contest_answer_internal(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.create_remote_game(p_title text,p_mode text,p_target_org text,p_start timestamptz,p_cutoff timestamptz,p_max_players integer,p_description text DEFAULT '')
RETURNS public.games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN
  PERFORM app_require_member();
  IF NOT EXISTS(SELECT 1 FROM questions WHERE NOT is_archived) THEN RAISE EXCEPTION 'The active question bank is empty'; END IF;
  RETURN contest_create_internal(p_title,p_mode,p_target_org,p_start,p_cutoff,p_max_players,p_description);
END $$;
CREATE FUNCTION public.join_remote_game(p_game_id uuid) RETURNS public.game_players
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN PERFORM app_require_member(p_game_id); RETURN contest_join_internal(p_game_id); END $$;
CREATE FUNCTION public.remote_room_state(p_game_id uuid,p_client_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN PERFORM app_require_member(p_game_id); RETURN contest_state_internal(p_game_id,p_client_id); END $$;
CREATE FUNCTION public.submit_player_answer(p_game_id uuid,p_question_id uuid,p_selected_option integer,p_response_time_ms integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN PERFORM app_require_member(p_game_id); RETURN contest_answer_internal(p_game_id,p_question_id,p_selected_option,p_response_time_ms); END $$;

CREATE OR REPLACE FUNCTION public.start_remote_game(p_game_id uuid)
RETURNS public.games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE g public.games; BEGIN
  PERFORM app_require_member(p_game_id);
  SELECT * INTO g FROM games WHERE id=p_game_id FOR UPDATE;
  IF g.host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the tournament host can start this match'; END IF;
  IF g.status='active' THEN RETURN g; END IF;
  IF g.status NOT IN ('scheduled','open','full') THEN RAISE EXCEPTION 'This match cannot be started'; END IF;
  IF NOT EXISTS(SELECT 1 FROM game_connections WHERE game_id=p_game_id AND user_id=auth.uid() AND last_seen>now()-interval '25 seconds')
    OR NOT EXISTS(SELECT 1 FROM game_connections WHERE game_id=p_game_id AND user_id<>auth.uid() AND last_seen>now()-interval '25 seconds' AND app_is_active_user(user_id)) THEN
    RAISE EXCEPTION 'The host and at least one other participant must be connected';
  END IF;
  INSERT INTO game_players(game_id,user_id) VALUES(p_game_id,g.host_id) ON CONFLICT(game_id,user_id) DO NOTHING;
  INSERT INTO game_questions(game_id,question_id,question_order,question_text,options,correct_option_index)
  SELECT p_game_id,id,row_number() OVER(ORDER BY random())::integer-1,question_text,options,correct_option_index
  FROM (SELECT * FROM questions WHERE NOT is_archived ORDER BY random() LIMIT 10) q;
  IF NOT FOUND THEN RAISE EXCEPTION 'The active question bank is empty'; END IF;
  UPDATE games SET status='active',started_at=clock_timestamp()+interval '5 seconds' WHERE id=p_game_id RETURNING * INTO g;
  UPDATE game_players SET status='playing' WHERE game_id=p_game_id;
  RETURN g;
END $$;

DROP POLICY games_read ON public.games;
CREATE POLICY games_read ON public.games FOR SELECT TO authenticated USING(app_is_active_user(auth.uid()) AND (deleted_at IS NULL OR app_is_admin()));
DROP POLICY players_read ON public.game_players;
CREATE POLICY players_read ON public.game_players FOR SELECT TO authenticated USING(app_is_active_user(auth.uid()));
DROP POLICY results_read ON public.results;
CREATE POLICY results_read ON public.results FOR SELECT TO authenticated USING(app_is_active_user(auth.uid()));
DROP POLICY profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING(app_is_active_user(auth.uid()));
DROP POLICY profile_update ON public.profiles;
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING(user_id=auth.uid() AND app_is_active_user(auth.uid())) WITH CHECK(user_id=auth.uid() AND app_is_active_user(auth.uid()));

CREATE FUNCTION public.admin_dashboard(p_search text DEFAULT '',p_question_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE members jsonb; tournaments jsonb; bank jsonb; logs jsonb; total integer; BEGIN
  PERFORM app_require_admin();
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO members FROM (
    SELECT p.user_id,p.full_name,p.email,p.agency,p.department,coalesce(a.role,'member') AS role,
      coalesce(a.suspended,false) AS suspended,a.deleted_at
    FROM profiles p LEFT JOIN app_access a USING(user_id)
    WHERE concat_ws(' ',p.full_name,p.email,p.agency,p.department) ILIKE '%'||p_search||'%' ORDER BY p.created_at DESC LIMIT 500
  ) t;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO tournaments FROM (
    SELECT g.*,p.full_name AS host_name,(SELECT count(*) FROM game_players WHERE game_id=g.id) AS participant_count
    FROM games g LEFT JOIN profiles p ON p.user_id=g.host_id
    WHERE concat_ws(' ',g.title,g.target_org) ILIKE '%'||p_search||'%' ORDER BY g.created_at DESC LIMIT 500
  ) t;
  SELECT count(*) INTO total FROM questions WHERE concat_ws(' ',question_text,chapter) ILIKE '%'||p_search||'%';
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO bank FROM (
    SELECT * FROM questions WHERE concat_ws(' ',question_text,chapter) ILIKE '%'||p_search||'%'
    ORDER BY created_at DESC,id LIMIT 25 OFFSET greatest(0,p_question_page)*25
  ) t;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO logs FROM (
    SELECT a.*,p.full_name AS actor_name FROM admin_audit a LEFT JOIN profiles p ON p.user_id=a.actor_id ORDER BY a.id DESC LIMIT 100
  ) t;
  RETURN jsonb_build_object('members',members,'games',tournaments,'questions',bank,'question_total',total,'audit',logs);
END $$;

CREATE FUNCTION public.admin_member_action(p_user_id uuid,p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN
  PERFORM app_require_admin();
  -- Serialize role changes and re-check permission after waiting for the lock.
  PERFORM pg_advisory_xact_lock(20260919);
  PERFORM app_require_admin();
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot remove, suspend or change your own administrator access'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'Member not found'; END IF;
  INSERT INTO app_access(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  CASE p_action
    WHEN 'suspend' THEN UPDATE app_access SET suspended=true WHERE user_id=p_user_id;
    WHEN 'resume' THEN UPDATE app_access SET suspended=false WHERE user_id=p_user_id;
    WHEN 'delete' THEN UPDATE app_access SET deleted_at=now() WHERE user_id=p_user_id;
    WHEN 'restore' THEN UPDATE app_access SET deleted_at=NULL,suspended=false WHERE user_id=p_user_id;
    WHEN 'make_admin' THEN UPDATE app_access SET role='admin' WHERE user_id=p_user_id;
    WHEN 'make_member' THEN UPDATE app_access SET role='member' WHERE user_id=p_user_id;
    ELSE RAISE EXCEPTION 'Unknown member action';
  END CASE;
  IF p_action IN ('suspend','delete') THEN DELETE FROM game_connections WHERE user_id=p_user_id; END IF;
  INSERT INTO admin_audit(actor_id,action,target_id) VALUES(auth.uid(),'member_'||p_action,p_user_id);
END $$;

CREATE FUNCTION public.admin_game_action(p_game_id uuid,p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN
  PERFORM app_require_admin();
  PERFORM 1 FROM games WHERE id=p_game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  CASE p_action
    WHEN 'delete' THEN UPDATE games SET deleted_at=now() WHERE id=p_game_id;
    WHEN 'restore' THEN UPDATE games SET deleted_at=NULL WHERE id=p_game_id;
    WHEN 'cancel' THEN
      IF EXISTS(SELECT 1 FROM games WHERE id=p_game_id AND status IN ('completed','cancelled')) THEN RAISE EXCEPTION 'This tournament has already ended'; END IF;
      UPDATE games SET status='cancelled' WHERE id=p_game_id;
    ELSE RAISE EXCEPTION 'Unknown tournament action';
  END CASE;
  INSERT INTO admin_audit(actor_id,action,target_id) VALUES(auth.uid(),'game_'||p_action,p_game_id);
END $$;

CREATE FUNCTION public.admin_save_question(p_id uuid,p_text text,p_chapter text,p_options jsonb,p_correct integer,p_explanation text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE qid uuid := coalesce(p_id,gen_random_uuid()); BEGIN
  PERFORM app_require_admin();
  IF p_text IS NULL OR length(trim(p_text))=0 OR p_chapter IS NULL OR length(trim(p_chapter))=0
    OR p_options IS NULL OR jsonb_typeof(p_options)<>'array' OR jsonb_array_length(p_options)<>4
    OR p_correct IS NULL OR p_correct NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Enter a question, chapter, four options and a correct answer'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_options) v WHERE jsonb_typeof(v)<>'string' OR length(trim(v#>>'{}'))=0) THEN RAISE EXCEPTION 'All four options must contain text'; END IF;
  IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM questions WHERE id=p_id) THEN RAISE EXCEPTION 'Question not found'; END IF;
  INSERT INTO questions(id,category,chapter,question_text,options,correct_option_index,explanation)
  VALUES(qid,'PSR',p_chapter,p_text,p_options,p_correct,p_explanation)
  ON CONFLICT(id) DO UPDATE SET chapter=excluded.chapter,question_text=excluded.question_text,
    options=excluded.options,correct_option_index=excluded.correct_option_index,explanation=excluded.explanation;
  INSERT INTO admin_audit(actor_id,action,target_id) VALUES(auth.uid(),CASE WHEN p_id IS NULL THEN 'question_create' ELSE 'question_update' END,qid);
  RETURN qid;
END $$;
CREATE FUNCTION public.admin_archive_question(p_id uuid,p_archived boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
BEGIN
  PERFORM app_require_admin();
  UPDATE questions SET is_archived=p_archived WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Question not found'; END IF;
  INSERT INTO admin_audit(actor_id,action,target_id) VALUES(auth.uid(),CASE WHEN p_archived THEN 'question_archive' ELSE 'question_restore' END,p_id);
END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.proname LIKE 'app\_%' ESCAPE '\' OR p.proname LIKE 'admin\_%' ESCAPE '\'
      OR p.proname IN ('create_remote_game','join_remote_game','remote_room_state','submit_player_answer','start_remote_game'))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
COMMIT;
