BEGIN;
CREATE TABLE proctor_sessions(game_id uuid REFERENCES games ON DELETE CASCADE,user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,consented_at timestamptz NOT NULL DEFAULT now(),last_seen timestamptz NOT NULL DEFAULT now(),ready boolean NOT NULL DEFAULT false,camera text,screen text,PRIMARY KEY(game_id,user_id));
CREATE TABLE proctor_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),game_id uuid REFERENCES games ON DELETE CASCADE,user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,kind text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),reviewed_by uuid REFERENCES profiles(user_id),reviewed_at timestamptz,note text);
CREATE INDEX proctor_events_lookup ON proctor_events(game_id,created_at DESC);
ALTER TABLE proctor_sessions ENABLE ROW LEVEL SECURITY;ALTER TABLE proctor_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON proctor_sessions,proctor_events FROM PUBLIC,anon,authenticated;
CREATE FUNCTION schedule_contest(p_title text,p_mode text,p_target_org text,p_start timestamptz,p_cutoff timestamptz,p_max_players integer,p_description text,p_proctored boolean) RETURNS games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g games;BEGIN
 PERFORM app_require_member();g:=create_remote_game(p_title,p_mode,p_target_org,p_start,p_cutoff,p_max_players,p_description);
 UPDATE games SET is_proctored=coalesce(p_proctored,false),engine_version=2 WHERE id=g.id RETURNING * INTO g;RETURN g;
