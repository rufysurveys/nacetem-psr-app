BEGIN;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_proctored boolean NOT NULL DEFAULT false;

COMMIT;
