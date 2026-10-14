-- Searchable, filterable admin activity log with target context.
-- Categories: deletion, permission, access, restore, content.
-- p_actor filters by administrator; p_limit caps rows (up to 5000 for exports).
CREATE OR REPLACE FUNCTION public.app_audit_category(p_action text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_action IN ('member_delete','game_delete','game_cancel','question_archive') THEN 'deletion'
    WHEN p_action IN ('member_make_admin','member_make_member') THEN 'permission'
    WHEN p_action IN ('member_suspend','member_resume') THEN 'access'
    WHEN p_action IN ('member_restore','game_restore','question_restore') THEN 'restore'
    ELSE 'content' END
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_log(p_search text DEFAULT '',p_actor uuid DEFAULT NULL,
  p_category text DEFAULT '',p_limit integer DEFAULT 200) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE entries jsonb; actors jsonb; total integer; BEGIN
  PERFORM app_require_admin();
  IF coalesce(p_category,'') NOT IN ('','deletion','permission','access','restore','content') THEN RAISE EXCEPTION 'Unknown activity type filter'; END IF;
  WITH matches AS (
    SELECT a.id,a.action,app_audit_category(a.action) AS category,a.created_at,a.actor_id,ap.full_name AS actor_name,ap.email AS actor_email,a.target_id,
      split_part(a.action,'_',1) AS target_type,
      coalesce(tp.full_name,g.title,left(q.question_text,160)) AS target_label,
      coalesce(tp.email,g.target_org,nullif(concat_ws(' · ',q.chapter,q.section_key),'')) AS target_detail,
      count(*) OVER () AS match_total
    FROM admin_audit a
      LEFT JOIN profiles ap ON ap.user_id=a.actor_id
      LEFT JOIN profiles tp ON a.action LIKE 'member\_%' AND tp.user_id=a.target_id
      LEFT JOIN games g ON a.action LIKE 'game\_%' AND g.id=a.target_id
      LEFT JOIN questions q ON a.action LIKE 'question\_%' AND q.id=a.target_id
    WHERE (p_actor IS NULL OR a.actor_id=p_actor)
      AND (coalesce(p_category,'')='' OR app_audit_category(a.action)=p_category)
      AND concat_ws(' ',ap.full_name,ap.email,replace(a.action,'_',' '),a.target_id::text,tp.full_name,tp.email,g.title,q.question_text,q.chapter)
        ILIKE '%'||coalesce(p_search,'')||'%'
    ORDER BY a.id DESC LIMIT least(greatest(coalesce(p_limit,200),1),5000)
  )
  SELECT coalesce(jsonb_agg(to_jsonb(m) - 'match_total' ORDER BY m.id DESC),'[]'),coalesce(max(m.match_total),0) INTO entries,total FROM matches m;
  SELECT coalesce(jsonb_agg(jsonb_build_object('actor_id',x.actor_id,'actor_name',coalesce(x.full_name,'Administrator')) ORDER BY x.full_name),'[]') INTO actors
  FROM (SELECT DISTINCT a.actor_id,p.full_name FROM admin_audit a LEFT JOIN profiles p ON p.user_id=a.actor_id) x;
  RETURN jsonb_build_object('entries',entries,'actors',actors,'total',total);
END $$;

REVOKE ALL ON FUNCTION public.app_audit_category(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_audit_log(text,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_log(text,uuid,text,integer) TO authenticated;
