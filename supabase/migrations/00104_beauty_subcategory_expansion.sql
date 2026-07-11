-- ============================================================
-- 00104_beauty_subcategory_expansion.sql
--
-- The Beauty > Facial bucket holds 15,745 Korean-beauty products with
-- zero subcategory differentiation. The existing taxonomy has no leaf
-- for serums/essences, toners, facial sunscreen, or lip care, and no
-- branch at all for makeup/color-cosmetics — which a real scan of the
-- catalog shows is ~44% of it (tint, cushion, foundation, concealer,
-- eyeshadow/liner/brow, blush, lipstick, nail polish).
--
-- Adds:
--   Beauty > Facial > Serum & Essence / Toner / Sun Protection (new leaves)
--   Beauty > Lip Care                                          (new level-1, skincare lip)
--   Beauty > Makeup > Face / Eyes / Lips / Cheek / Nails        (new branch)
-- ============================================================

-- New leaves under existing Facial (a0000004-0001-0000-0000-000000000000)
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0001-0000-0000-000000000000', 'Serum & Essence', '精华',   'facial-serum',          2, 'beauty/beauty-facial/facial-serum',          5),
  ('a0000004-0001-0000-0000-000000000000', 'Toner',           '爽肤水', 'facial-toner',           2, 'beauty/beauty-facial/facial-toner',          6),
  ('a0000004-0001-0000-0000-000000000000', 'Sun Protection',  '防晒',   'facial-sun-protection',  2, 'beauty/beauty-facial/facial-sun-protection', 7);

-- New level-1 branches under Beauty (a0000000-0000-0000-0000-000000000004)
INSERT INTO categories (id, parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0005-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Lip Care', '唇部护理', 'beauty-lip',    1, 'beauty/beauty-lip',    5),
  ('a0000004-0006-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'Makeup',   '彩妆',     'beauty-makeup', 1, 'beauty/beauty-makeup', 6);

-- Beauty › Makeup
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000004-0006-0000-0000-000000000000', 'Face',  '底妆', 'makeup-face',  2, 'beauty/beauty-makeup/makeup-face',  1),
  ('a0000004-0006-0000-0000-000000000000', 'Eyes',  '眼妆', 'makeup-eyes',  2, 'beauty/beauty-makeup/makeup-eyes',  2),
  ('a0000004-0006-0000-0000-000000000000', 'Lips',  '唇妆', 'makeup-lips',  2, 'beauty/beauty-makeup/makeup-lips',  3),
  ('a0000004-0006-0000-0000-000000000000', 'Cheek', '腮红', 'makeup-cheek', 2, 'beauty/beauty-makeup/makeup-cheek', 4),
  ('a0000004-0006-0000-0000-000000000000', 'Nails', '美甲', 'makeup-nails', 2, 'beauty/beauty-makeup/makeup-nails', 5);
