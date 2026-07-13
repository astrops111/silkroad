-- ============================================================
-- 00107_product_labels.sql
--
-- Products can carry multiple free-form labels used as search keywords.
-- A label is a shared, normalized tag (deduped by slug). Each label has a
-- `kind` recording where it originated / how to present it:
--   'brand'    — a brand name
--   'category' — a category name (leaf or ancestor)
--   'keyword'  — a free-form keyword (default)
--
-- Model: a global `labels` vocabulary + a `product_labels` join so the same
-- label ("vegan", "SPF50", "Nard") is reused across products and can be
-- renamed in one place. Labels feed the product full-text search_vector.
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  kind       text NOT NULL DEFAULT 'keyword'
             CHECK (kind IN ('keyword', 'brand', 'category')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_labels (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label_id   uuid NOT NULL REFERENCES labels(id)   ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, label_id)
);

-- Reverse lookup (all products for a label) + label listing by kind.
CREATE INDEX IF NOT EXISTS idx_product_labels_label ON product_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_labels_kind          ON labels(kind);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE labels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_labels ENABLE ROW LEVEL SECURITY;

-- labels: readable by everyone; any authenticated user may create one
-- (shared vocabulary); only admins may rename/remove.
DROP POLICY IF EXISTS labels_select_public ON labels;
CREATE POLICY labels_select_public ON labels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS labels_insert_auth ON labels;
CREATE POLICY labels_insert_auth ON labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS labels_update_admin ON labels;
CREATE POLICY labels_update_admin ON labels
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS labels_delete_admin ON labels;
CREATE POLICY labels_delete_admin ON labels
  FOR DELETE USING (is_admin());

-- product_labels: follow the parent product (same shape as product_variants).
DROP POLICY IF EXISTS product_labels_select ON product_labels;
CREATE POLICY product_labels_select ON product_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (
          (p.moderation_status = 'approved' AND p.is_active = true)
          OR p.supplier_id = ANY(get_user_companies())
          OR is_admin()
        )
    )
  );

DROP POLICY IF EXISTS product_labels_insert ON product_labels;
CREATE POLICY product_labels_insert ON product_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

DROP POLICY IF EXISTS product_labels_delete ON product_labels;
CREATE POLICY product_labels_delete ON product_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

-- ------------------------------------------------------------
-- Full-text search integration
--
-- Labels are aggregated (weight C, same as category/supplier) into
-- products.search_vector. Two paths keep it fresh:
--   1. The existing BEFORE trigger on products (direct edits) now also
--      folds in the product's labels.
--   2. A new trigger on product_labels recomputes the parent product's
--      vector when tags are attached/detached (which doesn't touch the
--      products row otherwise).
-- ------------------------------------------------------------

-- Recompute one product's search_vector from its persisted row + labels.
-- Setting only search_vector does NOT re-fire the BEFORE UPDATE OF (name,...)
-- trigger below (search_vector is not in its column list) — so no recursion.
CREATE OR REPLACE FUNCTION set_product_search_vector(p_id uuid)
RETURNS void AS $$
  UPDATE products p SET search_vector =
    setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p.name_local, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce((SELECT name FROM categories WHERE id = p.category_id), '')), 'C') ||
    setweight(to_tsvector('english', coalesce((SELECT name FROM companies  WHERE id = p.supplier_id), '')), 'C') ||
    setweight(to_tsvector('english', coalesce((
      SELECT string_agg(l.name, ' ')
      FROM product_labels pl JOIN labels l ON l.id = pl.label_id
      WHERE pl.product_id = p.id
    ), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(p.hs_code, '')), 'D')
  WHERE p.id = p_id;
$$ LANGUAGE sql;

-- Direct product edits: recompute inline (NEW row) including its labels.
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
DECLARE
  cat_name TEXT;
  supplier_name TEXT;
  label_text TEXT;
BEGIN
  SELECT name INTO cat_name FROM categories WHERE id = NEW.category_id;
  SELECT name INTO supplier_name FROM companies WHERE id = NEW.supplier_id;
  SELECT string_agg(l.name, ' ') INTO label_text
    FROM product_labels pl JOIN labels l ON l.id = pl.label_id
    WHERE pl.product_id = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.name_local, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(cat_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(supplier_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(label_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.hs_code, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep search_vector fresh when labels are attached/detached.
CREATE OR REPLACE FUNCTION product_labels_refresh_search()
RETURNS trigger AS $$
BEGIN
  PERFORM set_product_search_vector(COALESCE(NEW.product_id, OLD.product_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_labels_search ON product_labels;
CREATE TRIGGER trg_product_labels_search
  AFTER INSERT OR DELETE ON product_labels
  FOR EACH ROW
  EXECUTE FUNCTION product_labels_refresh_search();
