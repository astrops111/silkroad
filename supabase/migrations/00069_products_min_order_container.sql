-- Add container size and minimum-order grouping fields to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS container_size_ft    SMALLINT,   -- 20 or 40 (ft)
  ADD COLUMN IF NOT EXISTS min_order_grouped_by TEXT;       -- 'shipping_group' | 'other'
