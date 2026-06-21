-- Buyer-submitted quote requests
-- Two-step B2B flow:
--   Step 1: buyer submits cart → quote_request (status: submitted)
--   Step 2: platform calculates full landed cost → quote_request (status: ready)
--           buyer accepts → purchase_order created → payment page

CREATE TABLE buyer_quote_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number           TEXT UNIQUE NOT NULL DEFAULT '',

  -- Buyer identity
  buyer_user_id          UUID NOT NULL REFERENCES user_profiles(id),
  buyer_company_name     TEXT,
  buyer_tax_id           TEXT,

  -- Cart snapshot (array of cart items as sent by frontend)
  items                  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Shipping destination
  destination_country    TEXT NOT NULL,
  destination_port_code  TEXT,   -- UN/LOCODE e.g. NGLOS, KEMBA
  destination_city       TEXT,

  -- Shipping preferences
  shipping_mode          TEXT NOT NULL DEFAULT 'lcl'
                           CHECK (shipping_mode IN ('lcl','fcl_20','fcl_40','fcl_40hc','air_express','air_freight')),
  incoterms              TEXT NOT NULL DEFAULT 'ddp'
                           CHECK (incoterms IN ('exw','fob','cif','cpt','dap','ddp','fca')),
  cargo_ready_date       DATE,
  buyer_notes            TEXT,

  -- Lifecycle status
  status                 TEXT NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted','calculating','ready','accepted','paid','expired','cancelled')),

  -- Cost breakdown (populated by engine or admin review)
  cost_components        JSONB,          -- full engine output (CostBreakdown shape)
  product_subtotal       BIGINT,         -- goods value only, minor units
  shipping_cost          BIGINT,         -- main leg + surcharges
  customs_duties         BIGINT,         -- duty + VAT + excise
  platform_fee           BIGINT,         -- markup amount
  total_amount           BIGINT,         -- grand total buyer pays
  currency               TEXT NOT NULL DEFAULT 'USD',

  -- Logistics metadata (from engine or admin)
  origin_country         TEXT,
  origin_port_code       TEXT,
  estimated_transit_days INT,

  -- Admin
  admin_notes            TEXT,

  -- Quote validity
  expires_at             TIMESTAMPTZ,

  -- Link to purchase_order once buyer accepts
  purchase_order_id      UUID,   -- no FK: purchase_orders is partitioned

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate sequential quote numbers: BQ-2026-000001
CREATE SEQUENCE IF NOT EXISTS buyer_quote_number_seq START 1;

CREATE OR REPLACE FUNCTION set_buyer_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quote_number = '' OR NEW.quote_number IS NULL THEN
    NEW.quote_number := 'BQ-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                        LPAD(nextval('buyer_quote_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_buyer_quote_number
  BEFORE INSERT ON buyer_quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_buyer_quote_number();

CREATE TRIGGER trg_buyer_quote_requests_updated_at
  BEFORE UPDATE ON buyer_quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_bqr_buyer_user_id ON buyer_quote_requests(buyer_user_id);
CREATE INDEX idx_bqr_status        ON buyer_quote_requests(status);
CREATE INDEX idx_bqr_created_at    ON buyer_quote_requests(created_at DESC);

-- RLS: buyers see their own; admins/ops see all
ALTER TABLE buyer_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bqr_buyer_own" ON buyer_quote_requests
  FOR ALL USING (
    buyer_user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  );

CREATE POLICY "bqr_admin_all" ON buyer_quote_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_id = auth.uid()
        AND platform_role IN ('admin','ops','finance','logistics')
    )
  );
