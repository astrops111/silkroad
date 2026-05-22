-- GIN index on category_ids for fast array overlap queries.
-- Enables: WHERE category_ids && ARRAY['uuid1', 'uuid2']
-- Used when searching products that belong to any of multiple categories.

CREATE INDEX IF NOT EXISTS idx_products_category_ids
  ON products USING GIN (category_ids);
