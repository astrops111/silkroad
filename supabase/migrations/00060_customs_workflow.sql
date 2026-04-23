-- ============================================================
-- Customs brokerage workflow (Phase 2 follow-up)
--
-- Replaces the free-form customs_status TEXT column with a real
-- enum, captures broker + filing + clearance metadata, and adds a
-- customs_holds history table so each hold (missing docs / valuation
-- query / inspection / etc.) is logged with open/resolve timestamps.
--
-- Duty / VAT / other fees actually paid at clearance feed back into
-- the cost-variance loop alongside b2b_shipment_cost_actuals — both
-- can be sources of truth, with customs columns being the easier
-- "what did the broker tell us" surface and cost_actuals being the
-- granular invoice reconciliation.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE customs_status_enum AS ENUM (
    'not_required',     -- intra-country, samples below threshold, etc.
    'pending',          -- default when shipment created — needs ops attention
    'preparing',        -- broker collecting docs / classifying
    'submitted',        -- declaration filed with customs authority
    'on_hold',          -- customs has flagged something; see customs_holds
    'cleared',          -- released, duty/tax paid
    'rejected'          -- declaration refused (rare, requires re-filing)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The legacy customs_status column was free-form TEXT. Drop it (it
-- has no production data of consequence) and recreate as the enum.
ALTER TABLE b2b_shipments DROP COLUMN IF EXISTS customs_status;
ALTER TABLE b2b_shipments ADD COLUMN customs_status customs_status_enum DEFAULT 'pending';

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS customs_broker_name TEXT,
  ADD COLUMN IF NOT EXISTS customs_broker_ref TEXT,
  ADD COLUMN IF NOT EXISTS customs_filed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customs_cleared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customs_duty_paid_minor BIGINT,
  ADD COLUMN IF NOT EXISTS customs_vat_paid_minor BIGINT,
  ADD COLUMN IF NOT EXISTS customs_other_paid_minor BIGINT,
  ADD COLUMN IF NOT EXISTS customs_paid_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS customs_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_shipments_customs_status
  ON b2b_shipments(customs_status)
  WHERE customs_status IN ('pending', 'preparing', 'submitted', 'on_hold');

CREATE INDEX IF NOT EXISTS idx_b2b_shipments_customs_dest_status
  ON b2b_shipments(delivery_country, customs_status);

-- ============================================================
-- customs_holds: log every hold customs raises against a shipment.
-- Open hold = resolved_at IS NULL. A shipment can have multiple
-- holds over its lifetime (e.g., classification dispute resolved,
-- then later flagged for inspection).
-- ============================================================
DO $$ BEGIN
  CREATE TYPE customs_hold_reason AS ENUM (
    'missing_documents',     -- COO, BL, commercial invoice, SONCAP, PVOC, etc.
    'valuation_query',       -- customs disputes invoice value (transfer pricing)
    'classification_dispute',-- HS code disagreement
    'license_required',      -- import license / restricted goods permit
    'inspection_pending',    -- physical exam scheduled
    'duty_unpaid',           -- duty/VAT not yet remitted
    'restricted_goods',      -- prohibited or controlled item flagged
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customs_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL,
  reason customs_hold_reason NOT NULL,
  notes TEXT,                                  -- ops free-form: what specifically was flagged
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,                       -- what was done to resolve
  external_ref TEXT,                           -- customs hold reference / case #
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customs_holds_shipment ON customs_holds(shipment_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_customs_holds_open ON customs_holds(opened_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE customs_holds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "customs_holds admin read" ON customs_holds;
  DROP POLICY IF EXISTS "customs_holds admin write" ON customs_holds;
END $$;

CREATE POLICY "customs_holds admin read" ON customs_holds
  FOR SELECT USING (is_admin());
CREATE POLICY "customs_holds admin write" ON customs_holds
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());
