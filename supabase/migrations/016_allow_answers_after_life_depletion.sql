BEGIN;

CREATE OR REPLACE FUNCTION public.contest_v2_score(
  p_game uuid,
  p_question uuid,
  p_user uuid,
  p_option integer,
  p_elapsed integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  q public.game_questions;
  player public.game_players;
  prior public.answers;
  correct boolean;
  base integer := 0;
  bonus integer := 0;
  stake integer := 0;
  delta integer := 0;
  lost integer := 0;
  engine integer;
BEGIN
  SELECT * INTO player
  FROM public.game_players
  WHERE game_id = p_game AND user_id = p_user
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join the room first'; END IF;

  SELECT * INTO prior
  FROM public.answers
  WHERE game_id = p_game AND question_id = p_question AND user_id = p_user;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_correct', prior.is_correct,
      'points_earned', prior.points_earned,
      'current_total_score', player.current_score
    );
  END IF;

  SELECT * INTO q
  FROM public.game_questions
  WHERE game_id = p_game AND question_id = p_question;
  SELECT engine_version INTO engine FROM public.games WHERE id = p_game;

  correct := p_option = q.correct_option_index;

  IF engine = 2 THEN
    IF correct THEN
      base := q.base_points;
      bonus := greatest(0, ceil(
        (q.closes_offset - q.answer_offset - p_elapsed / 1000.0)
        / (q.closes_offset - q.answer_offset)
        * CASE WHEN q.round_number = 2 THEN 10 ELSE 5 END
      ))::integer;
    END IF;
    IF q.round_number = 3 AND player.life_tokens > 0 THEN
      SELECT coalesce(amount, 0) INTO stake
      FROM public.contest_wagers
      WHERE game_id = p_game AND user_id = p_user AND question_id = p_question;
      stake := coalesce(stake, 0);
      delta := CASE WHEN correct THEN stake ELSE -stake END;
      lost := CASE WHEN correct THEN 0 ELSE least(q.life_cost, player.life_tokens) END;
    END IF;
  ELSE
    IF correct THEN
      base := q.base_points;
      bonus := greatest(0, ceil(
        (q.closes_offset - q.answer_offset - p_elapsed / 1000.0)
        / (q.closes_offset - q.answer_offset)
        * CASE WHEN q.round_number IN (2, 4) THEN 10 ELSE 5 END
      ))::integer;
    END IF;
    IF q.round_number = 5 AND player.life_tokens > 0 THEN
      SELECT coalesce(amount, 0) INTO stake
      FROM public.contest_wagers
      WHERE game_id = p_game AND user_id = p_user AND question_id = p_question;
      stake := coalesce(stake, 0);
      delta := CASE WHEN correct THEN stake ELSE -stake END;
    END IF;
    IF q.round_number IN (3, 4) AND player.life_tokens > 0 THEN
      lost := CASE WHEN correct THEN 0 ELSE least(q.life_cost, player.life_tokens) END;
    END IF;
  END IF;

  INSERT INTO public.answers(
    game_id, question_id, user_id, selected_option, is_correct,
    response_time_ms, points_earned, wager_delta, lives_lost
  ) VALUES (
    p_game, p_question, p_user, p_option, correct, p_elapsed,
    base + bonus + delta, delta, lost
  );

  UPDATE public.game_players
  SET current_score = current_score + base + bonus + delta,
      life_tokens = greatest(0, life_tokens - lost),
      jackpot_balance = jackpot_balance + delta
  WHERE game_id = p_game AND user_id = p_user
  RETURNING * INTO player;

  RETURN jsonb_build_object(
    'is_correct', correct,
    'points_earned', base + bonus + delta,
    'current_total_score', player.current_score
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_player_answer(
  p_game_id uuid,
  p_question_id uuid,
  p_selected_option integer,
  p_response_time_ms integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  game public.games;
  question public.game_questions;
  elapsed integer;
  received timestamptz := clock_timestamp();
BEGIN
  PERFORM public.app_require_member(p_game_id);
  SELECT * INTO game FROM public.games WHERE id = p_game_id;

  IF game.engine_version = 1 THEN
    RETURN public.contest_v2_answer_internal(
      p_game_id, p_question_id, p_selected_option, p_response_time_ms
    );
  END IF;

  PERFORM public.contest_v2_advance(p_game_id);
  PERFORM 1 FROM public.game_players
  WHERE game_id = p_game_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join this tournament first'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.answers
    WHERE game_id = p_game_id AND question_id = p_question_id AND user_id = auth.uid()
  ) THEN
    RETURN public.contest_v2_score(p_game_id, p_question_id, auth.uid(), p_selected_option, 0);
  END IF;

  SELECT * INTO question
  FROM public.game_questions
  WHERE game_id = p_game_id AND question_id = p_question_id;
  IF NOT FOUND OR game.status <> 'active' THEN RAISE EXCEPTION 'No active question'; END IF;

  elapsed := floor(extract(epoch FROM (received - game.started_at)) * 1000)::integer
    - question.answer_offset * 1000;
  IF elapsed < 0 OR elapsed >= (question.closes_offset - question.answer_offset) * 1000 THEN
    RAISE EXCEPTION 'The answer window has closed or has not started';
  END IF;
  IF p_selected_option IS NULL OR p_selected_option NOT BETWEEN 0 AND 3 THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;

  RETURN public.contest_v2_score(
    p_game_id, p_question_id, auth.uid(), p_selected_option, elapsed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contest_v2_score(uuid, uuid, uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_player_answer(uuid, uuid, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_player_answer(uuid, uuid, integer, integer)
  TO authenticated;

COMMIT;
