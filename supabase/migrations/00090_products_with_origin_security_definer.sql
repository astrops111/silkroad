-- ============================================================
-- 00090_products_with_origin_security_definer.sql
-- Fixes an RLS bug: products_with_origin was created with
-- security_invoker = true, so it ran with the querying role's
-- (anon/authenticated) permissions. The view's inner join reads
-- companies, which has RLS that blocks anon/authenticated entirely
-- (supplier identity is intentionally hidden from buyers) — so the
-- view silently returned 0 rows for real marketplace visitors even
-- though it worked when tested with the service-role key.
--
-- The view only ever exposes a derived country code, never raw
-- company data, so it's safe (and is the standard Postgres pattern)
-- to let it run with the view owner's privileges instead.
-- ============================================================

CREATE OR REPLACE VIEW products_with_origin
WITH (security_invoker = false) AS
SELECT
  p.id,
  COALESCE(port.country, p.origin_country, c.country_code) AS resolved_country
FROM products p
JOIN companies c ON c.id = p.supplier_id
LEFT JOIN product_shipping_groups psg ON psg.id = p.shipping_group_id
LEFT JOIN ports port ON port.id = psg.preferred_origin_port_id;

GRANT SELECT ON products_with_origin TO anon, authenticated;
