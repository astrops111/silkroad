-- ============================================================
-- Cost variance + FX snapshots (Phase 2)
--
-- Adds the columns needed to compare quoted-vs-actual landed cost
-- on a shipment, plus a per-line invoice reconciliation table so
-- ops can match individual carrier / forwarder / customs invoice
-- lines back to the engine's quoted breakdown.
--
-- FX snapshot columns capture the rate AT QUOTE-COMMIT TIME so
-- accounting reconciles against the rate the price was set on,
-- not the rate at invoice arrival weeks later. The hourly
-- exchange_rates cron + helpers in src/lib/payments/currency.ts
-- already supply the rate; only the snapshot fields are new.
-- ============================================================

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS quoted_total_minor BIGINT,
  ADD COLUMN IF NOT EXISTS quoted_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS quoted_fx_rate_to_usd NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_total_minor BIGINT,
  ADD COLUMN IF NOT EXISTS actual_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS actual_recorded_at TIMESTAMPTZ;

-- Computed variance (NULL until actuals exist). GENERATED ALWAYS
-- means writes can't accidentally drift the formula.
DO $$ BEGIN
  ALTER TABLE b2b_shipments
    ADD COLUMN cost_variance_minor BIGINT
      GENERATED ALWAYS AS (
        CASE WHEN actual_total_minor IS NOT NULL AND quoted_total_minor IS NOT NULL
             THEN actual_total_minor - quoted_total_minor
             ELSE NULL
        END
      ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_b2b_shipments_variance
  ON b2b_shipments(cost_variance_minor)
  WHERE cost_variance_minor IS NOT NULL;

-- ============================================================
-- b2b_shipment_cost_actuals: one row per carrier / forwarder /
-- customs / insurance invoice line. Categories mirror the
-- engine's CostBreakdown components plus surcharges that only
-- appear post-shipment (demurrage, detention).
-- ============================================================
DO $$ BEGIN
  CREATE TYPE shipment_cost_category AS ENUM (
    'freight',         -- main-leg ocean / air freight
    'fuel',            -- BAF / fuel surcharge
    'thc',             -- terminal handling charges
    'customs_duty',
    'customs_vat',
    'customs_other',   -- excise, IDF, RDL, port levies, etc.
    'insurance',
    'first_mile',      -- origin trucking + export clearance
    'last_mile',       -- destination delivery + import clearance
    'handling',        -- platform / forwarder fees
    'demurrage',       -- container detention at port
    'detention',       -- container held outside port
    'docs',            -- BL fees, certificate of origin, SONCAP, etc.
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: b2b_shipments is partitioned with composite PK (id, created_at),
-- so a simple FK on id is impossible. Matches the existing pattern used
-- by shipment_tracking_events and other shipment-children tables.
CREATE TABLE IF NOT EXISTS b2b_shipment_cost_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL,

  category shipment_cost_category NOT NULL,
  vendor TEXT,                              -- carrier / forwarder / broker name
  invoice_ref TEXT,                         -- supplier-side invoice number
  invoice_date DATE,

  amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  fx_rate_to_usd NUMERIC(18,8),             -- snapshot at line entry; null = USD line

  notes TEXT,
  attachment_url TEXT,                      -- Supabase Storage URL for the invoice scan

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_cost_actuals_shipment ON b2b_shipment_cost_actuals(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cost_actuals_category ON b2b_shipment_cost_actuals(shipment_id, category);
CREATE INDEX IF NOT EXISTS idx_cost_actuals_invoice ON b2b_shipment_cost_actuals(invoice_ref)
  WHERE invoice_ref IS NOT NULL;

ALTER TABLE b2b_shipment_cost_actuals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cost_actuals admin read" ON b2b_shipment_cost_actuals;
  DROP POLICY IF EXISTS "cost_actuals admin write" ON b2b_shipment_cost_actuals;
END $$;

CREATE POLICY "cost_actuals admin read" ON b2b_shipment_cost_actuals
  FOR SELECT USING (is_admin());
CREATE POLICY "cost_actuals admin write" ON b2b_shipment_cost_actuals
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());
