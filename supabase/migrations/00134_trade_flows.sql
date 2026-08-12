-- ============================================================
-- 00134_trade_flows.sql
--
-- Admin-mediated end-to-end trade flow. One row tracks a deal from
-- "buyer sent RFQ/order" through supplier invoicing, buyer payment,
-- supplier PO + payment forwarding, loading (seaway bill), transit,
-- destination arrival + clearance, shipping payment, and final
-- document release (seaway bill + EBM). Every step transition is an
-- admin action recorded in trade_flow_events and fires buyer/supplier
-- emails, ops Telegram, and in-app notifications from application code.
-- ============================================================

CREATE TABLE IF NOT EXISTS trade_flows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_number       TEXT NOT NULL UNIQUE DEFAULT '',

  -- Origin links (no FK to purchase_orders — partitioned, composite PK)
  rfq_id            UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  purchase_order_id UUID,

  -- Parties
  buyer_user_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  buyer_company_id    UUID,
  buyer_company_name  TEXT,
  supplier_company_id UUID,
  supplier_name       TEXT,
  -- Suppliers are often off-platform; admin can set/override the email used
  -- for supplier-facing steps. Falls back to the company's primary member.
  supplier_email      TEXT,

  -- State machine
  current_step  TEXT NOT NULL DEFAULT 'started' CHECK (current_step IN (
    'started',
    'supplier_quote_requested',
    'supplier_invoice_received',
    'buyer_invoice_sent',
    'buyer_payment_received',
    'supplier_order_placed',
    'supplier_confirmed',
    'shipment_loaded',
    'arrived_transit_port',
    'arrived_destination',
    'shipping_payment_requested',
    'shipping_payment_received',
    'completed',
    'cancelled'
  )),
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,

  -- Consignment info sent to the supplier with the quote request
  consignee_company_name TEXT,
  consignee_tin          TEXT,
  consignee_phone        TEXT,
  consignee_email        TEXT,
  destination_port       TEXT,

  -- Commercial numbers (minor units, matching the rest of the schema)
  goods_summary     TEXT,
  currency          TEXT NOT NULL DEFAULT 'USD',
  goods_total       BIGINT,
  shipping_cost     BIGINT,
  grand_total       BIGINT,
  shipping_fee_due  BIGINT,   -- destination shipping/clearance charge (step 11)

  -- Payment instructions shown to the buyer
  payment_instructions          TEXT,
  shipping_payment_instructions TEXT,

  -- Shipment references
  vessel_name        TEXT,
  seaway_bill_number TEXT,
  etd                DATE,
  eta                DATE,

  notes       TEXT,
  created_by  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate sequential flow numbers: TF-2026-000001
CREATE SEQUENCE IF NOT EXISTS trade_flow_number_seq START 1;

CREATE OR REPLACE FUNCTION set_trade_flow_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.flow_number = '' OR NEW.flow_number IS NULL THEN
    NEW.flow_number := 'TF-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(nextval('trade_flow_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trade_flow_number
  BEFORE INSERT ON trade_flows
  FOR EACH ROW EXECUTE FUNCTION set_trade_flow_number();

CREATE TRIGGER trg_trade_flows_updated_at
  BEFORE UPDATE ON trade_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_trade_flows_step       ON trade_flows(current_step);
CREATE INDEX idx_trade_flows_buyer      ON trade_flows(buyer_user_id);
CREATE INDEX idx_trade_flows_rfq        ON trade_flows(rfq_id);
CREATE INDEX idx_trade_flows_po         ON trade_flows(purchase_order_id);
CREATE INDEX idx_trade_flows_created_at ON trade_flows(created_at DESC);

-- ------------------------------------------------------------
-- Step history: one row per transition, with the payload the admin
-- entered and a record of which notifications were dispatched.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_flow_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_flow_id  UUID NOT NULL REFERENCES trade_flows(id) ON DELETE CASCADE,
  from_step      TEXT,
  to_step        TEXT NOT NULL,
  actor_user_id  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  note           TEXT,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  notified       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_flow_events_flow ON trade_flow_events(trade_flow_id, created_at);

-- ------------------------------------------------------------
-- Documents: commercial invoices, payment proofs, seaway bill, EBM.
-- Files live in the existing "documents" storage bucket (via /api/upload);
-- this table stores the reference.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_flow_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_flow_id  UUID NOT NULL REFERENCES trade_flows(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN (
    'quote_request', 'supplier_invoice', 'buyer_invoice',
    'buyer_payment_proof', 'supplier_payment_proof',
    'seaway_bill', 'ebm', 'other'
  )),
  file_url    TEXT,
  file_name   TEXT,
  note        TEXT,
  uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_flow_documents_flow ON trade_flow_documents(trade_flow_id, created_at);

-- ------------------------------------------------------------
-- RLS: admins manage everything; the buyer can read their own flow
-- (timeline visibility); the supplier company can read flows assigned
-- to them. All writes go through admin API routes (service client).
-- ------------------------------------------------------------
ALTER TABLE trade_flows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_flow_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_flow_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_flows_admin_all" ON trade_flows
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "trade_flows_buyer_read" ON trade_flows
  FOR SELECT USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id IN (SELECT unnest(get_user_companies()))
  );

CREATE POLICY "trade_flows_supplier_read" ON trade_flows
  FOR SELECT USING (
    supplier_company_id IN (SELECT unnest(get_user_companies()))
  );

CREATE POLICY "trade_flow_events_admin_all" ON trade_flow_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "trade_flow_events_party_read" ON trade_flow_events
  FOR SELECT USING (
    trade_flow_id IN (
      SELECT id FROM trade_flows WHERE
        buyer_user_id = get_user_profile_id()
        OR buyer_company_id IN (SELECT unnest(get_user_companies()))
        OR supplier_company_id IN (SELECT unnest(get_user_companies()))
    )
  );

CREATE POLICY "trade_flow_documents_admin_all" ON trade_flow_documents
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Buyers only see documents explicitly released to them: the buyer invoice
-- once it has been sent, and the seaway bill + EBM only after the flow is
-- completed (final payment confirmed). Supplier payment proofs and internal
-- docs stay admin-only.
CREATE POLICY "trade_flow_documents_buyer_invoice_read" ON trade_flow_documents
  FOR SELECT USING (
    kind = 'buyer_invoice'
    AND trade_flow_id IN (
      SELECT id FROM trade_flows WHERE
        (buyer_user_id = get_user_profile_id()
         OR buyer_company_id IN (SELECT unnest(get_user_companies())))
        AND current_step IN (
          'buyer_invoice_sent','buyer_payment_received','supplier_order_placed',
          'supplier_confirmed','shipment_loaded','arrived_transit_port',
          'arrived_destination','shipping_payment_requested',
          'shipping_payment_received','completed'
        )
    )
  );

CREATE POLICY "trade_flow_documents_buyer_final_docs_read" ON trade_flow_documents
  FOR SELECT USING (
    kind IN ('seaway_bill', 'ebm')
    AND trade_flow_id IN (
      SELECT id FROM trade_flows WHERE
        (buyer_user_id = get_user_profile_id()
         OR buyer_company_id IN (SELECT unnest(get_user_companies())))
        AND current_step = 'completed'
    )
  );
