-- ============================================================
-- Sport Cal — Initial Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Profiles table (extends auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- follows: one row per user-entity relationship
-- ============================================================

DROP TYPE IF EXISTS entity_type CASCADE;
CREATE TYPE entity_type AS ENUM ('sport', 'league', 'team', 'player', 'tournament');

CREATE TABLE IF NOT EXISTS public.follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type     entity_type NOT NULL,
  entity_id       TEXT NOT NULL,
  entity_name     TEXT NOT NULL,
  sport           TEXT NOT NULL,
  entity_metadata JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_user_id ON public.follows (user_id);
CREATE INDEX IF NOT EXISTS idx_follows_entity ON public.follows (entity_type, entity_id);

-- ============================================================
-- calendar_tokens: each user gets a persistent .ics token
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_tokens_token ON public.calendar_tokens (token);

-- ============================================================
-- cached_fixtures: API-Sports fixture data with TTL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cached_fixtures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport         TEXT NOT NULL,
  fixture_id    TEXT NOT NULL,
  league_id     TEXT NOT NULL,
  season        TEXT NOT NULL,
  home_team_id  TEXT,
  away_team_id  TEXT,
  player_ids    TEXT[] DEFAULT '{}',
  tournament_id TEXT,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  status        TEXT,
  venue         TEXT,
  round         TEXT,
  raw_data      JSONB NOT NULL DEFAULT '{}',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds   INT NOT NULL DEFAULT 3600,
  UNIQUE (sport, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_cached_fixtures_sport_league ON public.cached_fixtures (sport, league_id);
CREATE INDEX IF NOT EXISTS idx_cached_fixtures_home_team    ON public.cached_fixtures (sport, home_team_id);
CREATE INDEX IF NOT EXISTS idx_cached_fixtures_away_team    ON public.cached_fixtures (sport, away_team_id);
CREATE INDEX IF NOT EXISTS idx_cached_fixtures_start_time   ON public.cached_fixtures (start_time);
CREATE INDEX IF NOT EXISTS idx_cached_fixtures_tournament   ON public.cached_fixtures (tournament_id);
CREATE INDEX IF NOT EXISTS idx_cached_fixtures_player_ids   ON public.cached_fixtures USING GIN (player_ids);

-- ============================================================
-- api_cache: endpoint-level caching (leagues, teams, players lists)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_cache (
  cache_key   TEXT PRIMARY KEY,
  response    JSONB NOT NULL DEFAULT '{}',
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INT NOT NULL DEFAULT 3600
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache       ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- follows: full CRUD on own rows
DROP POLICY IF EXISTS "Users manage own follows" ON public.follows;
CREATE POLICY "Users manage own follows"
  ON public.follows FOR ALL USING (auth.uid() = user_id);

-- calendar_tokens
DROP POLICY IF EXISTS "Users manage own calendar tokens" ON public.calendar_tokens;
CREATE POLICY "Users manage own calendar tokens"
  ON public.calendar_tokens FOR ALL USING (auth.uid() = user_id);

-- cached_fixtures and api_cache: authenticated users can READ, only service_role can WRITE
DROP POLICY IF EXISTS "Authenticated users can read fixtures" ON public.cached_fixtures;
CREATE POLICY "Authenticated users can read fixtures"
  ON public.cached_fixtures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read api_cache" ON public.api_cache;
CREATE POLICY "Authenticated users can read api_cache"
  ON public.api_cache FOR SELECT TO authenticated USING (true);

-- NOTE: INSERT/UPDATE/DELETE on cached_fixtures and api_cache is done server-side
-- using the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS automatically.
