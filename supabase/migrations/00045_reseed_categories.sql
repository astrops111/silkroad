-- ============================================================
-- 00045_reseed_categories.sql — Replace taxonomy with buyer-facing
-- Home / Hotels / Consumer Electronics / Beauty / Groceries / Baby
-- name_local = Simplified Chinese (zh-CN)
-- ============================================================

-- Clear product references + existing tree
UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL;
DELETE FROM categories;

-- ------------------------------------------------------------
-- Top-level
-- ------------------------------------------------------------
INSERT INTO categories (id, name, name_local, slug, level, path, icon, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Home',                 '家居',       'home',                 0, 'home',                 'House',       1),
  ('a0000000-0000-0000-0000-000000000002', 'Hotels',               '酒店',       'hotels',               0, 'hotels',               'Hotel',       2),
  ('a0000000-0000-0000-0000-000000000003', 'Consumer Electronics', '消费电子',    'consumer-electronics', 0, 'consumer-electronics', 'Cpu',         3),
  ('a0000000-0000-0000-0000-000000000004', 'Beauty',               '美容',       'beauty',               0, 'beauty',               'Sparkles',    4),
  ('a0000000-0000-0000-0000-000000000005', 'Groceries',            '食品杂货',    'groceries',            0, 'groceries',            'ShoppingBag', 5),
  ('a0000000-0000-0000-0000-000000000006', 'Baby Products',        '婴儿用品',    'baby-products',        0, 'baby-products',        'Baby',        6);

-- ------------------------------------------------------------
-- Home
-- ------------------------------------------------------------
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Decor',     '装饰', 'home-decor',     1, 'home/home-decor',     1),
  ('a0000000-0000-0000-0000-000000000001', 'Furniture', '家具', 'home-furniture', 1, 'home/home-furniture', 2),
  ('a0000000-0000-0000-0000-000000000001', 'Supplies',  '用品', 'home-supplies',  1, 'home/home-supplies',  3),
  ('a0000000-0000-0000-0000-000000000001', 'Fragrance', '香氛', 'home-fragrance', 1, 'home/home-fragrance', 4),
  ('a0000000-0000-0000-0000-000000000001', 'Kitchen',   '厨房', 'home-kitchen',   1, 'home/home-kitchen',   5),
  ('a0000000-0000-0000-0000-000000000001', 'Bedroom',   '卧室', 'home-bedroom',   1, 'home/home-bedroom',   6),
  ('a0000000-0000-0000-0000-000000000001', 'Bathroom',  '浴室', 'home-bathroom',  1, 'home/home-bathroom',  7),
  ('a0000000-0000-0000-0000-000000000001', 'Outdoors',  '户外', 'home-outdoors',  1, 'home/home-outdoors',  8);

-- ------------------------------------------------------------
-- Hotels
-- ------------------------------------------------------------
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Bath',       '浴室用品', 'hotel-bath',       1, 'hotels/hotel-bath',       1),
  ('a0000000-0000-0000-0000-000000000002', 'Beds',       '床品',    'hotel-beds',       1, 'hotels/hotel-beds',       2),
  ('a0000000-0000-0000-0000-000000000002', 'Furnishing', '软装',    'hotel-furnishing', 1, 'hotels/hotel-furnishing', 3),
  ('a0000000-0000-0000-0000-000000000002', 'Decor',      '装饰',    'hotel-decor',      1, 'hotels/hotel-decor',      4);

-- ------------------------------------------------------------
-- Consumer Electronics
-- ------------------------------------------------------------
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'Home Appliance',      '家用电器', 'home-appliance',      1, 'consumer-electronics/home-appliance',      1),
  ('a0000000-0000-0000-0000-000000000003', 'Computer',            '电脑',    'computer',            1, 'consumer-electronics/computer',            2),
  ('a0000000-0000-0000-0000-000000000003', 'Computer Peripherals','电脑外设', 'computer-peripherals',1, 'consumer-electronics/computer-peripherals',3);

