-- ============================================================
-- 00109_product_pooling_info.sql
-- Buyer-safe view of how a product's minimum order is pooled.
-- product_shipping_groups is admin-only under RLS (its name/notes
-- can reveal supplier identity, which is hidden from buyers), so —
-- like products_with_origin (00090) — this runs security definer
-- and exposes ONLY derived, non-identifying fields:
--   pooling_group_type      'supplier'|'supplier_group' → one MOA across
--                           that supplier's listed products;
--                           'country'|'custom' → groupage: minimum combined
--                           across suppliers in the batch
--   group_moq               group-level minimum quantity (units)
--   group_min_order_amount  group-level minimum order value (USD dollars)
--   group_country_code      origin anchor of the group
-- ============================================================

CREATE OR REPLACE VIEW products_pooling_info
WITH (security_invoker = false) AS
SELECT
  p.id,
  psg.group_type       AS pooling_group_type,
  psg.moq              AS group_moq,
  psg.min_order_amount AS group_min_order_amount,
  psg.country_code     AS group_country_code
FROM products p
JOIN product_shipping_groups psg
  ON psg.id = p.shipping_group_id AND psg.is_active
WHERE p.is_active;

GRANT SELECT ON products_pooling_info TO anon, authenticated;
