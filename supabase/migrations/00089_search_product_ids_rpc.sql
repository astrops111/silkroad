-- ============================================================
-- 00089_search_product_ids_rpc.sql
-- Fixes a scalability bug in country-first marketplace browsing:
-- filtering products by resolved origin country via a client-side
-- id list (.in("id", ids)) breaks once the matching set is large
-- (e.g. 731 of 734 products resolve to one country) because the
-- id array overflows the PostgREST GET request URL length limit.
--
-- This RPC does the origin-country + category + search + price +
-- moq filtering and pagination entirely server-side, returning only
-- the current page's ids (bounded by p_limit) plus a total count.
-- ============================================================

CREATE OR REPLACE FUNCTION search_product_ids(
  p_category_ids uuid[] DEFAULT NULL,
  p_origin_countries text[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_price_min integer DEFAULT NULL,
  p_price_max integer DEFAULT NULL,
  p_moq_max integer DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH filtered AS (
    SELECT p.id, p.created_at, p.base_price, p.is_featured
    FROM products p
    WHERE p.moderation_status = 'approved'
      AND p.is_active = true
      AND (p_category_ids IS NULL OR p.category_id = ANY(p_category_ids))
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%')
      AND (p_price_min IS NULL OR p.base_price >= p_price_min)
      AND (p_price_max IS NULL OR p.base_price <= p_price_max)
      AND (p_moq_max IS NULL OR p.moq <= p_moq_max)
      AND (
        p_origin_countries IS NULL
        OR EXISTS (
          SELECT 1 FROM products_with_origin pwo
          WHERE pwo.id = p.id AND pwo.resolved_country = ANY(p_origin_countries)
        )
      )
  )
  SELECT f.id, count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN f.base_price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN f.base_price END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular' THEN f.is_featured END DESC NULLS LAST,
    f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_product_ids TO anon, authenticated;
