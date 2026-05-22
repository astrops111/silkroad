-- ============================================================
-- 00064_product_shipping_groups.sql
-- Product shipping groups — organise products into batches
-- for container planning and freight quoting.
-- group_type is informational: 'supplier'|'supplier_group'|'country'|'custom'
-- Assignment is explicit (admin tags each product).
-- ============================================================

CREATE TABLE IF NOT EXISTS product_shipping_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,                           -- short reference e.g. "CN-FCL-Q1"
  group_type TEXT NOT NULL DEFAULT 'custom',  -- 'supplier'|'supplier_group'|'country'|'custom'
  description TEXT,
  country_code CHAR(2),                       -- origin country anchor (informational)
  preferred_container_type container_type,    -- default container for batch planning
  preferred_origin_port_id UUID REFERENCES ports(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psg_type ON product_shipping_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_psg_active ON product_shipping_groups(is_active)
  WHERE is_active = true;

-- ============================================================
-- Add shipping_group_id FK to products
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shipping_group_id UUID REFERENCES product_shipping_groups(id);

CREATE INDEX IF NOT EXISTS idx_products_shipping_group ON products(shipping_group_id)
  WHERE shipping_group_id IS NOT NULL;

-- ============================================================
-- RLS — admin-only
-- ============================================================
ALTER TABLE product_shipping_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "psg_admin_read"  ON product_shipping_groups;
  DROP POLICY IF EXISTS "psg_admin_write" ON product_shipping_groups;
END $$;

CREATE POLICY "psg_admin_read" ON product_shipping_groups
  FOR SELECT USING (is_admin());

CREATE POLICY "psg_admin_write" ON product_shipping_groups
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- updated_at trigger
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_psg_updated_at ON product_shipping_groups';
    EXECUTE 'CREATE TRIGGER trg_psg_updated_at BEFORE UPDATE ON product_shipping_groups
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END $$;
