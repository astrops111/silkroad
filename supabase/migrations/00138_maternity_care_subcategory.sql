-- ============================================================
-- 00138_maternity_care_subcategory.sql
--
-- Baby & Kids audit (2026-08-13) found 5 ATOPALM "Maternity Care"
-- products (stretch mark cream, leg cream, facial cream, massage
-- oil, scalp therapy) sitting in the Skincare leaf — used by the
-- expecting/new mother, not the baby. No dedicated leaf existed for
-- this product type. Adds Maternity as a proper leaf so these (and
-- future maternity items) aren't miscategorized as baby skincare.
-- ============================================================

INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'Maternity', '孕产护理', 'baby-maternity', 1, 'baby-products/baby-maternity', 10);
