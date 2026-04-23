-- ============================================================
-- 00052_logistics_landed_cost.sql — Phase 1 logistics cost engine
-- Internal-only module: ports, freight lanes, tariff rates,
-- and cost_components JSONB on quotations + purchase_orders.
-- ============================================================

-- ============================================================
-- Enums
-- ============================================================

-- Container / shipment unit for freight pricing
DO $$ BEGIN
  CREATE TYPE container_type AS ENUM (
    'lcl',          -- less-than-container load (per CBM)
    'fcl_20',       -- 20ft full container
    'fcl_40',       -- 40ft full container
    'fcl_40hc',     -- 40ft high-cube
    'fcl_45',       -- 45ft full container
    'air_express',  -- air courier (DHL/FedEx tier)
    'air_freight'   -- airline cargo (per kg, chargeable weight)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Port type
DO $$ BEGIN
  CREATE TYPE port_type AS ENUM (
    'sea', 'air', 'inland', 'rail'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Where a rate / tariff entry came from
DO $$ BEGIN
  CREATE TYPE rate_source AS ENUM (
    'manual_forwarder',  -- ops typed in from a forwarder quote
    'carrier_api',       -- pulled from a carrier / aggregator API
    'rate_card',         -- ops-maintained rate card
    'tariff_db',         -- ops-maintained tariff table
    'tariff_api'         -- third-party tariff provider (Zonos / Avalara / Eurora)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Ports — first-class, supports both Asian origins and African destinations
-- ============================================================
CREATE TABLE IF NOT EXISTS ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,        -- UN/LOCODE preferred (e.g. CNSHA, KEMBA, NGAPP)
  name TEXT NOT NULL,
  country CHAR(2) NOT NULL,
  city TEXT,
  port_type port_type NOT NULL DEFAULT 'sea',
  region market_region,             -- for grouping (cn, africa_east, etc.)
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  is_origin BOOLEAN DEFAULT false,  -- typically used as origin (Asia)
  is_destination BOOLEAN DEFAULT false, -- typically used as destination (Africa)
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ports_country ON ports(country);
CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(port_type);
CREATE INDEX IF NOT EXISTS idx_ports_origin ON ports(is_origin) WHERE is_origin = true;
CREATE INDEX IF NOT EXISTS idx_ports_destination ON ports(is_destination) WHERE is_destination = true;
CREATE INDEX IF NOT EXISTS idx_ports_active ON ports(is_active) WHERE is_active = true;

-- ============================================================
-- Freight lanes — origin↔destination pricing for one method/container.
-- A lane can be port-specific (origin_port_id + destination_port_id)
-- OR country-default (origin_country + destination_country with NULL ports).
-- The engine prefers the most specific match.
-- ============================================================
CREATE TABLE IF NOT EXISTS freight_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origin: prefer port; fall back to country-default
  origin_port_id UUID REFERENCES ports(id),
  origin_country CHAR(2),

  -- Destination: prefer port; fall back to country-default
  destination_port_id UUID REFERENCES ports(id),
  destination_country CHAR(2),

  shipping_method shipping_method NOT NULL,
  container_type container_type NOT NULL,

  -- Pricing (BIGINT minor units in `currency`)
  base_rate BIGINT DEFAULT 0,             -- flat base
  per_container_rate BIGINT DEFAULT 0,    -- for FCL
  per_cbm_rate BIGINT DEFAULT 0,          -- for LCL / sea
  per_kg_rate BIGINT DEFAULT 0,           -- for air
  min_charge BIGINT DEFAULT 0,
  fuel_surcharge_pct NUMERIC(5,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',

  -- Transit
  transit_days_min INT,
  transit_days_max INT,
  consolidation_days INT DEFAULT 0,       -- LCL groupage wait

  -- Provenance & freshness
  source rate_source NOT NULL DEFAULT 'manual_forwarder',
  provider TEXT,                          -- forwarder/carrier name or API id
  external_ref TEXT,                      -- API quote id, RFQ ref, etc.
  valid_from DATE,
  valid_to DATE,

  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- At least one side must be specified on each end
  CONSTRAINT freight_lanes_origin_specified
    CHECK (origin_port_id IS NOT NULL OR origin_country IS NOT NULL),
  CONSTRAINT freight_lanes_destination_specified
    CHECK (destination_port_id IS NOT NULL OR destination_country IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_lanes_origin_port ON freight_lanes(origin_port_id);
CREATE INDEX IF NOT EXISTS idx_lanes_dest_port ON freight_lanes(destination_port_id);
CREATE INDEX IF NOT EXISTS idx_lanes_origin_country ON freight_lanes(origin_country);
CREATE INDEX IF NOT EXISTS idx_lanes_dest_country ON freight_lanes(destination_country);
CREATE INDEX IF NOT EXISTS idx_lanes_method ON freight_lanes(shipping_method);
CREATE INDEX IF NOT EXISTS idx_lanes_container ON freight_lanes(container_type);
CREATE INDEX IF NOT EXISTS idx_lanes_active_validity ON freight_lanes(is_active, valid_from, valid_to)
  WHERE is_active = true;
-- Common engine lookup path:
CREATE INDEX IF NOT EXISTS idx_lanes_lookup ON freight_lanes(
  origin_country, destination_country, shipping_method, container_type
) WHERE is_active = true;

-- ============================================================
-- Tariff rates — duty + VAT + other fees by HS prefix × destination country.
-- HS prefix matched longest-first: '8517.13' beats '8517' beats '85'.
-- ============================================================
CREATE TABLE IF NOT EXISTS tariff_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_prefix TEXT NOT NULL,            -- 2/4/6/8/10-digit prefix
  destination_country CHAR(2) NOT NULL,

  duty_pct NUMERIC(6,3) DEFAULT 0,    -- import duty %
  vat_pct NUMERIC(6,3) DEFAULT 0,     -- VAT / GST %
  excise_pct NUMERIC(6,3) DEFAULT 0,  -- excise / luxury tax
  other_fees JSONB DEFAULT '{}',      -- e.g. {"idf_pct":2.5,"rdl_pct":2.0}

  -- Optional preferential rates (e.g. AfCFTA, China-Africa FTA carve-outs)
  preferential_rate_pct NUMERIC(6,3),
  preferential_origin_countries CHAR(2)[],

  notes TEXT,
  source rate_source NOT NULL DEFAULT 'tariff_db',
  provider TEXT,
  effective_from DATE,
  effective_to DATE,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (hs_prefix, destination_country, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_tariff_country_prefix ON tariff_rates(destination_country, hs_prefix)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tariff_prefix ON tariff_rates(hs_prefix);
CREATE INDEX IF NOT EXISTS idx_tariff_active_validity ON tariff_rates(is_active, effective_from, effective_to)
  WHERE is_active = true;

-- ============================================================
-- cost_components on quotations + purchase_orders
-- Holds the structured landed-cost breakdown emitted by the engine.
-- Shape (TS-mirrored): {
--   currency, goods, first_mile, main_leg, insurance, duty, vat, other_fees,
--   last_mile, handling, subtotal_landed, markup, total,
--   incoterm, container, lane_id, tariff_refs[], computed_at, source
-- }
-- ============================================================
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS cost_components JSONB;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS cost_components JSONB;

-- ============================================================
-- Ops-originated freight quotes (NOT tied to a buyer RFQ).
-- Used when ops fields a forwarder / walk-in / phone / WeChat
-- request directly, runs the cost engine, and sends a quote out.
-- Same `cost_components` shape as quotations / purchase_orders so
-- the engine output is interchangeable across all three.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE ops_quote_status AS ENUM (
    'draft', 'quoted', 'sent', 'accepted', 'declined', 'expired', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ops_quote_requester_type AS ENUM (
    'forwarder',     -- partner forwarder asking for a sub-quote
    'walk_in',       -- direct walk-in / phone / WeChat inquiry
    'partner',       -- existing partner / repeat customer (off-platform)
    'internal',      -- internal proactive / market test
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ops_freight_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,

  -- Ownership
  created_by_user_id UUID REFERENCES user_profiles(id),
  assigned_to_user_id UUID REFERENCES user_profiles(id),

  -- Requester (free-form, not a platform user)
  requester_type ops_quote_requester_type NOT NULL DEFAULT 'walk_in',
  requester_name TEXT,
  requester_company TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  requester_country CHAR(2),
  source_channel TEXT,                 -- 'wechat' | 'whatsapp' | 'email' | 'phone' | 'in_person' | etc.
  source_reference TEXT,               -- inbound message id / thread / ticket

  -- Cargo
  cargo_description TEXT,
  hs_codes TEXT[],
  total_weight_kg NUMERIC(10,2),
  total_volume_cbm NUMERIC(10,4),
  package_count INT,
  is_fragile BOOLEAN DEFAULT false,
  requires_cold_chain BOOLEAN DEFAULT false,
  is_hazardous BOOLEAN DEFAULT false,

  -- Goods value (for insurance + duty base)
  goods_value BIGINT,
  goods_currency CHAR(3) DEFAULT 'USD',

  -- Routing
  origin_port_id UUID REFERENCES ports(id),
  origin_country CHAR(2),
  destination_port_id UUID REFERENCES ports(id),
  destination_country CHAR(2),
  shipping_method shipping_method,
  container_type container_type,
  trade_term trade_term,

  -- Timing
  cargo_ready_date DATE,
  required_by DATE,

  -- Engine output + commitment
  cost_components JSONB,               -- structured breakdown from quoteLandedCost()
  quoted_amount BIGINT,                -- the final number sent to requester
  quoted_currency CHAR(3) DEFAULT 'USD',
  valid_until DATE,

  -- Lifecycle
  status ops_quote_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  outcome_notes TEXT,

  -- Conversion (if it eventually became a real shipment / order)
  converted_purchase_order_id UUID,
  converted_shipment_id UUID,

  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_quotes_status ON ops_freight_quotes(status);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_assigned ON ops_freight_quotes(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_created_by ON ops_freight_quotes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_requester_type ON ops_freight_quotes(requester_type);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_routing ON ops_freight_quotes(origin_country, destination_country);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_created ON ops_freight_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_quotes_valid_until ON ops_freight_quotes(valid_until)
  WHERE status IN ('quoted', 'sent');

ALTER TABLE ops_freight_quotes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "ops_freight_quotes internal read" ON ops_freight_quotes;
  DROP POLICY IF EXISTS "ops_freight_quotes internal write" ON ops_freight_quotes;
END $$;

CREATE POLICY "ops_freight_quotes internal read" ON ops_freight_quotes
  FOR SELECT USING (is_admin());
CREATE POLICY "ops_freight_quotes internal write" ON ops_freight_quotes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- updated_at triggers (reuse global trigger fn if present)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_ports_updated_at ON ports';
    EXECUTE 'CREATE TRIGGER trg_ports_updated_at BEFORE UPDATE ON ports
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_freight_lanes_updated_at ON freight_lanes';
    EXECUTE 'CREATE TRIGGER trg_freight_lanes_updated_at BEFORE UPDATE ON freight_lanes
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_tariff_rates_updated_at ON tariff_rates';
    EXECUTE 'CREATE TRIGGER trg_tariff_rates_updated_at BEFORE UPDATE ON tariff_rates
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_ops_freight_quotes_updated_at ON ops_freight_quotes';
    EXECUTE 'CREATE TRIGGER trg_ops_freight_quotes_updated_at BEFORE UPDATE ON ops_freight_quotes
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END $$;

-- ============================================================
-- RLS — internal-only: admin role gates all access (ops works via admin).
-- The is_logistics() role is for logistics-partner staff (dispatch/drivers),
-- not the internal Silk Road ops team — keep it out of these policies.
-- ============================================================
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_rates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "ports internal read" ON ports;
  DROP POLICY IF EXISTS "ports internal write" ON ports;
  DROP POLICY IF EXISTS "freight_lanes internal read" ON freight_lanes;
  DROP POLICY IF EXISTS "freight_lanes internal write" ON freight_lanes;
  DROP POLICY IF EXISTS "tariff_rates internal read" ON tariff_rates;
  DROP POLICY IF EXISTS "tariff_rates internal write" ON tariff_rates;
END $$;

CREATE POLICY "ports internal read" ON ports
  FOR SELECT USING (is_admin());
CREATE POLICY "ports internal write" ON ports
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "freight_lanes internal read" ON freight_lanes
  FOR SELECT USING (is_admin());
CREATE POLICY "freight_lanes internal write" ON freight_lanes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "tariff_rates internal read" ON tariff_rates
  FOR SELECT USING (is_admin());
CREATE POLICY "tariff_rates internal write" ON tariff_rates
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- Seed: a small, realistic starter set of ports.
-- Ops will extend; this is just enough for the engine to be testable.
-- ============================================================
INSERT INTO ports (code, name, country, city, port_type, region, is_origin, is_destination) VALUES
  -- Asian origins
  ('CNSHA', 'Shanghai',         'CN', 'Shanghai',  'sea', 'cn',           true,  false),
  ('CNNGB', 'Ningbo-Zhoushan',  'CN', 'Ningbo',    'sea', 'cn',           true,  false),
  ('CNSZN', 'Shenzhen',         'CN', 'Shenzhen',  'sea', 'cn',           true,  false),
  ('CNTAO', 'Qingdao',          'CN', 'Qingdao',   'sea', 'cn',           true,  false),
  ('CNXMN', 'Xiamen',           'CN', 'Xiamen',    'sea', 'cn',           true,  false),
  ('CNTXG', 'Tianjin',          'CN', 'Tianjin',   'sea', 'cn',           true,  false),
  ('VNSGN', 'Ho Chi Minh City', 'VN', 'HCMC',      'sea', 'global',       true,  false),
  ('THLCH', 'Laem Chabang',     'TH', 'Chonburi',  'sea', 'global',       true,  false),
  ('KRPUS', 'Busan',            'KR', 'Busan',     'sea', 'global',       true,  false),
  ('JPYOK', 'Yokohama',         'JP', 'Yokohama',  'sea', 'global',       true,  false),
  -- African destinations
  ('KEMBA', 'Mombasa',          'KE', 'Mombasa',   'sea', 'africa_east',  false, true),
  ('TZDAR', 'Dar es Salaam',    'TZ', 'Dar es Salaam','sea','africa_east',false, true),
  ('NGAPP', 'Apapa (Lagos)',    'NG', 'Lagos',     'sea', 'africa_west',  false, true),
  ('GHTKD', 'Tema',             'GH', 'Tema',      'sea', 'africa_west',  false, true),
  ('CIABJ', 'Abidjan',          'CI', 'Abidjan',   'sea', 'africa_west',  false, true),
  ('ZADUR', 'Durban',           'ZA', 'Durban',    'sea', 'africa_south', false, true),
  ('DJJIB', 'Djibouti',         'DJ', 'Djibouti',  'sea', 'africa_east',  false, true),
  ('MACAS', 'Casablanca',       'MA', 'Casablanca','sea', 'africa_north', false, true),
  ('EGALY', 'Alexandria',       'EG', 'Alexandria','sea', 'africa_north', false, true),
  -- Major air gateways (key origins/destinations for air freight)
  ('CNPVG', 'Shanghai Pudong',  'CN', 'Shanghai',  'air', 'cn',           true,  false),
  ('CNCAN', 'Guangzhou Baiyun', 'CN', 'Guangzhou', 'air', 'cn',           true,  false),
  ('HKHKG', 'Hong Kong',        'HK', 'Hong Kong', 'air', 'cn',           true,  false),
  ('KENBO', 'Nairobi JKIA',     'KE', 'Nairobi',   'air', 'africa_east',  false, true),
  ('NGLOS', 'Lagos Murtala',    'NG', 'Lagos',     'air', 'africa_west',  false, true),
  ('ZAJNB', 'Johannesburg OR Tambo','ZA','Johannesburg','air','africa_south',false,true)
ON CONFLICT (code) DO NOTHING;
