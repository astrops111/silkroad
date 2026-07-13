-- ============================================================
-- 00110_pooling_info_group_identity.sql
-- Marketplace region filter now lists the shipping groups available
-- under each region, so buyers can browse one MOA/groupage pool.
-- Appends group id + display name to products_pooling_info (00109).
-- CREATE OR REPLACE VIEW only permits appending columns — original
-- column order is preserved.
--
-- NOTE: group *name* becomes buyer-visible. Names are admin-chosen
-- labels (e.g. "korean-beauty") — keep supplier company names out of
-- group names; notes/description remain private.
-- ============================================================

CREATE OR REPLACE VIEW products_pooling_info
WITH (security_invoker = false) AS
SELECT
  p.id,
  psg.group_type       AS pooling_group_type,
  psg.moq              AS group_moq,
  psg.min_order_amount AS group_min_order_amount,
  psg.country_code     AS group_country_code,
  psg.id               AS group_id,
  psg.name             AS group_name
FROM products p
JOIN product_shipping_groups psg
  ON psg.id = p.shipping_group_id AND psg.is_active
WHERE p.is_active;

GRANT SELECT ON products_pooling_info TO anon, authenticated;
