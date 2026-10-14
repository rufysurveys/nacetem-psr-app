-- Question bank filters for the admin Contest questions page.
-- p_question_filter: '' (all), 'chapter:<name>' or 'section:<wheel section>'.
-- p_question_status: 'all', 'active' (on the wheel), 'draft' (no wheel section yet,
-- so contests cannot select it) or 'archived'. The question total respects filters.
DROP FUNCTION IF EXISTS public.admin_dashboard(text,integer);

CREATE FUNCTION public.app_admin_question_matches(p_search text,p_filter text,p_status text) RETURNS SETOF public.questions
LANGUAGE sql STABLE SET search_path=public, pg_temp AS $$
  SELECT q.* FROM questions q
  WHERE concat_ws(' ',q.question_text,q.chapter,q.section_key,q.rule_ref) ILIKE '%'||coalesce(p_search,'')||'%'
    AND CASE split_part(coalesce(p_filter,''),':',1)
      WHEN 'chapter' THEN q.chapter = substr(p_filter,9)
      WHEN 'section' THEN q.section_key = substr(p_filter,9)
      ELSE true END
    AND CASE coalesce(p_status,'all')
      WHEN 'archived' THEN q.is_archived
      WHEN 'draft' THEN NOT q.is_archived AND nullif(trim(q.section_key),'') IS NULL
      WHEN 'active' THEN NOT q.is_archived AND nullif(trim(q.section_key),'') IS NOT NULL
      ELSE true END
$$;
CREATE FUNCTION public.admin_dashboard(p_search text DEFAULT '',p_question_page integer DEFAULT 0,
  p_question_filter text DEFAULT '',p_question_status text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE members jsonb; tournaments jsonb; bank jsonb; logs jsonb; filters jsonb; total integer; BEGIN
  PERFORM app_require_admin();
  IF coalesce(p_question_status,'all') NOT IN ('all','active','draft','archived') THEN RAISE EXCEPTION 'Unknown question status filter'; END IF;
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
  SELECT count(*) INTO total FROM app_admin_question_matches(p_search,p_question_filter,p_question_status);
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO bank FROM (
    SELECT * FROM app_admin_question_matches(p_search,p_question_filter,p_question_status)
    ORDER BY created_at DESC,id LIMIT 25 OFFSET greatest(0,p_question_page)*25
  ) t;
  SELECT jsonb_build_object(
    'chapters',coalesce((SELECT jsonb_agg(c ORDER BY c) FROM (SELECT DISTINCT chapter c FROM questions WHERE nullif(trim(chapter),'') IS NOT NULL) x),'[]'),
    'sections',coalesce((SELECT jsonb_agg(s ORDER BY s) FROM (SELECT DISTINCT section_key s FROM questions WHERE nullif(trim(section_key),'') IS NOT NULL) x),'[]')
  ) INTO filters;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO logs FROM (
    SELECT a.*,p.full_name AS actor_name FROM admin_audit a LEFT JOIN profiles p ON p.user_id=a.actor_id ORDER BY a.id DESC LIMIT 100
  ) t;
  RETURN jsonb_build_object('members',members,'games',tournaments,'questions',bank,'question_total',total,'question_filters',filters,'audit',logs);
END $$;

REVOKE ALL ON FUNCTION public.app_admin_question_matches(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_dashboard(text,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard(text,integer,text,text) TO authenticated;
