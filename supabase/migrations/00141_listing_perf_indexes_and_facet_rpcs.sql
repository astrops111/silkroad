-- ============================================================
-- 00141_listing_perf_indexes_and_facet_rpcs.sql
--
-- Query-load optimisation for the marketplace + admin listings.
--
-- 1. Facet aggregation moves into SQL. Until now every marketplace
--    facet (category counts, brand, region, use-case, pooling banner,
--    shipping-group sub-filters) was computed by paging the ENTIRE
--    15k-row catalog to Node in 1000-row slices and tallying in JS —
--    once per distinct filter combination, per cache window. Each is
--    a GROUP BY; these RPCs return one row per bucket instead.
--
-- 2. search_product_ids learns the two filters that previously forced
--    the app to resolve product ids in JS and stuff them into an
--    unbounded `id IN (...)` list (use-case labels) or bypass the RPC
--    entirely (shipping group).
--
-- 3. Indexes for the predicates/sorts the listings actually use:
--      * partial btrees on the live catalog (approved+active) for the
--        default name sort, price sorts, newest sort and category
--        scoping — the universal marketplace predicate previously
--        needed a BitmapAnd of two single-column indexes then a sort;
--      * brand / origin_country (facet filters, brand pages);
--      * pg_trgm GIN on products.name and companies.name so the many
--        `ilike '%term%'` searches stop being sequential scans;
--      * purchase_orders(buyer_user_id, created_at DESC) — /api/orders
--        and the buyer dashboard filter by user, not company;
--      * trade_flows(updated_at DESC) — the admin list sorts by it;
--      * companies(type, created_at DESC) — admin suppliers list;
--      * reviews(supplier_company_id, is_visible, created_at DESC) —
--        storefront review strip;
--      * product_labels(product_id) — the use-case EXISTS probe.
--
-- 4. Small aggregate helpers so admin/storefront pages stop pulling
--    whole tables to count them: supplier_product_counts (was
--    silently wrong past 1000 rows) and supplier_review_stats.
--
-- Everything here is additive. Safe to re-run.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ─── Indexes: products ──────────────────────────────────────
-- Live-catalog partials. `WHERE moderation_status='approved' AND is_active`
-- is on every buyer-facing query, so a partial index both shrinks the
-- index and lets the planner satisfy predicate + ORDER BY in one scan.
CREATE INDEX IF NOT EXISTS idx_products_live_name
  ON products (name)
  WHERE moderation_status = 'approved' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_live_lower_name
  ON products (lower(name))
  WHERE moderation_status = 'approved' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_live_price
  ON products (base_price)
  WHERE moderation_status = 'approved' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_live_created
  ON products (created_at DESC)
  WHERE moderation_status = 'approved' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_live_category_name
  ON products (category_id, name)
  WHERE moderation_status = 'approved' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_brand
  ON products (brand)
  WHERE brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_origin_country
  ON products (origin_country)
  WHERE origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier_active
  ON products (supplier_id, is_active);

-- Trigram indexes for the `ilike '%term%'` search paths.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
  ON companies USING GIN (name extensions.gin_trgm_ops);

