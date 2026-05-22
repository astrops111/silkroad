-- ============================================================
-- 00065_shipping_group_order_rules.sql
-- Add order rule fields to product_shipping_groups:
--   product_mix      — whether mixed products are allowed in this group
--   moq              — minimum order quantity for the group
--   min_order_amount — minimum order value (in USD, 2dp)
-- ============================================================

ALTER TABLE product_shipping_groups
  ADD COLUMN IF NOT EXISTS product_mix      BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS moq              INTEGER,
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(14,2);
