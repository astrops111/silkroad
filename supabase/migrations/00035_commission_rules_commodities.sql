-- ============================================================
-- 00035_commission_rules.sql — Admin-configurable commission engine
-- Covers: per-country, per-category, per-trade-direction rates
-- ============================================================

-- Commission rules (replaces hardcoded percentages)
CREATE TABLE IF NOT EXISTS commission_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,

  -- Scope — null means "applies to all"
  trade_direction TEXT CHECK (trade_direction IN ('cn_to_af', 'af_to_cn', NULL)),
  country_code    CHAR(2),        -- ISO 3166-1 alpha-2 e.g. 'GH', 'RW'
  category_slug   TEXT,           -- e.g. 'electronics', 'coffee', 'minerals'

  -- Rate (applied in order: most specific wins)
  rate_percent     NUMERIC(5,4) NOT NULL DEFAULT 0.05, -- 5% default
  flat_fee_usd     NUMERIC(10,2) NOT NULL DEFAULT 0,    -- additional flat fee

  -- Caps
  min_fee_usd      NUMERIC(10,2),  -- minimum commission charge
  max_fee_usd      NUMERIC(10,2),  -- cap on commission

  -- Status
  active           BOOLEAN NOT NULL DEFAULT true,
  priority         INTEGER NOT NULL DEFAULT 0, -- higher = evaluated first

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commission_rules IS
  'Admin-configurable commission rates. Most specific matching rule wins (highest priority).';

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules (is_active, priority DESC);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_commission_rules_direction ON commission_rules (trade_direction, country_code, category_slug);
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Commodities table (Africa → China trade direction)
CREATE TABLE IF NOT EXISTS commodities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by         UUID REFERENCES auth.users(id),

  -- Identity
  name_en            TEXT NOT NULL,
  name_zh            TEXT,
  name_fr            TEXT,
  slug               TEXT UNIQUE,

  -- Classification
  category           TEXT NOT NULL, -- coffee | tea | cocoa | sesame | minerals | timber | spices | other
  subcategory        TEXT,
  hs_code            TEXT,           -- Chinese customs HS code

  -- Origin
  origin_country     CHAR(2) NOT NULL, -- ISO country code
  origin_region      TEXT,             -- e.g. 'Kigali Western Province'
  farm_name          TEXT,
  cooperative_name   TEXT,

  -- Quality / Specs
  grade              TEXT,             -- e.g. 'AA', 'AB', 'Grade 1'
  variety            TEXT,             -- e.g. 'Arabica', 'Robusta', 'Assam'
  moisture_pct       NUMERIC(5,2),
  cupping_score      NUMERIC(5,2),     -- for coffee: 0-100 SCA score
  screen_size        TEXT,
  processing_method  TEXT,             -- e.g. 'washed', 'natural', 'honey'
  altitude_masl      INTEGER,          -- metres above sea level

  -- Certifications
  certifications     TEXT[] DEFAULT '{}', -- 'organic' | 'fair_trade' | 'rainforest' | 'utz' | 'halal'
  cert_expiry        DATE,
  is_zero_tariff_eligible BOOLEAN DEFAULT TRUE, -- China zero-tariff 2026

  -- Pricing
  price_usd_per_kg   NUMERIC(10,4) NOT NULL,
  min_order_kg       NUMERIC(10,2) NOT NULL DEFAULT 100,
  max_order_kg       NUMERIC(10,2),
  currency           CHAR(3) NOT NULL DEFAULT 'USD',

  -- Availability
  harvest_season_start DATE,
  harvest_season_end   DATE,
  stock_kg             NUMERIC(10,2),
  lead_time_days       INTEGER DEFAULT 14,
  next_harvest_date    DATE,

  -- Media
  images             TEXT[] DEFAULT '{}',
  lab_reports        TEXT[] DEFAULT '{}',  -- Supabase Storage paths
  farm_photos        TEXT[] DEFAULT '{}',

  -- Compliance docs
  phytosanitary_template  TEXT,   -- pre-filled template path
  export_license_number   TEXT,

  -- Status
  status             moderation_status NOT NULL DEFAULT 'pending',
  is_featured        BOOLEAN DEFAULT FALSE,
  view_count         INTEGER DEFAULT 0,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commodities IS
  'African agricultural commodities and natural resources listed for export to China.';

CREATE INDEX IF NOT EXISTS idx_commodities_tenant    ON commodities (tenant_id);
CREATE INDEX IF NOT EXISTS idx_commodities_category  ON commodities (category, status);
CREATE INDEX IF NOT EXISTS idx_commodities_country   ON commodities (origin_country, status);
CREATE INDEX IF NOT EXISTS idx_commodities_status    ON commodities (status, is_featured);

-- Full text search (multilingual)
ALTER TABLE commodities ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name_en,'') || ' ' ||
                           coalesce(category,'') || ' ' ||
                           coalesce(origin_region,'') || ' ' ||
                           coalesce(variety,'') || ' ' ||
                           coalesce(grade,''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_commodities_fts ON commodities USING GIN (fts);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_commodities_updated_at ON commodities;
CREATE TRIGGER trg_commodities_updated_at
  BEFORE UPDATE ON commodities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_commission_rules_updated_at ON commission_rules;
CREATE TRIGGER trg_commission_rules_updated_at
  BEFORE UPDATE ON commission_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

-- Commodities: anyone can read approved listings
DROP POLICY IF EXISTS "commodities_public_read" ON commodities;
CREATE POLICY "commodities_public_read" ON commodities
  FOR SELECT USING (status = 'approved');

-- Commodities: seller sees their own (any status)
DROP POLICY IF EXISTS "commodities_seller_own" ON commodities;
CREATE POLICY "commodities_seller_own" ON commodities
  FOR ALL USING (
    tenant_id IN (SELECT unnest(get_user_companies()))
  );

-- Commodities: admin sees all
DROP POLICY IF EXISTS "commodities_admin_all" ON commodities;
CREATE POLICY "commodities_admin_all" ON commodities
  FOR ALL USING (is_admin());

-- Commission rules: only admin can read/write
DROP POLICY IF EXISTS "commission_admin_only" ON commission_rules;
CREATE POLICY "commission_admin_only" ON commission_rules
  FOR ALL USING (is_admin());

-- ── Seed default commission rules (safe — skips if columns differ) ──────────
DO $$ BEGIN
  INSERT INTO commission_rules (name, description, trade_direction, rate_percent, flat_fee_usd, priority) VALUES
    ('Default China→Africa', 'Base 5% commission for all China to Africa orders', 'cn_to_af', 0.05, 0, 0),
    ('Default Africa→China', 'Base 4% commission for all Africa to China commodity exports', 'af_to_cn', 0.04, 0, 0),
    ('Africa→China Minerals', 'Higher margin on mineral exports due to compliance costs', 'af_to_cn', 0.045, 50, 10)
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
