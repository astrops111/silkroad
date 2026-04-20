-- ============================================================
-- 00015_rfq_system.sql — Request for Quotation system
-- Full B2B RFQ workflow: buyer creates → suppliers quote → buyer accepts → converts to order
-- ============================================================

-- Enums (use DO block to handle partial prior apply)
DO $$ BEGIN
  CREATE TYPE rfq_status AS ENUM (
    'draft', 'open', 'quoted', 'awarded', 'expired', 'cancelled', 'converted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM (
    'draft', 'submitted', 'revised', 'accepted', 'rejected', 'expired', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- RFQs (buyer-created requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL,

  -- Buyer
  buyer_user_id UUID NOT NULL REFERENCES user_profiles(id),
  buyer_company_id UUID REFERENCES companies(id),
  buyer_company_name TEXT,
  buyer_country CHAR(2),

  -- Request details
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),

  -- Requirements
  target_price BIGINT,              -- buyer's budget per unit (minor units)
  target_currency CHAR(3) DEFAULT 'USD',
  quantity INT NOT NULL,
  unit TEXT DEFAULT 'pieces',       -- pieces, kg, tons, meters, etc.

  -- Delivery
  delivery_country CHAR(2),
  delivery_city TEXT,
  delivery_address TEXT,
  required_by DATE,                 -- when buyer needs the goods
  trade_term trade_term,

  -- Specifications
  specifications JSONB DEFAULT '{}', -- flexible key-value specs
  certifications_required TEXT[],    -- CE, FDA, ISO, etc.
  sample_required BOOLEAN DEFAULT false,

  -- Visibility
  is_public BOOLEAN DEFAULT true,    -- visible to all suppliers
  invited_supplier_ids UUID[],       -- specific suppliers invited (for private RFQs)
  max_quotations INT,                -- limit number of quotes (null = unlimited)

  -- Lifecycle
  status rfq_status DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,              -- quote submission deadline
  awarded_at TIMESTAMPTZ,
  awarded_quotation_id UUID,         -- which quote was accepted
  converted_order_id UUID,           -- resulting purchase_order id

  -- Matching
  matched_supplier_count INT DEFAULT 0,
  quotation_count INT DEFAULT 0,
  view_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfqs_buyer ON rfqs(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_company ON rfqs(buyer_company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_category ON rfqs(category_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON rfqs(deadline) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_rfqs_public_open ON rfqs(status, is_public, deadline) WHERE status = 'open' AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_rfqs_created ON rfqs(created_at DESC);

-- ============================================================
-- RFQ line items (for multi-product RFQs)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  unit TEXT DEFAULT 'pieces',
  target_unit_price BIGINT,         -- buyer's target price per unit
  currency CHAR(3) DEFAULT 'USD',

  specifications JSONB DEFAULT '{}',
  reference_image_url TEXT,
  hs_code TEXT,

  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON rfq_items(rfq_id);

-- ============================================================
-- RFQ attachments (specs documents, images, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,                    -- image/pdf/doc/etc.
  file_size_bytes INT,

  uploaded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_attachments_rfq ON rfq_attachments(rfq_id);

-- ============================================================
-- Quotations (supplier responses to RFQs)
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT UNIQUE NOT NULL,
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,

  -- Supplier
  supplier_id UUID NOT NULL REFERENCES companies(id),
  supplier_user_id UUID NOT NULL REFERENCES user_profiles(id),
  supplier_name TEXT,

  -- Pricing
  total_amount BIGINT NOT NULL,      -- total quoted price
  currency CHAR(3) DEFAULT 'USD',

  -- Terms
  payment_terms payment_terms DEFAULT 'immediate',
  trade_term trade_term,
  lead_time_days INT,                -- production + shipping time
  validity_days INT DEFAULT 30,      -- how long this quote is valid
  valid_until DATE,

  -- MOQ & shipping
  moq INT,
  shipping_method shipping_method,
  shipping_cost BIGINT DEFAULT 0,

  -- Details
  notes TEXT,
  terms_and_conditions TEXT,

  -- Versioning
  version INT DEFAULT 1,
  parent_quotation_id UUID REFERENCES quotations(id), -- previous version

  -- Status
  status quotation_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,

  -- Buyer feedback
  buyer_feedback TEXT,
  buyer_rating INT CHECK (buyer_rating >= 1 AND buyer_rating <= 5),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotations_rfq ON quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier ON quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_rfq_status ON quotations(rfq_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at DESC);

-- ============================================================
-- Quotation line items (maps to RFQ items)
-- ============================================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  rfq_item_id UUID REFERENCES rfq_items(id),  -- maps to the RFQ line item

  product_name TEXT NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  unit TEXT DEFAULT 'pieces',
  unit_price BIGINT NOT NULL,        -- price per unit quoted
  total_price BIGINT NOT NULL,       -- unit_price * quantity
  currency CHAR(3) DEFAULT 'USD',

  -- Product reference (if quoting an existing catalog product)
  product_id UUID REFERENCES products(id),
  variant_id UUID,

  lead_time_days INT,
  moq INT,
  specifications JSONB DEFAULT '{}',

  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

-- ============================================================
-- Quotation attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS quotation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes INT,

  uploaded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_attachments_quotation ON quotation_attachments(quotation_id);

-- ============================================================
-- RFQ activity log (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id),

  actor_user_id UUID REFERENCES user_profiles(id),
  actor_company_id UUID REFERENCES companies(id),

  action TEXT NOT NULL,              -- created, published, quoted, revised, accepted, rejected, expired, converted
  details JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_activity_rfq ON rfq_activity_log(rfq_id, created_at DESC);

-- ============================================================
-- Auto-update quotation_count on rfqs when quotation submitted
-- ============================================================
CREATE OR REPLACE FUNCTION update_rfq_quotation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND (OLD IS NULL OR OLD.status != 'submitted') THEN
    UPDATE rfqs
    SET quotation_count = (
      SELECT COUNT(*) FROM quotations WHERE rfq_id = NEW.rfq_id AND status IN ('submitted', 'revised')
    ),
    status = CASE WHEN status = 'open' THEN 'quoted' ELSE status END,
    updated_at = now()
    WHERE id = NEW.rfq_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotation_submitted ON quotations;
CREATE TRIGGER trg_quotation_submitted
AFTER INSERT OR UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_rfq_quotation_count();

-- ============================================================
-- Auto-expire RFQs past deadline (called by pg_cron)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_overdue_rfqs()
RETURNS void AS $$
BEGIN
  UPDATE rfqs
  SET status = 'expired', updated_at = now()
  WHERE status IN ('open', 'quoted')
    AND deadline < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS policies (drop existing to handle partial prior apply)
-- ============================================================
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can view public open RFQs" ON rfqs;
  DROP POLICY IF EXISTS "Buyer manages own RFQs" ON rfqs;
  DROP POLICY IF EXISTS "RFQ items follow RFQ access" ON rfq_items;
  DROP POLICY IF EXISTS "RFQ attachments follow RFQ access" ON rfq_attachments;
  DROP POLICY IF EXISTS "Quotation access" ON quotations;
  DROP POLICY IF EXISTS "Supplier manages own quotations" ON quotations;
  DROP POLICY IF EXISTS "Quotation items access" ON quotation_items;
  DROP POLICY IF EXISTS "Quotation attachments access" ON quotation_attachments;
  DROP POLICY IF EXISTS "RFQ activity log access" ON rfq_activity_log;
  DROP POLICY IF EXISTS "Admin manages activity log" ON rfq_activity_log;
END $$;

ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_activity_log ENABLE ROW LEVEL SECURITY;

-- Public open RFQs visible to all authenticated users
CREATE POLICY "Anyone can view public open RFQs" ON rfqs
  FOR SELECT USING (
    (is_public = true AND status IN ('open', 'quoted'))
    OR buyer_user_id = get_user_profile_id()
    OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

-- Buyer manages own RFQs
CREATE POLICY "Buyer manages own RFQs" ON rfqs
  FOR ALL USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

-- RFQ items follow RFQ access
CREATE POLICY "RFQ items follow RFQ access" ON rfq_items
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted'))
      OR is_admin()
    )
  );

-- RFQ attachments follow RFQ access
CREATE POLICY "RFQ attachments follow RFQ access" ON rfq_attachments
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted'))
      OR is_admin()
    )
  );

-- Suppliers see quotations they submitted; buyers see quotations on their RFQs
CREATE POLICY "Quotation access" ON quotations
  FOR SELECT USING (
    supplier_id IN (SELECT unnest(get_user_companies()))
    OR rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    )
    OR is_admin()
  );

-- Suppliers manage own quotations
CREATE POLICY "Supplier manages own quotations" ON quotations
  FOR ALL USING (
    supplier_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

-- Quotation items follow quotation access
CREATE POLICY "Quotation items access" ON quotation_items
  FOR ALL USING (
    quotation_id IN (SELECT id FROM quotations WHERE
      supplier_id IN (SELECT unnest(get_user_companies()))
      OR rfq_id IN (SELECT id FROM rfqs WHERE
        buyer_user_id = get_user_profile_id()
        OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      )
      OR is_admin()
    )
  );

-- Quotation attachments follow quotation access
CREATE POLICY "Quotation attachments access" ON quotation_attachments
  FOR ALL USING (
    quotation_id IN (SELECT id FROM quotations WHERE
      supplier_id IN (SELECT unnest(get_user_companies()))
      OR rfq_id IN (SELECT id FROM rfqs WHERE
        buyer_user_id = get_user_profile_id()
        OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      )
      OR is_admin()
    )
  );

-- Activity log: visible to involved parties
CREATE POLICY "RFQ activity log access" ON rfq_activity_log
  FOR SELECT USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    )
    OR actor_company_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

CREATE POLICY "Admin manages activity log" ON rfq_activity_log
  FOR ALL USING (is_admin());
