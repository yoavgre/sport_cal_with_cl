-- ============================================================
-- Sport Cal — Fixture Sync Infrastructure
-- ============================================================

-- fixture_changes: audit log when a fixture's date/time/status changes
-- Used for future push notifications and change awareness
CREATE TABLE IF NOT EXISTS public.fixture_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport        TEXT NOT NULL,
  fixture_id   TEXT NOT NULL,
  change_type  TEXT NOT NULL,  -- 'reschedule' | 'postpone' | 'cancel' | 'status_change' | 'score_update'
  old_value    JSONB NOT NULL DEFAULT '{}',
  new_value    JSONB NOT NULL DEFAULT '{}',
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixture_changes_fixture ON public.fixture_changes (sport, fixture_id);
CREATE INDEX IF NOT EXISTS idx_fixture_changes_detected ON public.fixture_changes (detected_at DESC);

-- sync_log: record each sync run for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.sync_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport          TEXT,
  entity_type    TEXT,
  entity_id      TEXT,
  fixtures_found INT DEFAULT 0,
  fixtures_new   INT DEFAULT 0,
  fixtures_updated INT DEFAULT 0,
  changes_detected INT DEFAULT 0,
  error          TEXT,
  duration_ms    INT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started ON public.sync_log (started_at DESC);

-- Add home_team_name / away_team_name to cached_fixtures for display without extra lookups
ALTER TABLE public.cached_fixtures
  ADD COLUMN IF NOT EXISTS home_team_name TEXT,
  ADD COLUMN IF NOT EXISTS away_team_name TEXT,
  ADD COLUMN IF NOT EXISTS home_team_logo TEXT,
  ADD COLUMN IF NOT EXISTS away_team_logo TEXT,
  ADD COLUMN IF NOT EXISTS league_name    TEXT,
  ADD COLUMN IF NOT EXISTS league_logo    TEXT,
  ADD COLUMN IF NOT EXISTS home_score     INT,
  ADD COLUMN IF NOT EXISTS away_score     INT;

-- RLS for new tables: service role can write, authenticated can read
ALTER TABLE public.fixture_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read fixture_changes" ON public.fixture_changes;
CREATE POLICY "Authenticated users can read fixture_changes"
  ON public.fixture_changes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read sync_log" ON public.sync_log;
CREATE POLICY "Authenticated users can read sync_log"
  ON public.sync_log FOR SELECT TO authenticated USING (true);
