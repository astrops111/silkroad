-- ============================================================
-- 00085_tariff_refresh.sql — live tariff pipeline support
-- 1. tariff_rates provenance: when a row was last confirmed against
--    the external provider, and the provider's reference id.
-- 2. tariff_refresh_runs: audit log for /api/cron/tariff-refresh.
-- ============================================================

ALTER TABLE tariff_rates
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

-- Cron work-list query: API-sourced rows ordered by staleness.
CREATE INDEX IF NOT EXISTS idx_tariff_api_verified
  ON tariff_rates(last_verified_at NULLS FIRST)
  WHERE source = 'tariff_api' AND is_active = true;

-- ============================================================
-- Audit log — one row per cron run (written by service role).
-- ============================================================
CREATE TABLE IF NOT EXISTS tariff_refresh_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,             -- 'simplyduty' etc.
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  checked INT NOT NULL DEFAULT 0,     -- pairs considered
  refreshed INT NOT NULL DEFAULT 0,   -- existing rows re-verified/updated
  inserted INT NOT NULL DEFAULT 0,    -- new gap-fill rows created
  failed INT NOT NULL DEFAULT 0,      -- API/upsert errors
  skipped INT NOT NULL DEFAULT 0,     -- capped out or no data from provider
  details JSONB DEFAULT '{}',         -- e.g. {"errors": ["KE/851713: 429"]}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tariff_refresh_runs_started
  ON tariff_refresh_runs(started_at DESC);

ALTER TABLE tariff_refresh_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tariff_refresh_runs internal read" ON tariff_refresh_runs;
END $$;

-- Cron writes via service role (bypasses RLS); ops dashboards read as admin.
CREATE POLICY "tariff_refresh_runs internal read" ON tariff_refresh_runs
  FOR SELECT USING (is_admin());
