BEGIN;

CREATE OR REPLACE FUNCTION public.app_record_activity_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  game_title text;
BEGIN
  IF TG_TABLE_NAME = 'game_players' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT title INTO game_title FROM public.games WHERE id = NEW.game_id;
      INSERT INTO public.app_user_activity(user_id, activity_type, summary, metadata)
      VALUES (
        NEW.user_id,
        'tournament_joined',
        'Joined tournament: ' || coalesce(game_title, 'Tournament'),
        jsonb_build_object('game_id', NEW.game_id)
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'games' THEN
    IF TG_OP = 'INSERT' AND NEW.host_id IS NOT NULL THEN
      INSERT INTO public.app_user_activity(user_id, activity_type, summary, metadata)
      VALUES (
        NEW.host_id,
        'tournament_scheduled',
        'Scheduled tournament: ' || NEW.title,
        jsonb_build_object('game_id', NEW.id, 'is_proctored', NEW.is_proctored)
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'answers' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.app_user_activity(user_id, activity_type, summary, metadata)
      VALUES (
        NEW.user_id,
        'contest_answered',
        CASE WHEN NEW.is_correct THEN 'Answered a contest question correctly' ELSE 'Submitted a contest answer' END,
        jsonb_build_object(
          'game_id', NEW.game_id,
          'question_id', NEW.question_id,
          'is_correct', NEW.is_correct,
          'points_earned', NEW.points_earned
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