-- ─── Indexes: other listing tables ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_po_buyer_user_created
  ON purchase_orders (buyer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_po_order_number_trgm
  ON purchase_orders USING GIN (order_number extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trade_flows_updated_at
  ON trade_flows (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_companies_type_created
  ON companies (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_supplier_visible_created
  ON reviews (supplier_company_id, is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_labels_product
  ON product_labels (product_id);

-- ─── RPC: marketplace_facet_counts ──────────────────────────
-- One GROUP BY per facet dimension over the live catalog, cross-
-- filtered by whichever other facets are active. Mirrors exactly what
-- the JS tallies did:
--   category  → key = category_id (non-null)
--   brand     → key = brand (non-null)
--   country   → key = products_with_origin.resolved_country (non-null)
--   use_case  → key = labels.slug (kind='use_case'), distinct products
-- Origin scoping uses the resolved country (port → product → company)
-- via the SECURITY DEFINER view, same as the origin-filtered search.
-- Built dynamically so only the ACTIVE joins/predicates reach the
-- planner (see search_product_ids below for why); values are bound via
-- USING, never spliced into the SQL text.
DROP FUNCTION IF EXISTS marketplace_facet_counts(text, uuid[], text[], text[], text[]);
CREATE OR REPLACE FUNCTION marketplace_facet_counts(
  p_dimension        text,
  p_category_ids     uuid[]  DEFAULT NULL,
  p_origin_countries text[]  DEFAULT NULL,
  p_brands           text[]  DEFAULT NULL,
  p_use_case_slugs   text[]  DEFAULT NULL
)
RETURNS TABLE(key text, n bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key   text;
  v_from  text := 'products p';
  v_where text := 'p.moderation_status = ''approved'' AND p.is_active = true';
  v_count text := 'count(*)';
BEGIN
  v_key := CASE p_dimension
    WHEN 'category' THEN 'p.category_id::text'
    WHEN 'brand'    THEN 'p.brand::text'
    WHEN 'country'  THEN 'pwo.resolved_country::text'  -- view yields bpchar(2)
    WHEN 'use_case' THEN 'l.slug::text'
  END;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'marketplace_facet_counts: unknown dimension %', p_dimension;
  END IF;

  -- The origin view is only joined when it's actually needed: as the
  -- grouping key, or to scope by region.
  IF p_dimension = 'country' OR p_origin_countries IS NOT NULL THEN
    v_from := v_from || ' LEFT JOIN products_with_origin pwo ON pwo.id = p.id';
  END IF;
  IF p_dimension = 'use_case' THEN
    v_from := v_from
      || ' JOIN product_labels pl ON pl.product_id = p.id'
      || ' JOIN labels l ON l.id = pl.label_id AND l.kind = ''use_case''';
    v_count := 'count(DISTINCT p.id)';
  END IF;

  IF p_category_ids IS NOT NULL THEN
    v_where := v_where || ' AND p.category_id = ANY($1)';
  END IF;
  IF p_origin_countries IS NOT NULL THEN
    v_where := v_where || ' AND pwo.resolved_country = ANY($2)';
  END IF;
  IF p_brands IS NOT NULL THEN
    v_where := v_where || ' AND p.brand = ANY($3)';
  END IF;
  -- Use-case as a *scope* (for the other dimensions) is a semi-join; as
  -- the *dimension* it's already the grouping join above.
  IF p_use_case_slugs IS NOT NULL AND p_dimension <> 'use_case' THEN
    v_where := v_where
      || ' AND EXISTS (SELECT 1 FROM product_labels pl2 JOIN labels l2 ON l2.id = pl2.label_id'
      || ' WHERE pl2.product_id = p.id AND l2.kind = ''use_case'' AND l2.slug = ANY($4))';
  END IF;

  RETURN QUERY EXECUTE
    'SELECT k AS key, n FROM (SELECT ' || v_key || ' AS k, ' || v_count || ' AS n FROM '
    || v_from || ' WHERE ' || v_where || ' GROUP BY 1) s WHERE k IS NOT NULL'
  USING p_category_ids, p_origin_countries, p_brands, p_use_case_slugs;
END;
$$;

GRANT EXECUTE ON FUNCTION marketplace_facet_counts(text, uuid[], text[], text[], text[])
  TO anon, authenticated, service_role;

-- ─── RPC: marketplace_pooling_facets ────────────────────────
-- One row per active shipping group carrying live products; the app
-- derives both the region pooling banner (by country + type) and the
-- per-region group sub-filters from it. Reads the buyer-safe
-- products_pooling_info view (00109/00110) so it can never leak more
-- than that view already exposes.
CREATE OR REPLACE FUNCTION marketplace_pooling_facets()
RETURNS TABLE(
  group_id         uuid,
  country_code     text,
  pooling_type     text,
  min_order_amount numeric,
  products         bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ppi.group_id,
    ppi.group_country_code::text,
    ppi.pooling_group_type::text,
    ppi.group_min_order_amount,
    count(*) AS products
  FROM products_pooling_info ppi
  WHERE ppi.group_id IS NOT NULL
    AND ppi.group_country_code IS NOT NULL
  GROUP BY ppi.group_id, ppi.group_country_code, ppi.pooling_group_type, ppi.group_min_order_amount;
$$;

GRANT EXECUTE ON FUNCTION marketplace_pooling_facets() TO anon, authenticated, service_role;

-- ─── RPC: search_product_ids (extended, dynamic predicates) ──
-- Adds p_use_case_slugs + p_shipping_group_id so every filter combo
-- can go through the id-page + embed-by-id path. Signature changes,
-- so the 10-arg overload from 00103/00108 is dropped first (PostgREST
-- can't disambiguate overloads that differ only by defaulted params).
--
-- Also switches from one static SQL body with `p_x IS NULL OR <pred>`
-- guards to plpgsql that only appends the ACTIVE predicates. The static
-- form forced a generic plan in which the origin / use-case EXISTS
-- clauses could not be turned into semi-joins, so every call scanned
-- the whole live catalog with a per-row subplan (~300 ms); with the
-- guards gone the same filters plan as index-driven semi-joins.
-- All values are bound via USING — nothing user-supplied is spliced
-- into the SQL text.
DROP FUNCTION IF EXISTS search_product_ids(uuid[], text[], text, integer, integer, integer, text[], text, integer, integer);
DROP FUNCTION IF EXISTS search_product_ids(uuid[], text[], text, integer, integer, integer, text[], text, integer, integer, text[], uuid);

CREATE OR REPLACE FUNCTION search_product_ids(
  p_category_ids      uuid[]  DEFAULT NULL,
  p_origin_countries  text[]  DEFAULT NULL,
  p_search            text    DEFAULT NULL,
  p_price_min         integer DEFAULT NULL,
  p_price_max         integer DEFAULT NULL,
  p_moq_max           integer DEFAULT NULL,
  p_brands            text[]  DEFAULT NULL,
  p_sort              text    DEFAULT 'name',
  p_limit             integer DEFAULT 20,
  p_offset            integer DEFAULT 0,
  p_use_case_slugs    text[]  DEFAULT NULL,
  p_shipping_group_id uuid    DEFAULT NULL
)
RETURNS TABLE(id uuid, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_where text := 'p.moderation_status = ''approved'' AND p.is_active = true';
  v_order text;
BEGIN
  IF p_category_ids IS NOT NULL THEN
    v_where := v_where || ' AND p.category_id = ANY($1)';
  END IF;
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND p.name ILIKE ''%'' || $3 || ''%''';
  END IF;
  IF p_price_min IS NOT NULL THEN
    v_where := v_where || ' AND p.base_price >= $4';
  END IF;
  IF p_price_max IS NOT NULL THEN
    v_where := v_where || ' AND p.base_price <= $5';
  END IF;
  IF p_moq_max IS NOT NULL THEN
    v_where := v_where || ' AND p.moq <= $6';
  END IF;
  IF p_brands IS NOT NULL THEN
    v_where := v_where || ' AND p.brand = ANY($7)';
  END IF;
  IF p_shipping_group_id IS NOT NULL THEN
    v_where := v_where || ' AND p.shipping_group_id = $12';
  END IF;
  IF p_origin_countries IS NOT NULL THEN
    v_where := v_where ||
      ' AND EXISTS (SELECT 1 FROM products_with_origin pwo'
      || ' WHERE pwo.id = p.id AND pwo.resolved_country = ANY($2))';
  END IF;
  IF p_use_case_slugs IS NOT NULL THEN
    v_where := v_where ||
      ' AND EXISTS (SELECT 1 FROM product_labels pl JOIN labels l ON l.id = pl.label_id'
      || ' WHERE pl.product_id = p.id AND l.kind = ''use_case'' AND l.slug = ANY($11))';
  END IF;

  v_order := CASE p_sort
    WHEN 'price_asc'  THEN 'p.base_price ASC NULLS LAST, lower(p.name) ASC'
    WHEN 'price_desc' THEN 'p.base_price DESC NULLS LAST, lower(p.name) ASC'
    WHEN 'popular'    THEN 'p.is_featured DESC NULLS LAST, lower(p.name) ASC'
    WHEN 'newest'     THEN 'p.created_at DESC NULLS LAST, lower(p.name) ASC'
    ELSE 'lower(p.name) ASC'
  END;

  RETURN QUERY EXECUTE
    'SELECT p.id, count(*) OVER () AS total_count FROM products p WHERE ' || v_where
    || ' ORDER BY ' || v_order || ' LIMIT $9 OFFSET $10'
  USING p_category_ids, p_origin_countries, p_search, p_price_min, p_price_max,
        p_moq_max, p_brands, p_sort, p_limit, p_offset, p_use_case_slugs, p_shipping_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION search_product_ids(uuid[], text[], text, integer, integer, integer, text[], text, integer, integer, text[], uuid)
  TO anon, authenticated, service_role;

-- ─── RPC: supplier_product_counts ───────────────────────────
-- Product count per supplier for admin lists. Replaces "select every
-- product row for these suppliers and reduce in JS", which PostgREST
-- silently truncated at 1000 rows. Admin-only data path (called with
-- the server client by an authenticated admin) — RLS still applies.
CREATE OR REPLACE FUNCTION supplier_product_counts(p_supplier_ids uuid[])
RETURNS TABLE(supplier_id uuid, product_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.supplier_id, count(*) AS product_count
  FROM products p
  WHERE p.supplier_id = ANY(p_supplier_ids)
  GROUP BY p.supplier_id;
$$;

GRANT EXECUTE ON FUNCTION supplier_product_counts(uuid[]) TO authenticated, service_role;

-- ─── RPC: supplier_review_stats ─────────────────────────────
-- Rating average + 1..5 distribution for a supplier storefront,
-- computed in SQL instead of pulling every visible review row.
CREATE OR REPLACE FUNCTION supplier_review_stats(p_company_id uuid)
RETURNS TABLE(
  total_reviews  bigint,
  avg_rating     numeric,
  avg_communication numeric,
  avg_product_quality numeric,
  avg_shipping   numeric,
  star_1 bigint,
  star_2 bigint,
  star_3 bigint,
  star_4 bigint,
  star_5 bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    count(*)                                        AS total_reviews,
    round(avg(r.rating)::numeric, 2)                AS avg_rating,
    round(avg(r.communication_rating)::numeric, 2)  AS avg_communication,
    round(avg(r.product_quality_rating)::numeric, 2) AS avg_product_quality,
    round(avg(r.shipping_rating)::numeric, 2)       AS avg_shipping,
    count(*) FILTER (WHERE r.rating = 1)            AS star_1,
    count(*) FILTER (WHERE r.rating = 2)            AS star_2,
    count(*) FILTER (WHERE r.rating = 3)            AS star_3,
    count(*) FILTER (WHERE r.rating = 4)            AS star_4,
    count(*) FILTER (WHERE r.rating = 5)            AS star_5
  FROM reviews r
  WHERE r.supplier_company_id = p_company_id
    AND r.is_visible = true;
$$;

GRANT EXECUTE ON FUNCTION supplier_review_stats(uuid) TO anon, authenticated, service_role;

-- Fresh statistics so the planner picks up the new indexes immediately.
ANALYZE products;
ANALYZE companies;
ANALYZE purchase_orders;
ANALYZE reviews;
ANALYZE product_labels;
