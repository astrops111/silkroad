-- ============================================================
-- 00115_computer_peripherals_expansion.sql
--
-- Consumer Electronics > Computer Peripherals holds 131 Logitech products
-- with zero subcategory differentiation (mice, keyboards, webcams, headsets,
-- speakers, gaming gear, etc. all lumped together). Adds leaf subcategories,
-- same pattern as 00104_beauty_subcategory_expansion.sql.
--
-- Also introduces a 'use_case' label kind so products can be tagged with a
-- buyer-facing "Use" (Gaming, Business / Office, ...) — a new facet on the
-- marketplace filter sidebar, reusing the existing labels/product_labels
-- vocabulary from 00107_product_labels.sql.
-- ============================================================

-- New leaves under existing Computer Peripherals (3f9827ab-adcc-42a0-a0ca-4867916de07b)
INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Mice & Trackballs',           '鼠标',       'peripherals-mice',               2, 'consumer-electronics/computer-peripherals/peripherals-mice',               1),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Keyboards',                   '键盘',       'peripherals-keyboards',          2, 'consumer-electronics/computer-peripherals/peripherals-keyboards',          2),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Keyboard & Mouse Combos',     '键鼠套装',    'peripherals-combos',             2, 'consumer-electronics/computer-peripherals/peripherals-combos',             3),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Webcams',                     '摄像头',     'peripherals-webcams',            2, 'consumer-electronics/computer-peripherals/peripherals-webcams',            4),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Headsets & Earphones',        '耳机',       'peripherals-headsets',           2, 'consumer-electronics/computer-peripherals/peripherals-headsets',           5),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Speakers',                    '音箱',       'peripherals-speakers',           2, 'consumer-electronics/computer-peripherals/peripherals-speakers',           6),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Gaming Controllers & Wheels', '游戏控制器', 'peripherals-gaming-controllers', 2, 'consumer-electronics/computer-peripherals/peripherals-gaming-controllers', 7),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Presenters & Clickers',       '演示器',     'peripherals-presenters',         2, 'consumer-electronics/computer-peripherals/peripherals-presenters',         8),
  ('3f9827ab-adcc-42a0-a0ca-4867916de07b', 'Mouse Pads & Desk Accessories','鼠标垫',    'peripherals-mousepads',          2, 'consumer-electronics/computer-peripherals/peripherals-mousepads',          9)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- labels.kind: add 'use_case' alongside keyword/brand/category
-- ------------------------------------------------------------
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_kind_check;
ALTER TABLE labels ADD CONSTRAINT labels_kind_check
  CHECK (kind IN ('keyword', 'brand', 'category', 'use_case'));

-- Seed the "Use" vocabulary shown as a marketplace filter facet.
INSERT INTO labels (name, slug, kind) VALUES
  ('Gaming',                       'gaming',                      'use_case'),
  ('Business / Office',            'business-office',             'use_case'),
  ('Home / Personal',              'home-personal',                'use_case'),
  ('Streaming & Content Creation', 'streaming-content-creation',  'use_case'),
  ('Education',                    'education',                   'use_case')
ON CONFLICT (slug) DO NOTHING;
