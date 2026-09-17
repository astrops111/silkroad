-- ============================================================
-- 00140_rfq_shipping_confirmations.sql
-- Per-RFQ freight confirmation: what ops actually quoted for THIS
-- request, entered after the forwarder quote comes back.
--
-- WHY: shipping_rates (00139) holds standing rate cards used to price
-- checkout. An RFQ is different — ops gets a fresh forwarder quote for
-- the specific cargo and needs to confirm the freight rate plus any
-- ad-hoc expenses (customs inspection, storage, trucking…) before the
-- quotation goes out. That confirmation is recorded here.
--
-- One row per RFQ (UNIQUE rfq_id): it starts as 'draft' while ops fills
-- it in and flips to 'confirmed' once signed off. Re-editing a confirmed
-- row is allowed — confirmed_at/by record the latest sign-off.
--
-- Distinct from ops_freight_quotes (00052), which covers off-platform
-- walk-in / forwarder enquiries that have no RFQ behind them.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE rfq_shipping_confirmation_status AS ENUM ('draft', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rfq_shipping_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL UNIQUE REFERENCES rfqs(id) ON DELETE CASCADE,

  -- Routing
  origin_country CHAR(2),
  destination_country CHAR(2),
  shipping_method shipping_method NOT NULL,

  -- The forwarder quote this confirmation is based on
  forwarder TEXT,
  quote_reference TEXT,
  quote_received_at DATE,
  valid_until DATE,

  -- Cargo as measured for this RFQ
  chargeable_weight_kg NUMERIC(10,2) DEFAULT 0,
  volume_cbm NUMERIC(10,4) DEFAULT 0,
  carton_count INT DEFAULT 0,

  -- Rate applied (BIGINT minor units in `currency`)
  per_kg_rate BIGINT DEFAULT 0,
  per_cbm_rate BIGINT DEFAULT 0,
  min_chargeable_kg NUMERIC(10,2) DEFAULT 0,
  rebox_fee_per_carton BIGINT DEFAULT 0,
  documentation_fee BIGINT DEFAULT 0,

  -- Ad-hoc expense lines: [{"label": "Customs inspection", "amount_minor": 5000}]
  expenses JSONB NOT NULL DEFAULT '[]',

  -- Stored totals — recomputed server-side on every save, never trusted
  -- from the client. Kept as columns so quotes and reports can read them
  -- without re-deriving the arithmetic.
  freight_total BIGINT NOT NULL DEFAULT 0,
  expenses_total BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Which standing rate card (if any) this was prefilled from
  source_shipping_rate_id UUID REFERENCES shipping_rates(id),

  status rfq_shipping_confirmation_status NOT NULL DEFAULT 'draft',
  notes TEXT,

  created_by_user_id UUID REFERENCES user_profiles(id),
  confirmed_by_user_id UUID REFERENCES user_profiles(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- expenses must be an array so the totals loop is well-defined
  CONSTRAINT rfq_shipping_expenses_is_array
    CHECK (jsonb_typeof(expenses) = 'array'),
  -- a confirmed row must say who signed it off and when
  CONSTRAINT rfq_shipping_confirmed_has_signoff
    CHECK (
      status <> 'confirmed'
      OR (confirmed_by_user_id IS NOT NULL AND confirmed_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_rfq_shipping_conf_status
  ON rfq_shipping_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_rfq_shipping_conf_created
  ON rfq_shipping_confirmations(created_at DESC);

-- ============================================================
-- RLS — internal ops only, same posture as shipping_rates writes
-- and the rest of the logistics reference data.
-- ============================================================
ALTER TABLE rfq_shipping_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "rfq_shipping_conf_admin_read"  ON rfq_shipping_confirmations;
  DROP POLICY IF EXISTS "rfq_shipping_conf_admin_write" ON rfq_shipping_confirmations;
END $$;

CREATE POLICY "rfq_shipping_conf_admin_read" ON rfq_shipping_confirmations
  FOR SELECT USING (is_admin());

CREATE POLICY "rfq_shipping_conf_admin_write" ON rfq_shipping_confirmations
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- updated_at trigger (reuse global trigger fn if present)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_rfq_shipping_conf_updated_at ON rfq_shipping_confirmations';
    EXECUTE 'CREATE TRIGGER trg_rfq_shipping_conf_updated_at BEFORE UPDATE ON rfq_shipping_confirmations
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END $$;
