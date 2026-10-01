BEGIN;

ALTER TABLE public.games
  ADD COLUMN group_competition boolean NOT NULL DEFAULT false,
  ADD COLUMN group_category_set text,
  ADD COLUMN group_labels text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.contest_group_members (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  group_name text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);
CREATE INDEX contest_group_members_lookup ON public.contest_group_members(game_id, group_name);
ALTER TABLE public.contest_group_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contest_group_members FROM PUBLIC, anon, authenticated;

CREATE TABLE public.app_user_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX app_user_activity_recent ON public.app_user_activity(user_id, created_at DESC);
ALTER TABLE public.app_user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_activity_read_own ON public.app_user_activity
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.app_user_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_user_activity TO authenticated;

CREATE FUNCTION public.app_log_user_activity(p_type text,p_summary text,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.app_require_member();
  IF p_type NOT IN ('login','profile_updated','password_changed','practice_completed','page_view')
    OR length(trim(coalesce(p_summary,'')))=0 OR length(p_summary)>240 THEN
    RAISE EXCEPTION 'Invalid activity event';
  END IF;
  INSERT INTO public.app_user_activity(user_id,activity_type,summary,metadata)
  VALUES(auth.uid(),p_type,trim(p_summary),coalesce(p_metadata,'{}'::jsonb));
END $$;

CREATE FUNCTION public.app_record_activity_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE member_name text; game_title text; BEGIN
  IF TG_TABLE_NAME='game_players' AND TG_OP='INSERT' THEN
    SELECT title INTO game_title FROM public.games WHERE id=NEW.game_id;
    INSERT INTO public.app_user_activity(user_id,activity_type,summary,metadata)
    VALUES(NEW.user_id,'tournament_joined','Joined tournament: '||coalesce(game_title,'Tournament'),jsonb_build_object('game_id',NEW.game_id));
  ELSIF TG_TABLE_NAME='games' AND TG_OP='INSERT' AND NEW.host_id IS NOT NULL THEN
    INSERT INTO public.app_user_activity(user_id,activity_type,summary,metadata)
    VALUES(NEW.host_id,'tournament_scheduled','Scheduled tournament: '||NEW.title,jsonb_build_object('game_id',NEW.id,'is_proctored',NEW.is_proctored));
  ELSIF TG_TABLE_NAME='answers' AND TG_OP='INSERT' THEN
    INSERT INTO public.app_user_activity(user_id,activity_type,summary,metadata)
    VALUES(NEW.user_id,'contest_answered',CASE WHEN NEW.is_correct THEN 'Answered a contest question correctly' ELSE 'Submitted a contest answer' END,
      jsonb_build_object('game_id',NEW.game_id,'question_id',NEW.question_id,'is_correct',NEW.is_correct,'points_earned',NEW.points_earned));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER app_activity_game_scheduled AFTER INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.app_record_activity_trigger();
CREATE TRIGGER app_activity_game_joined AFTER INSERT ON public.game_players
  FOR EACH ROW EXECUTE FUNCTION public.app_record_activity_trigger();
CREATE TRIGGER app_activity_contest_answered AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.app_record_activity_trigger();

CREATE FUNCTION public.app_assign_contest_group(p_game uuid,p_user uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE labels text[]; selected_group text; BEGIN
  SELECT group_labels INTO labels FROM public.games WHERE id=p_game AND group_competition;
  IF labels IS NULL OR cardinality(labels)=0 THEN RETURN NULL; END IF;
  SELECT label INTO selected_group
  FROM unnest(labels) WITH ORDINALITY AS choices(label,position)
  LEFT JOIN LATERAL (
    SELECT count(*) AS members FROM public.contest_group_members m
    WHERE m.game_id=p_game AND m.group_name=choices.label
  ) counts ON true
  ORDER BY counts.members,choices.position LIMIT 1;
  INSERT INTO public.contest_group_members(game_id,user_id,group_name)
  VALUES(p_game,p_user,selected_group) ON CONFLICT(game_id,user_id) DO NOTHING;
  SELECT group_name INTO selected_group FROM public.contest_group_members WHERE game_id=p_game AND user_id=p_user;
  RETURN selected_group;
END $$;

ALTER FUNCTION public.join_remote_game(uuid) RENAME TO contest_group_join_internal;
REVOKE ALL ON FUNCTION public.contest_group_join_internal(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.join_remote_game(p_game_id uuid)
RETURNS public.game_players LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE player public.game_players; BEGIN
  PERFORM public.app_require_member(p_game_id);
  IF NOT public.app_can_access_game(p_game_id) THEN RAISE EXCEPTION 'This tournament is restricted to its selected audience'; END IF;
  player:=public.contest_group_join_internal(p_game_id);
  PERFORM public.app_assign_contest_group(p_game_id,auth.uid());
  RETURN player;
END $$;

DROP FUNCTION public.schedule_contest(text,text,text,timestamptz,timestamptz,integer,text,boolean,text,text,text);
CREATE FUNCTION public.schedule_contest(
  p_title text,p_mode text,p_target_org text,p_start timestamptz,p_cutoff timestamptz,
  p_max_players integer,p_description text,p_proctored boolean,
  p_audience_type text DEFAULT 'all',p_audience_value text DEFAULT NULL,p_audience_agency text DEFAULT NULL,
  p_group_competition boolean DEFAULT false,p_group_category_set text DEFAULT NULL,p_group_labels text[] DEFAULT NULL
) RETURNS public.games LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.games; member_agency text; member_department text; member_email text; labels text[]; BEGIN
  PERFORM public.app_require_member();
  IF p_audience_type NOT IN ('all','agency','department','person') THEN RAISE EXCEPTION 'Choose a valid tournament audience'; END IF;
  IF p_audience_type<>'all' AND length(trim(coalesce(p_audience_value,'')))=0 THEN RAISE EXCEPTION 'Enter the tournament audience'; END IF;
  IF p_audience_type='department' AND length(trim(coalesce(p_audience_agency,'')))=0 THEN RAISE EXCEPTION 'Enter the department organization'; END IF;
  IF p_audience_type='person' AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE lower(p.email)=lower(trim(p_audience_value)) AND public.app_is_active_user(p.user_id)) THEN
    RAISE EXCEPTION 'The selected person does not have an active account';
  END IF;
  IF NOT public.app_is_admin() AND p_audience_type<>'all' THEN
    SELECT coalesce(p.agency,p.ministry),p.department,p.email INTO member_agency,member_department,member_email FROM public.profiles p WHERE p.user_id=auth.uid();
    IF p_audience_type='agency' AND lower(trim(p_audience_value))<>lower(trim(member_agency)) THEN RAISE EXCEPTION 'Only administrators can schedule for another organization';
    ELSIF p_audience_type='department' AND (lower(trim(p_audience_value))<>lower(trim(member_department)) OR lower(trim(p_audience_agency))<>lower(trim(member_agency))) THEN RAISE EXCEPTION 'Only administrators can schedule for another department';
    ELSIF p_audience_type='person' AND lower(trim(p_audience_value))<>lower(trim(member_email)) THEN RAISE EXCEPTION 'Only administrators can schedule for another person'; END IF;
  END IF;
  IF p_group_competition THEN
    SELECT array_agg(trim(label) ORDER BY position) INTO labels FROM unnest(coalesce(p_group_labels,'{}'::text[])) WITH ORDINALITY AS supplied(label,position) WHERE length(trim(label))>0;
    IF coalesce(cardinality(labels),0) NOT BETWEEN 2 AND 8 OR (SELECT count(DISTINCT lower(label)) FROM unnest(labels) AS provided(label))<>cardinality(labels) THEN
      RAISE EXCEPTION 'Group tournaments need 2-8 unique group labels';
    END IF;
    IF length(trim(coalesce(p_group_category_set,'')))=0 THEN RAISE EXCEPTION 'Choose a category set name'; END IF;
  ELSE
    labels:='{}'::text[];
  END IF;
  g:=public.create_remote_game(p_title,p_mode,p_target_org,p_start,p_cutoff,p_max_players,p_description);
  UPDATE public.games SET is_proctored=coalesce(p_proctored,false),engine_version=3,
    audience_type=p_audience_type,audience_value=nullif(trim(p_audience_value),''),audience_agency=nullif(trim(p_audience_agency),''),
    group_competition=coalesce(p_group_competition,false),group_category_set=CASE WHEN p_group_competition THEN trim(p_group_category_set) END,group_labels=labels
  WHERE id=g.id RETURNING * INTO g;
  IF p_group_competition THEN PERFORM public.app_assign_contest_group(g.id,auth.uid()); END IF;
  RETURN g;
END $$;

CREATE FUNCTION public.contest_group_state(p_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE output jsonb; BEGIN
  PERFORM public.app_require_member(p_game_id);
  IF NOT public.app_can_access_game(p_game_id) OR NOT EXISTS(SELECT 1 FROM public.game_players WHERE game_id=p_game_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Join this tournament to view its group standings';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(standing) ORDER BY standing.group_rank,standing.group_name),'[]'::jsonb) INTO output
  FROM (
    SELECT group_name,dense_rank() OVER(ORDER BY sum(p.current_score) DESC,coalesce(sum(a.correct_count),0) DESC,group_name) AS group_rank,
      sum(p.current_score)::integer AS total_score,coalesce(sum(a.correct_count),0)::integer AS correct_answers,
      jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',profile.full_name,'avatar_url',profile.avatar_url,'score',p.current_score,'individual_rank',r.rank) ORDER BY r.rank NULLS LAST,p.current_score DESC) AS members,
      (g.status='completed' AND dense_rank() OVER(ORDER BY sum(p.current_score) DESC,coalesce(sum(a.correct_count),0) DESC,group_name)=1) AS winner
    FROM public.contest_group_members gm JOIN public.game_players p ON p.game_id=gm.game_id AND p.user_id=gm.user_id
    JOIN public.profiles profile ON profile.user_id=p.user_id JOIN public.games g ON g.id=gm.game_id
    LEFT JOIN public.results r ON r.game_id=p.game_id AND r.user_id=p.user_id
    LEFT JOIN LATERAL (SELECT count(*) FILTER(WHERE ans.is_correct)::integer AS correct_count FROM public.answers ans WHERE ans.game_id=p.game_id AND ans.user_id=p.user_id) a ON true
    WHERE gm.game_id=p_game_id GROUP BY group_name,g.status
  ) standing;
  RETURN coalesce(output,'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.app_assign_contest_group(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.contest_group_state(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contest_group_state(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.join_remote_game(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_remote_game(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.schedule_contest(text,text,text,timestamptz,timestamptz,integer,text,boolean,text,text,text,boolean,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.schedule_contest(text,text,text,timestamptz,timestamptz,integer,text,boolean,text,text,text,boolean,text,text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.app_log_user_activity(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.app_log_user_activity(text,text,jsonb) TO authenticated;

COMMIT;