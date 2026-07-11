-- ============================================================
-- 00105_baby_products_subcategory_expansion.sql
--
-- Baby Products currently has zero products and only two leaves
-- (Diapers, Baby Formula) — neither fits what's actually in the
-- catalog. ~230 genuine baby/kids items (GOONGBE, ATOPALM, BEYOND
-- Angel Kids, I'm Pinky Kids, BABY MILD, Pinky Tonky Kids, etc.) sit
-- scattered across adult Beauty subcategories. Adds leaves matching
-- the real product types found: skincare, bath & wash, hair care,
-- sun care, oral care, kids beauty/accessories, laundry & household.
-- Diapers/Baby Formula are kept as-is (diaper-care items route into
-- the existing Diapers leaf).
-- ============================================================

INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'Skincare',              '婴儿护肤',   'baby-skincare',           1, 'baby-products/baby-skincare',           3),
  ('a0000000-0000-0000-0000-000000000006', 'Bath & Wash',           '洗浴用品',   'baby-bath-wash',          1, 'baby-products/baby-bath-wash',          4),
  ('a0000000-0000-0000-0000-000000000006', 'Hair Care',             '婴儿护发',   'baby-hair-care',          1, 'baby-products/baby-hair-care',          5),
  ('a0000000-0000-0000-0000-000000000006', 'Sun Care',              '婴儿防晒',   'baby-sun-care',           1, 'baby-products/baby-sun-care',           6),
  ('a0000000-0000-0000-0000-000000000006', 'Oral Care',             '口腔护理',   'baby-oral-care',          1, 'baby-products/baby-oral-care',          7),
  ('a0000000-0000-0000-0000-000000000006', 'Kids Beauty & Accessories', '儿童美妆配饰', 'kids-beauty-accessories', 1, 'baby-products/kids-beauty-accessories', 8),
  ('a0000000-0000-0000-0000-000000000006', 'Laundry & Household',   '洗护家居',   'baby-laundry-household',  1, 'baby-products/baby-laundry-household',  9);
