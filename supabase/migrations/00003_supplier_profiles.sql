-- ============================================================
-- 00003_supplier_profiles.sql — Supplier-specific profile data
-- ============================================================

CREATE TABLE supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Business documents
  business_license_url TEXT,

  -- Factory location
  factory_address TEXT,
  factory_city TEXT,
  factory_country CHAR(2) DEFAULT 'TW',

  -- Warehouse addresses (array of address objects)
  warehouse_addresses JSONB DEFAULT '[]',

  -- Trade defaults
  moq_default INT,
  lead_time_days_default INT,
  trade_terms_default trade_term DEFAULT 'fob',

  -- Product categories the supplier operates in
  categories UUID[] DEFAULT '{}',

  -- Certifications held (e.g. ISO9001, HACCP)
  certifications TEXT[] DEFAULT '{}',

  -- Cached performance metrics
  response_rate NUMERIC(5,2),
  on_time_delivery_rate NUMERIC(5,2),
  average_rating NUMERIC(3,2),
  total_orders INT DEFAULT 0,
  total_revenue BIGINT DEFAULT 0,

  -- Subscription tier
  tier supplier_tier DEFAULT 'free',
  tier_expires_at TIMESTAMPTZ,

  -- Commission (null = platform default)
  commission_rate NUMERIC(5,4),

  -- Bank payout info
  bank_code TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_branch TEXT,

  -- Mobile money payout
  mobile_money_number TEXT,
  mobile_money_provider TEXT,

  -- Stripe Connect
  stripe_account_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_supplier_profiles_company ON supplier_profiles(company_id);
CREATE INDEX idx_supplier_profiles_tier ON supplier_profiles(tier);
