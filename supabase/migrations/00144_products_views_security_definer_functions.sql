-- ============================================================
-- 00144_products_views_security_definer_functions.sql
--
-- Fixes the remaining security_definer_view linter ERRORs on
-- products_with_origin (00090) and products_pooling_info
-- (00109/00110). Both are intentionally elevated-privilege reads —
-- they expose only derived, non-identifying fields to buyers past
-- RLS on companies/product_shipping_groups — so setting
-- security_invoker = true directly on the views would reintroduce
-- the exact "0 rows for real buyers" bug 00090 fixed.
--
-- Supabase's remediation for this case is to move the elevated
-- read into a SECURITY DEFINER FUNCTION (narrowly scoped, SET
-- search_path pinned) and keep the VIEW itself a plain
-- security_invoker = true wrapper — the linter only flags views,
-- not functions.
--
-- Perf note (verified against prod with EXPLAIN before writing this):
-- Postgres never inlines a SECURITY DEFINER function, so a bare
-- `SELECT * FROM security_definer_fn()` view forces a full
-- materialization of the function's result on every call, with any
-- outer WHERE applied afterward instead of pushed down.
--   - products_with_origin's only real consumer (search_product_ids'
--     origin-country EXISTS filter) already does a full unindexed
--     scan either way (resolved_country isn't a real column), so the
--     function wrapper costs the same as today. Safe as a bare view.
--   - products_pooling_info's real consumer (marketplace.ts,
--     getPoolingInfoByProductIdsCached) does `.in("id", productIds)`
--     on every marketplace listing render, and today that's a cheap
--     Index Scan on products_pkey. Wrapping it the same bare way
--     turned that into a Function Scan materializing the full
--     active-products x active-shipping-groups join (~16k rows)
--     before filtering — confirmed via EXPLAIN. So this view keeps
--     its existing no-arg function (used by marketplace_pooling_facets
--     in 00141, which already scans the whole catalog by design —
--     no regression there), and marketplace.ts is switched to call
--     the new get_products_pooling_info_by_ids(uuid[]) RPC instead,
--     which bakes the id filter into the function body so Postgres
--     plans that WHERE p.id = ANY(p_ids) itself and still uses the
--     index (confirmed via EXPLAIN ANALYZE: 16 buffer hits, not a
--     full-table scan).
-- ============================================================

-- ---- products_with_origin --------------------------------------------

CREATE OR REPLACE FUNCTION get_products_with_origin()
RETURNS TABLE (id uuid, resolved_country char(2))
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(port.country, p.origin_country, c.country_code) AS resolved_country
  FROM products p
  JOIN companies c ON c.id = p.supplier_id
  LEFT JOIN product_shipping_groups psg ON psg.id = p.shipping_group_id
  LEFT JOIN ports port ON port.id = psg.preferred_origin_port_id;
$$;

GRANT EXECUTE ON FUNCTION get_products_with_origin() TO anon, authenticated, service_role;

-- Explicit cast: a table-function's OUT column type is reported without
-- its typmod, and CREATE OR REPLACE VIEW refuses a column type change
-- (42P16) even though character(2) and bare bpchar are the same type.
CREATE OR REPLACE VIEW products_with_origin
WITH (security_invoker = true) AS
SELECT id, resolved_country::char(2) AS resolved_country
FROM get_products_with_origin();

GRANT SELECT ON products_with_origin TO anon, authenticated;

-- ---- products_pooling_info ---------------------------------------------

CREATE OR REPLACE FUNCTION get_products_pooling_info()
RETURNS TABLE (
  id                     uuid,
  pooling_group_type     text,
  group_moq              integer,
  group_min_order_amount numeric,
  group_country_code     char(2),
  group_id               uuid,
  group_name             text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    psg.group_type       AS pooling_group_type,
    psg.moq              AS group_moq,
    psg.min_order_amount AS group_min_order_amount,
    psg.country_code     AS group_country_code,
    psg.id                AS group_id,
    psg.name              AS group_name
  FROM products p
  JOIN product_shipping_groups psg
    ON psg.id = p.shipping_group_id AND psg.is_active
  WHERE p.is_active;
$$;

GRANT EXECUTE ON FUNCTION get_products_pooling_info() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW products_pooling_info
WITH (security_invoker = true) AS
SELECT
  id,
  pooling_group_type,
  group_moq,
  group_min_order_amount::numeric(14,2) AS group_min_order_amount,
  group_country_code::char(2) AS group_country_code,
  group_id,
  group_name
FROM get_products_pooling_info();

GRANT SELECT ON products_pooling_info TO anon, authenticated;

-- Id-filtered sibling for hot per-listing-page lookups (see perf note
-- above) — the filter lives inside the function body so it's planned
-- and indexed normally instead of applied after a full materialization.
CREATE OR REPLACE FUNCTION get_products_pooling_info_by_ids(p_ids uuid[])
RETURNS TABLE (
  id                     uuid,
  pooling_group_type     text,
  group_moq              integer,
  group_min_order_amount numeric,
  group_country_code     char(2),
  group_id               uuid,
  group_name             text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    psg.group_type       AS pooling_group_type,
    psg.moq              AS group_moq,
    psg.min_order_amount AS group_min_order_amount,
    psg.country_code     AS group_country_code,
    psg.id                AS group_id,
    psg.name              AS group_name
  FROM products p
  JOIN product_shipping_groups psg
    ON psg.id = p.shipping_group_id AND psg.is_active
  WHERE p.is_active AND p.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION get_products_pooling_info_by_ids(uuid[]) TO anon, authenticated, service_role;
