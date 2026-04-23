-- ============================================================
-- Denied-party / sanctions screening (Phase 2)
--
-- Adds an admin-only audit table for every screening check run
-- against an ops freight quote (or future buyer/company subjects),
-- plus a 'pending_screening' status on ops_freight_quotes for the
-- hold-for-review queue.
--
-- Wired into createOpsQuote: every quote insert is screened first;
-- on a hit the quote enters 'pending_screening' and surfaces in
-- the admin queue (/admin/logistics/screening) for manual clear or
-- reject. Audit row is written for both hits and clears so the
-- compliance trail is unbroken.
-- ============================================================

-- New status value for ops_quote_status enum.
-- Note: ALTER TYPE ADD VALUE cannot be used in the same transaction
-- as the new value, but we don't reference 'pending_screening'
-- elsewhere in this migration, so a single transaction is safe.
ALTER TYPE ops_quote_status ADD VALUE IF NOT EXISTS 'pending_screening';

-- ============================================================
-- screening_checks: one row per provider call.
-- subject_type lets the table cover future subjects (companies,
-- buyer requests, users) without schema churn.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE screening_subject_type AS ENUM (
    'ops_quote', 'buyer_request', 'company', 'user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE screening_result AS ENUM ('clear', 'hit', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE screening_decision AS ENUM ('cleared', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS screening_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type screening_subject_type NOT NULL,
  subject_id UUID NOT NULL,

  provider TEXT NOT NULL,                   -- 'opensanctions' | 'dowjones' | etc.
  query JSONB NOT NULL,                     -- { name, country, company, ... } sent to provider
  result screening_result NOT NULL,
  matches JSONB,                            -- [{ name, lists[], score, entity_id, url }]
  top_score NUMERIC(5,4),                   -- highest match score, denormalised for queue sort

  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES user_profiles(id),
  decision screening_decision,
  decision_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_screening_subject ON screening_checks(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_screening_queue ON screening_checks(result, reviewed_at)
  WHERE result = 'hit' AND reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_screening_created ON screening_checks(created_at DESC);

ALTER TABLE screening_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "screening_checks admin read" ON screening_checks;
  DROP POLICY IF EXISTS "screening_checks admin write" ON screening_checks;
END $$;

CREATE POLICY "screening_checks admin read" ON screening_checks
  FOR SELECT USING (is_admin());
CREATE POLICY "screening_checks admin write" ON screening_checks
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Link the most recent screening check on a quote so the detail
-- page and queue page can join in one hop. Older checks are still
-- discoverable via (subject_type='ops_quote', subject_id=quote.id).
ALTER TABLE ops_freight_quotes
  ADD COLUMN IF NOT EXISTS screening_check_id UUID REFERENCES screening_checks(id);

CREATE INDEX IF NOT EXISTS idx_ops_quotes_screening ON ops_freight_quotes(screening_check_id)
  WHERE screening_check_id IS NOT NULL;
