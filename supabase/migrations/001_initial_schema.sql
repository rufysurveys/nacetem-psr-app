-- ====================================================================
-- PSR GAMIFICATION ENGINE: COMPLETE PRODUCTION DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  ministry TEXT NOT NULL,
  agency TEXT NOT NULL,
  department TEXT NOT NULL,
  cadre TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 2. GAMES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  competition_mode TEXT NOT NULL CHECK (competition_mode IN ('intra_dept', 'inter_agency')),
  target_org TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  cutoff_datetime TIMESTAMPTZ NOT NULL,
  max_players INT NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'open', 'full', 'active', 'completed', 'cancelled')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 3. GAME_PLAYERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'ready', 'playing', 'completed', 'left')),
  current_score INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_game_player UNIQUE (game_id, user_id)
);

-- --------------------------------------------------------------------
-- 4. QUESTIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  chapter TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INT NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 5. GAME_QUESTIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  CONSTRAINT unique_game_question UNIQUE (game_id, question_id),
  CONSTRAINT unique_game_question_order UNIQUE (game_id, question_order)
);

-- --------------------------------------------------------------------
-- 6. ANSWERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  selected_option INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_player_answer UNIQUE (game_id, question_id, user_id)
);

-- --------------------------------------------------------------------
-- 7. RESULTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_score INT NOT NULL DEFAULT 0,
  total_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  rank INT,
  xp_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_game_result UNIQUE (game_id, user_id)
);

-- ====================================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_host_id ON public.games(host_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_user ON public.answers(game_id, user_id);
CREATE INDEX IF NOT EXISTS idx_results_game_id ON public.results(game_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public authenticated read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- GAMES POLICIES
CREATE POLICY "Public authenticated read games"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Host insert game"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host update game"
  ON public.games FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

-- GAME PLAYERS POLICIES
CREATE POLICY "Public authenticated read game_players"
  ON public.game_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Player join self"
  ON public.game_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Player update self status"
  ON public.game_players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- QUESTIONS POLICIES
CREATE POLICY "Authenticated read questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- GAME QUESTIONS POLICIES
CREATE POLICY "Authenticated read game_questions"
  ON public.game_questions FOR SELECT
  TO authenticated
  USING (true);

-- ANSWERS POLICIES
CREATE POLICY "Player read own answers"
  ON public.answers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Player insert own answer"
  ON public.answers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RESULTS POLICIES
CREATE POLICY "Public authenticated read results"
  ON public.results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System/Player insert own result"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- SUPABASE STORAGE BUCKET Setup (Execute in Storage SQL Editor)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Storage Read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Auth User Upload Photo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-photos');

-- ====================================================================
-- SERVER-SIDE TRUSTED ANSWER VALIDATION STORED PROCEDURE
-- ====================================================================
CREATE OR REPLACE FUNCTION public.submit_player_answer(
  p_game_id UUID,
  p_question_id UUID,
  p_selected_option INT,
  p_response_time_ms INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_correct_option INT;
  v_is_correct BOOLEAN;
  v_points INT := 0;
  v_new_total INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch correct answer from database (not client)
  SELECT correct_option_index INTO v_correct_option
  FROM public.questions
  WHERE id = p_question_id;

  IF v_correct_option IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  v_is_correct := (v_selected_option = v_correct_option);

  IF v_is_correct THEN
    -- Base score: 100 + Speed Bonus (up to 375 based on response time)
    v_points := 100 + GREATEST(0, LEAST(375, 375 - (p_response_time_ms / 40)));
  ELSE
    v_points := 0;
  END IF;

  -- Record persistent answer
  INSERT INTO public.answers (game_id, question_id, user_id, selected_option, is_correct, response_time_ms)
  VALUES (p_game_id, p_question_id, v_user_id, p_selected_option, v_is_correct, p_response_time_ms)
  ON CONFLICT (game_id, question_id, user_id) DO UPDATE
  SET selected_option = EXCLUDED.selected_option,
      is_correct = EXCLUDED.is_correct,
      response_time_ms = EXCLUDED.response_time_ms;

  -- Update player running score
  UPDATE public.game_players
  SET current_score = current_score + v_points
  WHERE game_id = p_game_id AND user_id = v_user_id
  RETURNING current_score INTO v_new_total;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'points_earned', v_points,
    'current_total_score', v_new_total
  );
END;
$$;
