-- Bulk member actions for the admin Members view.
-- Applies one member action to many members. Your own account and members the
-- action does not apply to (for example already suspended) are skipped.
CREATE OR REPLACE FUNCTION public.admin_bulk_member_action(p_user_ids uuid[], p_action text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE target uuid; changed integer := 0; BEGIN
  PERFORM app_require_admin();
  IF p_action NOT IN ('suspend','resume') THEN RAISE EXCEPTION 'Unsupported bulk member action'; END IF;
  IF coalesce(array_length(p_user_ids,1),0) > 500 THEN RAISE EXCEPTION 'Select at most 500 members at a time'; END IF;
  FOR target IN
    SELECT DISTINCT p.user_id FROM profiles p LEFT JOIN app_access a USING(user_id)
    WHERE p.user_id = ANY(p_user_ids) AND p.user_id <> auth.uid() AND a.deleted_at IS NULL
      AND coalesce(a.suspended,false) = (p_action = 'resume')
  LOOP
    PERFORM admin_member_action(target, p_action);
    changed := changed + 1;
  END LOOP;
  RETURN changed;
END $$;

REVOKE ALL ON FUNCTION public.admin_bulk_member_action(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_member_action(uuid[],text) TO authenticated;
