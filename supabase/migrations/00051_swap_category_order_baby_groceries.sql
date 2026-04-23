-- ============================================================
-- 00051_swap_category_order_baby_groceries.sql
-- Put Baby Products before Groceries in the top-level nav order.
-- ============================================================

UPDATE categories SET sort_order = 5 WHERE slug = 'baby-products' AND level = 0;
UPDATE categories SET sort_order = 6 WHERE slug = 'groceries'     AND level = 0;
