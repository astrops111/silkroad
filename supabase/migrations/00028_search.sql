-- ============================================================
-- 00018_search.sql — Full-text search improvements
-- ============================================================

-- Trigger to auto-update search_vector on product insert/update
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
DECLARE
  cat_name TEXT;
  supplier_name TEXT;
BEGIN
  -- Get category name
  SELECT name INTO cat_name FROM categories WHERE id = NEW.category_id;

  -- Get supplier company name
  SELECT name INTO supplier_name FROM companies WHERE id = NEW.supplier_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.name_local, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(cat_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(supplier_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.hs_code, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name, name_local, description, category_id, supplier_id, hs_code
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vector();

-- Update existing products
UPDATE products SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(name_local, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');

-- RPC function for ranked full-text search
CREATE OR REPLACE FUNCTION search_products(
  query TEXT,
  filter_category TEXT DEFAULT NULL,
  filter_price_min BIGINT DEFAULT NULL,
  filter_price_max BIGINT DEFAULT NULL,
  filter_moq_max INT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_local TEXT,
  slug TEXT,
  description TEXT,
  base_price BIGINT,
  currency CHAR(3),
  moq INT,
  supplier_id UUID,
  supplier_name TEXT,
  supplier_country CHAR(2),
  supplier_verified BOOLEAN,
  category_name TEXT,
  primary_image_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.name_local,
    p.slug,
    p.description,
    p.base_price,
    p.currency,
    p.moq,
    p.supplier_id,
    c.name AS supplier_name,
    c.country_code AS supplier_country,
    (c.verification_status = 'verified') AS supplier_verified,
    cat.name AS category_name,
    (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image_url,
    ts_rank(p.search_vector, websearch_to_tsquery('english', query)) AS rank
  FROM products p
  LEFT JOIN companies c ON c.id = p.supplier_id
  LEFT JOIN categories cat ON cat.id = p.category_id
  WHERE
    p.moderation_status = 'approved'
    AND p.is_active = true
    AND (query = '' OR p.search_vector @@ websearch_to_tsquery('english', query) OR p.name ILIKE '%' || query || '%' OR p.name_local ILIKE '%' || query || '%')
    AND (filter_category IS NULL OR cat.slug = filter_category)
    AND (filter_price_min IS NULL OR p.base_price >= filter_price_min)
    AND (filter_price_max IS NULL OR p.base_price <= filter_price_max)
    AND (filter_moq_max IS NULL OR p.moq <= filter_moq_max)
  ORDER BY
    CASE WHEN sort_by = 'relevance' THEN ts_rank(p.search_vector, websearch_to_tsquery('english', query)) END DESC NULLS LAST,
    CASE WHEN sort_by = 'price_asc' THEN p.base_price END ASC,
    CASE WHEN sort_by = 'price_desc' THEN p.base_price END DESC,
    CASE WHEN sort_by = 'newest' THEN p.created_at END DESC,
    p.is_featured DESC,
    p.created_at DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;
