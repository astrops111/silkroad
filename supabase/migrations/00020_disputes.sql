-- ============================================================
-- 00017_disputes.sql — Dispute resolution system
-- ============================================================

CREATE TYPE dispute_type AS ENUM (
  'product_quality', 'wrong_item', 'not_delivered', 'damaged',
  'quantity_mismatch', 'late_delivery', 'fraud', 'other'
);

CREATE TYPE dispute_status AS ENUM (
  'open', 'under_review', 'awaiting_evidence', 'resolved', 'escalated', 'closed'
);

CREATE TYPE dispute_resolution AS ENUM (
  'full_pay_supplier', 'partial_refund_buyer', 'full_refund_buyer', 'replacement', 'dismissed'
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL,
  purchase_order_id UUID,

  -- Parties
  opened_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
  opened_by_company_id UUID NOT NULL REFERENCES companies(id),
  supplier_company_id UUID NOT NULL REFERENCES companies(id),

  -- Details
  type dispute_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',

  -- Status & resolution
  status dispute_status DEFAULT 'open',
  resolution dispute_resolution,
  resolution_note TEXT,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Financial impact
  disputed_amount BIGINT,
  refund_amount BIGINT,
  currency CHAR(3) DEFAULT 'USD',

  -- Settlement blocking
  blocks_settlement BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_supplier_order ON disputes(supplier_order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by_company_id);
CREATE INDEX IF NOT EXISTS idx_disputes_supplier ON disputes(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