END $$;
CREATE FUNCTION proctor_require_participant(p_game uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM app_require_member(p_game);
 IF NOT EXISTS(SELECT 1 FROM games g JOIN game_players p ON p.game_id=g.id WHERE g.id=p_game AND g.is_proctored AND g.status IN('scheduled','open','full','active') AND p.user_id=auth.uid()) THEN RAISE EXCEPTION 'Join an open proctored tournament first';END IF;
END $$;
CREATE FUNCTION proctor_check(p_game uuid,p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM games WHERE id=p_game AND is_proctored) AND NOT EXISTS(SELECT 1 FROM proctor_sessions WHERE game_id=p_game AND user_id=p_user AND ready AND last_seen>clock_timestamp()-interval '15 seconds') THEN RAISE EXCEPTION 'Complete or restore fullscreen, camera and entire-screen sharing before playing'; END IF;
END $$;
CREATE FUNCTION proctor_heartbeat(p_game_id uuid,p_consent boolean,p_ready boolean,p_camera text,p_screen text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM proctor_require_participant(p_game_id);
 IF p_consent IS DISTINCT FROM true THEN RAISE EXCEPTION 'Consent is required for proctoring';END IF;
 IF length(coalesce(p_camera,''))>120000 OR length(coalesce(p_screen,''))>240000 OR (p_camera IS NOT NULL AND p_camera !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') OR (p_screen IS NOT NULL AND p_screen !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') THEN RAISE EXCEPTION 'Invalid preview';END IF;
 IF p_ready AND (p_camera IS NULL OR p_screen IS NULL) THEN RAISE EXCEPTION 'Both previews are required';END IF;
 INSERT INTO proctor_sessions(game_id,user_id,ready,camera,screen) VALUES(p_game_id,auth.uid(),coalesce(p_ready,false),p_camera,p_screen)
 ON CONFLICT(game_id,user_id) DO UPDATE SET last_seen=clock_timestamp(),ready=excluded.ready,camera=excluded.camera,screen=excluded.screen;
END $$;
CREATE FUNCTION proctor_event(p_game_id uuid,p_kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM proctor_require_participant(p_game_id);
 IF p_kind NOT IN('tab_hidden','focus_lost','fullscreen_exit','camera_stopped','screen_stopped','face_missing','multiple_faces','gaze_away','monitor_error') THEN RAISE EXCEPTION 'Invalid event';END IF;
 IF p_kind IN('tab_hidden','focus_lost','fullscreen_exit','camera_stopped','screen_stopped','monitor_error') THEN UPDATE proctor_sessions SET ready=false WHERE game_id=p_game_id AND user_id=auth.uid();END IF;
 IF NOT EXISTS(SELECT 1 FROM proctor_events WHERE game_id=p_game_id AND user_id=auth.uid() AND kind=p_kind AND created_at>clock_timestamp()-interval '10 seconds') THEN INSERT INTO proctor_events(game_id,user_id,kind) VALUES(p_game_id,auth.uid(),p_kind);END IF;
END $$;
CREATE FUNCTION proctor_stop(p_game_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DELETE FROM proctor_sessions WHERE game_id=p_game_id AND user_id=auth.uid(); $$;
CREATE FUNCTION proctor_require_reviewer(p_game uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM app_require_member(p_game);
 IF NOT app_is_admin() AND NOT EXISTS(SELECT 1 FROM games WHERE id=p_game AND host_id=auth.uid()) THEN RAISE EXCEPTION 'Only the host or administrator can review proctoring';END IF;
END $$;
CREATE FUNCTION proctor_dashboard(p_game_id uuid,p_page integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE participants jsonb;events jsonb;BEGIN
 PERFORM proctor_require_reviewer(p_game_id);
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO participants FROM(SELECT p.user_id,pr.full_name,s.last_seen,coalesce(s.ready AND s.last_seen>clock_timestamp()-interval '15 seconds',false) AS ready,
 CASE WHEN s.last_seen>clock_timestamp()-interval '30 seconds' THEN s.camera END AS camera,CASE WHEN s.last_seen>clock_timestamp()-interval '30 seconds' THEN s.screen END AS screen
 FROM game_players p JOIN profiles pr ON pr.user_id=p.user_id LEFT JOIN proctor_sessions s ON s.game_id=p.game_id AND s.user_id=p.user_id WHERE p.game_id=p_game_id ORDER BY p.joined_at LIMIT 12 OFFSET greatest(0,least(p_page,100))*12)t;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO events FROM(SELECT e.*,p.full_name FROM proctor_events e JOIN profiles p ON p.user_id=e.user_id WHERE e.game_id=p_game_id ORDER BY e.created_at DESC LIMIT 100)t;
 RETURN jsonb_build_object('participants',participants,'events',events,'total',(SELECT count(*) FROM game_players WHERE game_id=p_game_id));
END $$;
CREATE FUNCTION proctor_review(p_event_id uuid,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE g uuid;BEGIN
 SELECT game_id INTO g FROM proctor_events WHERE id=p_event_id;IF NOT FOUND THEN RAISE EXCEPTION 'Event not found';END IF;
 PERFORM proctor_require_reviewer(g);IF length(trim(coalesce(p_note,'')))<3 OR length(p_note)>1000 THEN RAISE EXCEPTION 'Add a review note (3–1,000 characters)';END IF;
 UPDATE proctor_events SET reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),note=p_note WHERE id=p_event_id;
END $$;
ALTER FUNCTION start_remote_game(uuid) RENAME TO contest_v2_start_internal;
CREATE FUNCTION start_remote_game(p_game_id uuid) RETURNS games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE g games;BEGIN
 PERFORM app_require_member(p_game_id);SELECT * INTO g FROM games WHERE id=p_game_id FOR UPDATE;
 IF g.host_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the tournament host can start this match';END IF;
 IF g.is_proctored AND g.status<>'active' THEN
  PERFORM proctor_check(p_game_id,auth.uid());
  IF EXISTS(SELECT 1 FROM game_players p WHERE p.game_id=p_game_id AND EXISTS(SELECT 1 FROM game_connections c WHERE c.game_id=p_game_id AND c.user_id=p.user_id AND c.last_seen>clock_timestamp()-interval '25 seconds') AND NOT EXISTS(SELECT 1 FROM proctor_sessions s WHERE s.game_id=p_game_id AND s.user_id=p.user_id AND s.ready AND s.last_seen>clock_timestamp()-interval '15 seconds')) THEN RAISE EXCEPTION 'Every connected participant must complete proctor setup before the host starts';END IF;
 END IF;RETURN contest_v2_start_internal(p_game_id);
END $$;
ALTER FUNCTION submit_player_answer(uuid,uuid,integer,integer) RENAME TO contest_v2_answer_internal;
CREATE FUNCTION submit_player_answer(p_game_id uuid,p_question_id uuid,p_selected_option integer,p_response_time_ms integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM app_require_member(p_game_id);PERFORM proctor_check(p_game_id,auth.uid());RETURN contest_v2_answer_internal(p_game_id,p_question_id,p_selected_option,p_response_time_ms);
END $$;
CREATE FUNCTION purge_proctor_data() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 DELETE FROM proctor_sessions WHERE last_seen<clock_timestamp()-interval '5 minutes' OR EXISTS(SELECT 1 FROM games WHERE games.id=game_id AND status IN('completed','cancelled'));
 DELETE FROM proctor_events WHERE created_at<clock_timestamp()-interval '30 days';
END $$;
REVOKE ALL ON FUNCTION proctor_require_participant(uuid),proctor_check(uuid,uuid),proctor_require_reviewer(uuid),contest_v2_start_internal(uuid),contest_v2_answer_internal(uuid,uuid,integer,integer),purge_proctor_data() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION schedule_contest(text,text,text,timestamptz,timestamptz,integer,text,boolean),proctor_heartbeat(uuid,boolean,boolean,text,text),proctor_event(uuid,text),proctor_stop(uuid),proctor_dashboard(uuid,integer),proctor_review(uuid,text),start_remote_game(uuid),submit_player_answer(uuid,uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION schedule_contest(text,text,text,timestamptz,timestamptz,integer,text,boolean),proctor_heartbeat(uuid,boolean,boolean,text,text),proctor_event(uuid,text),proctor_stop(uuid),proctor_dashboard(uuid,integer),proctor_review(uuid,text),start_remote_game(uuid),submit_player_answer(uuid,uuid,integer,integer) TO authenticated;
COMMIT;
