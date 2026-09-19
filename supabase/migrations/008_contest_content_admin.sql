BEGIN;
CREATE FUNCTION admin_save_contest_question(p_id uuid,p_text text,p_chapter text,p_options jsonb,p_correct integer,p_explanation text,p_section text,p_rule text,p_excerpt text,p_kind text,p_tier integer,p_source text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE qid uuid; BEGIN
 PERFORM app_require_admin();
 IF length(trim(coalesce(p_section,'')))=0 OR length(trim(coalesce(p_rule,'')))=0 OR length(trim(coalesce(p_excerpt,'')))=0 OR length(trim(coalesce(p_source,'')))=0 OR p_kind NOT IN('quiz','scenario') OR p_tier NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'Supply a verified section, rule, rulebook excerpt, source, question type and difficulty';END IF;
 qid:=admin_save_question(p_id,p_text,p_chapter,p_options,p_correct,p_explanation);
 UPDATE questions SET section_key=trim(p_section),rule_ref=trim(p_rule),rule_excerpt=trim(p_excerpt),question_kind=p_kind,challenge_tier=p_tier,source_file=trim(p_source) WHERE id=qid;
 RETURN qid;
END $$;
REVOKE ALL ON FUNCTION admin_save_contest_question(uuid,text,text,jsonb,integer,text,text,text,text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION admin_save_contest_question(uuid,text,text,jsonb,integer,text,text,text,text,text,integer,text) TO authenticated;
COMMIT;
