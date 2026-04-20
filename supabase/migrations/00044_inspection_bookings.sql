-- ============================================================
-- 00044_inspection_bookings.sql — Third-party inspection bookings
-- Bookings with SGS / Bureau Veritas / Intertek / CCIC for pre-
-- shipment quality, loading supervision, weight and assay checks.
-- Reports are the basis for LC document compliance and final
-- price adjustment on concentrates.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE inspection_agency AS ENUM (
    'SGS', 'BV', 'Intertek', 'CCIC', 'ALS', 'Cotecna', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_type AS ENUM (
    'pre_shipment',
    'loading_supervision',
    'quality_assay',
    'draft_survey',        -- vessel draft weight survey
    'weight_verification',
    'sanitary',            -- phytosanitary / veterinary
    'container_tally'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_status AS ENUM (
    'requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inspection_bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference  TEXT UNIQUE NOT NULL,

  -- Linkage (at least one of rfq_id / quotation_id / commodity_id / lc_id must be set)
  rfq_id             UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  quotation_id       UUID REFERENCES quotations(id) ON DELETE SET NULL,
  commodity_id       UUID REFERENCES commodities(id) ON DELETE SET NULL,
  lc_id              UUID REFERENCES letters_of_credit(id) ON DELETE SET NULL,

  -- Parties
  booked_by_company_id UUID NOT NULL REFERENCES companies(id),
  supplier_company_id  UUID REFERENCES companies(id),

  -- Inspection details
  agency             inspection_agency NOT NULL,
  agency_other_name  TEXT,                -- when agency = 'other'
  inspection_type    inspection_type NOT NULL,
  scheduled_date     DATE,
  site_location      TEXT,                -- mine / warehouse / port / vessel
  port_code          TEXT,                -- UN/LOCODE if at port

  -- Fees
  booking_fee_usd    NUMERIC(12,2),
  fee_paid           BOOLEAN DEFAULT FALSE,

  -- Outcome
  status             inspection_status NOT NULL DEFAULT 'requested',
  report_url         TEXT,
  report_summary     TEXT,
  findings           JSONB DEFAULT '{}'::jsonb,

  -- Weight / assay results (for metals concentrates)
  draft_weight_mt    NUMERIC(14,3),
  final_weight_mt    NUMERIC(14,3),
  assay_results      JSONB DEFAULT '{}'::jsonb,
  -- Price adjustment derived from assay vs contract spec, applied at settlement
  price_adjustment_pct NUMERIC(6,3),

  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    rfq_id IS NOT NULL
    OR quotation_id IS NOT NULL
    OR commodity_id IS NOT NULL
    OR lc_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_inspection_rfq        ON inspection_bookings(rfq_id);
CREATE INDEX IF NOT EXISTS idx_inspection_quotation  ON inspection_bookings(quotation_id);
CREATE INDEX IF NOT EXISTS idx_inspection_commodity  ON inspection_bookings(commodity_id);
CREATE INDEX IF NOT EXISTS idx_inspection_lc         ON inspection_bookings(lc_id);
CREATE INDEX IF NOT EXISTS idx_inspection_status     ON inspection_bookings(status, scheduled_date);

DROP TRIGGER IF EXISTS trg_inspection_updated_at ON inspection_bookings;
CREATE TRIGGER trg_inspection_updated_at
  BEFORE UPDATE ON inspection_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE inspection_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspection_parties_read" ON inspection_bookings;
CREATE POLICY "inspection_parties_read" ON inspection_bookings
  FOR SELECT USING (
    is_admin()
    OR booked_by_company_id  = ANY(get_user_companies())
    OR supplier_company_id   = ANY(get_user_companies())
  );

-- Booking creation is paid-gated to prevent free-tier flood of bookings.
DROP POLICY IF EXISTS "inspection_booker_insert" ON inspection_bookings;
CREATE POLICY "inspection_booker_insert" ON inspection_bookings
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      booked_by_company_id = ANY(get_user_companies())
      AND is_paid_member(booked_by_company_id)
    )
  );

DROP POLICY IF EXISTS "inspection_booker_update" ON inspection_bookings;
CREATE POLICY "inspection_booker_update" ON inspection_bookings
  FOR UPDATE USING (
    is_admin() OR booked_by_company_id = ANY(get_user_companies())
  )
  WITH CHECK (
    is_admin() OR booked_by_company_id = ANY(get_user_companies())
  );
