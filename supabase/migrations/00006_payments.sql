-- ============================================================
-- 00006_payments.sql — Transactions, methods, escrow, wallets
-- ============================================================

-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID,
  supplier_order_id UUID,

  gateway payment_gateway NOT NULL,
  gateway_transaction_id TEXT,

  -- Mobile money
  mobile_money_phone TEXT,
  mobile_money_provider TEXT,
  mobile_money_reference TEXT,

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- WeChat Pay
  wechat_transaction_id TEXT,
  wechat_prepay_id TEXT,

  -- Alipay
  alipay_trade_no TEXT,

  -- Amount
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  exchange_rate NUMERIC(12,6) DEFAULT 1.0,
  amount_in_usd BIGINT,

  -- Status & terms
  status payment_status DEFAULT 'pending',
  payment_terms payment_terms DEFAULT 'immediate',
  deposit_amount BIGINT,
  deposit_paid_at TIMESTAMPTZ,
  balance_due_at TIMESTAMPTZ,

  -- Raw gateway data
  raw_request JSONB,
  raw_response JSONB,
  webhook_events JSONB[] DEFAULT '{}',

  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pt_purchase_order ON payment_transactions(purchase_order_id);
CREATE INDEX idx_pt_supplier_order ON payment_transactions(supplier_order_id);
CREATE INDEX idx_pt_gateway ON payment_transactions(gateway);
CREATE INDEX idx_pt_status ON payment_transactions(status);
CREATE INDEX idx_pt_gateway_txn ON payment_transactions(gateway_transaction_id);
CREATE INDEX idx_pt_stripe_intent ON payment_transactions(stripe_payment_intent_id);


-- ============================================================
-- Payment methods (saved per company/user)
-- ============================================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES user_profiles(id),
  gateway payment_gateway NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Mobile money
  mobile_money_phone TEXT,
  mobile_money_provider TEXT,
  mobile_money_country CHAR(2),

  -- Stripe / card
  stripe_payment_method_id TEXT,
  card_last4 TEXT,
  card_brand TEXT,

  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pm_company ON payment_methods(company_id);
CREATE INDEX idx_pm_user ON payment_methods(user_id);


-- ============================================================
-- Escrow holds
-- ============================================================
CREATE TABLE escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  supplier_order_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  release_conditions JSONB,
  status escrow_status DEFAULT 'held',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eh_supplier_order ON escrow_holds(supplier_order_id);
CREATE INDEX idx_eh_status ON escrow_holds(status);


-- ============================================================
-- Platform wallets (per company per currency)
-- ============================================================
CREATE TABLE platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  currency CHAR(3) NOT NULL,
  balance BIGINT DEFAULT 0,
  held_balance BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (company_id, currency)
);

CREATE INDEX idx_pw_company ON platform_wallets(company_id);
