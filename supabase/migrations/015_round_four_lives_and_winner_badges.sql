BEGIN;

CREATE TABLE public.contest_round_life_resets (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number = 4),
  reset_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (game_id, round_number)
);
ALTER TABLE public.contest_round_life_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contest_round_life_resets FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.contest_restore_round_four_lives(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  engine integer;
  round_start integer;
  elapsed numeric;
BEGIN
  SELECT engine_version INTO engine FROM public.games WHERE id = p_game_id;
  IF engine IS DISTINCT FROM 3 THEN RETURN; END IF;

  SELECT spin_offset INTO round_start
  FROM public.contest_rounds
  WHERE game_id = p_game_id AND round_number = 4;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT extract(epoch FROM (clock_timestamp() - started_at)) INTO elapsed
  FROM public.games WHERE id = p_game_id;
  IF elapsed < round_start + 6 THEN RETURN; END IF;

  INSERT INTO public.contest_round_life_resets(game_id, round_number)
  VALUES (p_game_id, 4)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    UPDATE public.game_players
    SET life_tokens = 1
    WHERE game_id = p_game_id AND life_tokens <= 0;
  END IF;
END;
$$;

ALTER FUNCTION public.remote_room_state(uuid, uuid)
  RENAME TO contest_room_state_before_round_four_life_reset;
REVOKE ALL ON FUNCTION public.contest_room_state_before_round_four_life_reset(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.remote_room_state(p_game_id uuid, p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.app_require_member(p_game_id);
  PERFORM public.contest_v2_advance(p_game_id);
  PERFORM public.contest_restore_round_four_lives(p_game_id);
  RETURN public.contest_room_state_before_round_four_life_reset(p_game_id, p_client_id);
END;
$$;
REVOKE ALL ON FUNCTION public.contest_restore_round_four_lives(uuid), public.remote_room_state(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remote_room_state(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.contest_restore_round_four_lives(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE TABLE public.contest_winner_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  verification_code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT contest_winner_badges_result_fk
    FOREIGN KEY (game_id, user_id) REFERENCES public.results(game_id, user_id) ON DELETE CASCADE,
  CONSTRAINT contest_winner_badges_game_user_unique UNIQUE (game_id, user_id),
  CONSTRAINT contest_winner_badges_code_format CHECK (verification_code ~ '^[A-F0-9]{16}$')
);
CREATE INDEX contest_winner_badges_game ON public.contest_winner_badges(game_id);
ALTER TABLE public.contest_winner_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contest_winner_badges FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.issue_contest_winner_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.rank = 1 THEN
    INSERT INTO public.contest_winner_badges(game_id, user_id, verification_code)
    VALUES (
      NEW.game_id,
      NEW.user_id,
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
    )
    ON CONFLICT (game_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER contest_winner_badge_issued
  AFTER INSERT ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.issue_contest_winner_badge();
REVOKE ALL ON FUNCTION public.issue_contest_winner_badge() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_contest_winner_badge(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE badge jsonb;
BEGIN
  PERFORM public.app_require_member(p_game_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = p_game_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Join this tournament to view its winner badge';
  END IF;

  SELECT jsonb_build_object(
    'verification_code', b.verification_code,
    'issued_at', b.issued_at,
    'winner_name', p.full_name,
    'tournament_title', g.title,
    'score', r.total_score,
    'accuracy', r.total_accuracy,
    'completed_at', r.completed_at
  ) INTO badge
  FROM public.contest_winner_badges b
  JOIN public.profiles p ON p.user_id = b.user_id
  JOIN public.games g ON g.id = b.game_id
  JOIN public.results r ON r.game_id = b.game_id AND r.user_id = b.user_id
  WHERE b.game_id = p_game_id
    AND b.user_id = auth.uid()
    AND r.rank = 1
    AND g.status = 'completed';

  RETURN badge;
END;
$$;
REVOKE ALL ON FUNCTION public.get_contest_winner_badge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contest_winner_badge(uuid) TO authenticated;

CREATE FUNCTION public.verify_contest_winner_badge(p_verification_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'issuer', 'National Centre for Technology Management (NACETEM)',
    'credential', 'PSR Tournament Winner',
    'verification_code', b.verification_code,
    'issued_at', b.issued_at,
    'winner_name', p.full_name,
    'tournament_title', g.title,
    'score', r.total_score,
    'accuracy', r.total_accuracy,
    'completed_at', r.completed_at
  )
  FROM public.contest_winner_badges b
  JOIN public.profiles p ON p.user_id = b.user_id
  JOIN public.games g ON g.id = b.game_id
  JOIN public.results r ON r.game_id = b.game_id AND r.user_id = b.user_id
  WHERE b.verification_code = upper(trim(p_verification_code))
    AND r.rank = 1
    AND g.status = 'completed';
$$;
REVOKE ALL ON FUNCTION public.verify_contest_winner_badge(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_contest_winner_badge(text) TO anon, authenticated;

  INSERT INTO public.contest_winner_badges(game_id, user_id, verification_code)
  SELECT r.game_id,
       r.user_id,
       upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
  FROM public.results r
  JOIN public.games g ON g.id = r.game_id
  WHERE r.rank = 1 AND g.status = 'completed'
  ON CONFLICT (game_id, user_id) DO NOTHING;

COMMIT;
