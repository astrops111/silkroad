-- ============================================================
-- 00086_products_origin_country_view.sql
-- Seeds a Taiwan origin port and adds a view that resolves each
-- product's country of origin via: port of origin -> product's
-- own origin_country -> supplier company's country_code.
-- Used to power country-first marketplace browsing (CN/TW/KR/JP).
-- ============================================================

INSERT INTO ports (code, name, country, city, port_type, region, is_origin, is_destination, is_active)
VALUES ('TWKHH', 'Kaohsiung', 'TW', 'Kaohsiung', 'sea', 'global', true, false, true)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE VIEW products_with_origin
WITH (security_invoker = true) AS
SELECT
  p.id,
  COALESCE(port.country, p.origin_country, c.country_code) AS resolved_country
FROM products p
JOIN companies c ON c.id = p.supplier_id
LEFT JOIN product_shipping_groups psg ON psg.id = p.shipping_group_id
LEFT JOIN ports port ON port.id = psg.preferred_origin_port_id;

GRANT SELECT ON products_with_origin TO anon, authenticated;
