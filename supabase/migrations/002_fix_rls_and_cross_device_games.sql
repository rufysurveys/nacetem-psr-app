-- ====================================================================
-- MIGRATION 002: FIX RLS PERMISSIONS & ENABLE CROSS-DEVICE GAME SYNC
-- Run this in your Supabase SQL Editor to allow all devices to read/write games
-- ====================================================================

-- 1. PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public access profiles" ON public.profiles;

CREATE POLICY "Allow public access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. GAMES POLICIES
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read games" ON public.games;
DROP POLICY IF EXISTS "Public insert game" ON public.games;
DROP POLICY IF EXISTS "Public update game" ON public.games;
DROP POLICY IF EXISTS "Allow public access games" ON public.games;

CREATE POLICY "Allow public access games" ON public.games FOR ALL USING (true) WITH CHECK (true);

-- 3. GAME PLAYERS POLICIES
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read game_players" ON public.game_players;
DROP POLICY IF EXISTS "Public join game_players" ON public.game_players;
DROP POLICY IF EXISTS "Public update game_players" ON public.game_players;
DROP POLICY IF EXISTS "Allow public access game_players" ON public.game_players;

CREATE POLICY "Allow public access game_players" ON public.game_players FOR ALL USING (true) WITH CHECK (true);

-- 4. ANSWERS & RESULTS POLICIES
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Player read own answers" ON public.answers;
DROP POLICY IF EXISTS "Player insert own answer" ON public.answers;
DROP POLICY IF EXISTS "Allow public access answers" ON public.answers;

CREATE POLICY "Allow public access answers" ON public.answers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public authenticated read results" ON public.results;
DROP POLICY IF EXISTS "Allow public access results" ON public.results;

CREATE POLICY "Allow public access results" ON public.results FOR ALL USING (true) WITH CHECK (true);

-- 5. ENABLE REALTIME REPLICATION FOR INSTANT CROSS-DEVICE SYNC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
  END IF;
END $$;