-- ------------------------------------------------------------
-- Beauty  (3 levels under Facial / Body / Hair)
-- ------------------------------------------------------------
INSERT INTO categories (id, parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0001-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Facial', '面部',     'beauty-facial', 1, 'beauty/beauty-facial', 1),
  ('a0000004-0002-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Body',   '身体',     'beauty-body',   1, 'beauty/beauty-body',   2),
  ('a0000004-0003-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Hair',   '头发',     'beauty-hair',   1, 'beauty/beauty-hair',   3),
  ('a0000004-0004-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Tools',  '美妆工具', 'beauty-tools',  1, 'beauty/beauty-tools',  4);

-- Beauty › Facial
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0001-0000-0000-000000000000', 'Cleaning',       '清洁',       'facial-cleaning', 2, 'beauty/beauty-facial/facial-cleaning', 1),
  ('a0000004-0001-0000-0000-000000000000', 'Cream & Lotion', '面霜与乳液', 'facial-cream',    2, 'beauty/beauty-facial/facial-cream',    2),
  ('a0000004-0001-0000-0000-000000000000', 'Sprays',         '喷雾',       'facial-sprays',   2, 'beauty/beauty-facial/facial-sprays',   3),
  ('a0000004-0001-0000-0000-000000000000', 'Masks',          '面膜',       'facial-masks',    2, 'beauty/beauty-facial/facial-masks',    4);

-- Beauty › Body
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0002-0000-0000-000000000000', 'Cleaning',       '沐浴清洁', 'body-cleaning',       2, 'beauty/beauty-body/body-cleaning',       1),
  ('a0000004-0002-0000-0000-000000000000', 'Cream & Lotion', '身体乳',   'body-cream',          2, 'beauty/beauty-body/body-cream',          2),
  ('a0000004-0002-0000-0000-000000000000', 'Sun Protection', '防晒',     'body-sun-protection', 2, 'beauty/beauty-body/body-sun-protection', 3),
  ('a0000004-0002-0000-0000-000000000000', 'Fragrance',      '身体香氛', 'body-fragrance',      2, 'beauty/beauty-body/body-fragrance',      4);

-- Beauty › Hair
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0003-0000-0000-000000000000', 'Shampoo',      '洗发水',   'hair-shampoo',     2, 'beauty/beauty-hair/hair-shampoo',     1),
  ('a0000004-0003-0000-0000-000000000000', 'Conditioner',  '护发素',   'hair-conditioner', 2, 'beauty/beauty-hair/hair-conditioner', 2),
  ('a0000004-0003-0000-0000-000000000000', 'Dye',          '染发',     'hair-dye',         2, 'beauty/beauty-hair/hair-dye',         3),
  ('a0000004-0003-0000-0000-000000000000', 'Hair Removal', '脱毛',     'hair-removal',     2, 'beauty/beauty-hair/hair-removal',     4),
  ('a0000004-0003-0000-0000-000000000000', 'Accessories',  '美发配件', 'hair-accessories', 2, 'beauty/beauty-hair/hair-accessories', 5);

-- ------------------------------------------------------------
-- Groceries
-- ------------------------------------------------------------
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'Snacks — Sweets',          '零食 — 甜味', 'snacks-sweets',  1, 'groceries/snacks-sweets',  1),
  ('a0000000-0000-0000-0000-000000000005', 'Snacks — Salty & Savoury', '零食 — 咸味', 'snacks-savoury', 1, 'groceries/snacks-savoury', 2),
  ('a0000000-0000-0000-0000-000000000005', 'Drink',                    '饮料',        'drink',          1, 'groceries/drink',          3),
  ('a0000000-0000-0000-0000-000000000005', 'Canned Goods',             '罐头食品',    'canned-goods',   1, 'groceries/canned-goods',   4),
  ('a0000000-0000-0000-0000-000000000005', 'Frozen',                   '冷冻食品',    'frozen',         1, 'groceries/frozen',         5);

-- ------------------------------------------------------------
-- Baby Products
-- ------------------------------------------------------------
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'Diapers',      '尿布',   'diapers',      1, 'baby-products/diapers',      1),
  ('a0000000-0000-0000-0000-000000000006', 'Baby Formula', '婴儿奶粉', 'baby-formula', 1, 'baby-products/baby-formula', 2);
