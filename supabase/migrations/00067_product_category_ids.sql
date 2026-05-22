-- Allow products to belong to multiple categories.
-- category_ids is authoritative; category_id is kept in sync as the primary
-- category for backward-compatible filtering.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}';

-- Backfill so existing products don't lose their category assignment
UPDATE products
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL
  AND (category_ids IS NULL OR array_length(category_ids, 1) IS NULL);
