-- ============================================================
-- 00016_reviews.sql — Reviews & ratings system
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL,
  reviewer_user_id UUID NOT NULL REFERENCES user_profiles(id),
  reviewer_company_id UUID NOT NULL REFERENCES companies(id),
  supplier_company_id UUID NOT NULL REFERENCES companies(id),

  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[] DEFAULT '{}',

  -- Quality dimensions
  product_quality_rating INT CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  shipping_rating INT CHECK (shipping_rating >= 1 AND shipping_rating <= 5),

  is_verified_purchase BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,

  -- Supplier response
  supplier_response TEXT,
  supplier_responded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_supplier ON reviews(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(supplier_order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_order ON reviews(supplier_order_id, reviewer_user_id);
