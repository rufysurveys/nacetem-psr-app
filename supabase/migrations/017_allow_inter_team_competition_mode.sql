-- Migration 017: Allow 'inter_team' in public.games competition_mode check constraint

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_competition_mode_check;

ALTER TABLE public.games ADD CONSTRAINT games_competition_mode_check
  CHECK (competition_mode IN ('inter_team', 'intra_dept', 'inter_agency'));
