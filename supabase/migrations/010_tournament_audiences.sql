BEGIN;

ALTER TABLE public.games
  ADD COLUMN audience_type text NOT NULL DEFAULT 'all'
    CHECK (audience_type IN ('all', 'agency', 'department', 'person')),
  ADD COLUMN audience_value text,
  ADD COLUMN audience_agency text;

CREATE FUNCTION public.app_can_access_game(p_game_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.games g
    LEFT JOIN public.profiles target_profile ON target_profile.user_id = auth.uid()
    WHERE g.id = p_game_id
      AND (g.deleted_at IS NULL OR public.app_is_admin())
      AND public.app_is_active_user(auth.uid())
      AND (
        public.app_is_admin()
        OR g.host_id = auth.uid()
        OR g.audience_type = 'all'
        OR (g.audience_type = 'agency'
          AND lower(trim(coalesce(target_profile.agency, target_profile.ministry, ''))) = lower(trim(g.audience_value)))
        OR (g.audience_type = 'department'
          AND lower(trim(coalesce(target_profile.agency, target_profile.ministry, ''))) = lower(trim(g.audience_agency))
          AND lower(trim(coalesce(target_profile.department, ''))) = lower(trim(g.audience_value)))
        OR (g.audience_type = 'person'
          AND lower(target_profile.email) = lower(trim(g.audience_value)))
      )
  );
$$;

DROP POLICY IF EXISTS games_read ON public.games;
CREATE POLICY games_read ON public.games
  FOR SELECT TO authenticated
  USING (public.app_can_access_game(id));

ALTER FUNCTION public.join_remote_game(uuid) RENAME TO contest_scope_join_internal;
REVOKE ALL ON FUNCTION public.contest_scope_join_internal(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.join_remote_game(p_game_id uuid)
RETURNS public.game_players
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.app_require_member(p_game_id);
  IF NOT public.app_can_access_game(p_game_id) THEN
    RAISE EXCEPTION 'This tournament is restricted to its selected audience';
  END IF;
  RETURN public.contest_scope_join_internal(p_game_id);
END;
$$;

DROP FUNCTION IF EXISTS public.schedule_contest(text, text, text, timestamptz, timestamptz, integer, text, boolean);
CREATE FUNCTION public.schedule_contest(
  p_title text,
  p_mode text,
  p_target_org text,
  p_start timestamptz,
  p_cutoff timestamptz,
  p_max_players integer,
  p_description text,
  p_proctored boolean,
  p_audience_type text DEFAULT 'all',
  p_audience_value text DEFAULT NULL,
  p_audience_agency text DEFAULT NULL
)
RETURNS public.games
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  g public.games;
  member_agency text;
  member_department text;
  member_email text;
BEGIN
  PERFORM public.app_require_member();
  IF p_audience_type NOT IN ('all', 'agency', 'department', 'person') THEN
    RAISE EXCEPTION 'Choose a valid tournament audience';
  END IF;
  IF p_audience_type <> 'all' AND length(trim(coalesce(p_audience_value, ''))) = 0 THEN
    RAISE EXCEPTION 'Enter the tournament audience';
  END IF;
  IF p_audience_type = 'department' AND length(trim(coalesce(p_audience_agency, ''))) = 0 THEN
    RAISE EXCEPTION 'Enter the department organization';
  END IF;
  IF p_audience_type = 'person' AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.email) = lower(trim(p_audience_value))
      AND public.app_is_active_user(p.user_id)
  ) THEN
    RAISE EXCEPTION 'The selected person does not have an active account';
  END IF;

  IF NOT public.app_is_admin() AND p_audience_type <> 'all' THEN
    SELECT coalesce(p.agency, p.ministry), p.department, p.email
      INTO member_agency, member_department, member_email
    FROM public.profiles p WHERE p.user_id = auth.uid();
    IF p_audience_type = 'agency' AND lower(trim(p_audience_value)) <> lower(trim(member_agency)) THEN
      RAISE EXCEPTION 'Only administrators can schedule for another organization';
    ELSIF p_audience_type = 'department'
      AND (lower(trim(p_audience_value)) <> lower(trim(member_department))
        OR lower(trim(p_audience_agency)) <> lower(trim(member_agency))) THEN
      RAISE EXCEPTION 'Only administrators can schedule for another department';
    ELSIF p_audience_type = 'person' AND lower(trim(p_audience_value)) <> lower(trim(member_email)) THEN
      RAISE EXCEPTION 'Only administrators can schedule for another person';
    END IF;
  END IF;

  g := public.create_remote_game(
    p_title, p_mode, p_target_org, p_start, p_cutoff, p_max_players, p_description
  );
  UPDATE public.games
  SET is_proctored = coalesce(p_proctored, false),
      engine_version = 2,
      audience_type = p_audience_type,
      audience_value = nullif(trim(p_audience_value), ''),
      audience_agency = nullif(trim(p_audience_agency), '')
  WHERE id = g.id
  RETURNING * INTO g;
  RETURN g;
END;
$$;

REVOKE ALL ON FUNCTION public.app_can_access_game(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_access_game(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.join_remote_game(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_remote_game(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.schedule_contest(text, text, text, timestamptz, timestamptz, integer, text, boolean, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_contest(text, text, text, timestamptz, timestamptz, integer, text, boolean, text, text, text) TO authenticated;

COMMIT;