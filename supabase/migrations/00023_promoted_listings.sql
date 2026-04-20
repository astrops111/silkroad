-- ============================================================
-- 00020_promoted_listings.sql — Promoted product listings & ad slots
-- ============================================================

-- Promoted listings — time-limited product promotions
CREATE TABLE promoted_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES companies(id),

  -- Placement
  placement TEXT NOT NULL DEFAULT 'search'
    CHECK (placement IN ('search', 'category', 'homepage', 'rfq_sidebar')),
  priority INT DEFAULT 1,  -- higher = more prominent

  -- Duration
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Budget (minor units)
  daily_budget BIGINT,
  total_spent BIGINT DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',

  -- Performance
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  inquiries INT DEFAULT 0,

  -- Billing
  billing_type TEXT DEFAULT 'included'
    CHECK (billing_type IN ('included', 'cpc', 'cpm', 'flat')),
  -- 'included' = part of subscription tier allowance
  -- 'cpc' = cost per click, 'cpm' = cost per 1000 impressions, 'flat' = flat fee

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_promoted_product ON promoted_listings(product_id);
CREATE INDEX idx_promoted_supplier ON promoted_listings(supplier_id);
CREATE INDEX idx_promoted_active ON promoted_listings(is_active, placement, ends_at)
  WHERE is_active = true;
CREATE INDEX idx_promoted_ends ON promoted_listings(ends_at);

-- Promotion usage tracking per supplier per month
CREATE TABLE promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES companies(id),
  month_start DATE NOT NULL,
  promotions_used INT DEFAULT 0,
  promotions_limit INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (supplier_id, month_start)
);

CREATE INDEX idx_promo_usage_supplier ON promotion_usage(supplier_id, month_start);
