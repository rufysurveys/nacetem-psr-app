-- ====================================================================
-- Migration: 003_alter_games_host_id_nullable.sql
-- Description: Allow NULL host_id in public.games for Admin multi-party tournaments without a single host
-- ====================================================================

ALTER TABLE public.games ALTER COLUMN host_id DROP NOT NULL;
