-- ============================================================
-- 00004_products.sql — Categories, products & related tables
-- ============================================================

-- -----------------------------------------------------------
-- Categories (hierarchical)
-- -----------------------------------------------------------
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  name_local TEXT,
  slug TEXT UNIQUE NOT NULL,
  level INT DEFAULT 0,
  path TEXT,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_level ON categories(level);

-- -----------------------------------------------------------
-- Products
-- -----------------------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES companies(id),
  category_id UUID REFERENCES categories(id),

  name TEXT NOT NULL,
  name_local TEXT,
  slug TEXT NOT NULL,
  description TEXT,

  -- Pricing (all money in minor units as BIGINT)
  base_price BIGINT NOT NULL,
  compare_price BIGINT,
  currency CHAR(3) DEFAULT 'USD',

  -- Order constraints
  moq INT DEFAULT 1,
  lead_time_days INT,
  trade_term trade_term DEFAULT 'fob',

  -- Samples
  sample_available BOOLEAN DEFAULT false,
  sample_price BIGINT,
  sample_moq INT DEFAULT 1,

  -- Moderation
  moderation_status moderation_status DEFAULT 'pending',
  moderated_at TIMESTAMPTZ,
  moderated_by UUID,

  -- Logistics
  weight_kg NUMERIC(10,2),
  dimensions_cm JSONB,
  hs_code TEXT,
  origin_country CHAR(2),

  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Full-text search
  search_vector tsvector,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_moderation ON products(moderation_status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active_created ON products(is_active, created_at);
CREATE INDEX idx_products_search ON products USING GIN (search_vector);

-- -----------------------------------------------------------
-- Product variants (size, colour, etc.)
-- -----------------------------------------------------------
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  price_override BIGINT,
  stock_quantity INT DEFAULT 0,
  weight_kg NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- -----------------------------------------------------------
-- Product pricing tiers (volume discounts)
-- -----------------------------------------------------------
CREATE TABLE product_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL,
  max_quantity INT,
  unit_price BIGINT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_pricing_tiers_product ON product_pricing_tiers(product_id);

-- -----------------------------------------------------------
-- Product certifications
-- -----------------------------------------------------------
CREATE TABLE product_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  cert_number TEXT,
  document_url TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_certifications_product ON product_certifications(product_id);

-- -----------------------------------------------------------
-- Product images
-- -----------------------------------------------------------
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
