-- ============================================================
-- 00010_settlements.sql — Supplier settlements & commission rules
-- ============================================================

-- Settlements (supplier payouts)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES companies(id),
  settlement_number TEXT UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Financials (BIGINT, minor units)
  gross_sales BIGINT NOT NULL,
  total_commission BIGINT NOT NULL,
  total_tax_on_commission BIGINT DEFAULT 0,
  logistics_charges BIGINT DEFAULT 0,
  net_payout BIGINT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',

  -- Status
  status settlement_status DEFAULT 'pending',

  -- Payout details
  payout_method TEXT,
  payout_reference TEXT,
  mobile_money_phone TEXT,
  mobile_money_provider TEXT,
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Related orders
  supplier_order_ids UUID[] DEFAULT '{}',
  line_items JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_settlements_supplier ON settlements(supplier_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);


-- ============================================================
-- Commission rules (per-supplier / per-category overrides)
-- ============================================================
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES companies(id),
  category_id UUID,
  rate NUMERIC(5,4) NOT NULL,
  min_fee BIGINT DEFAULT 0,
  max_fee BIGINT,
  currency CHAR(3) DEFAULT 'USD',
  market_region market_region,
  country_code CHAR(2),
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_commission_rules_supplier ON commission_rules(supplier_id);
CREATE INDEX idx_commission_rules_category ON commission_rules(category_id);
CREATE INDEX idx_commission_rules_region ON commission_rules(market_region);
