-- Add mix-shipping flag and minimum purchase amount to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allow_mix_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_order_amount   INTEGER;          -- cents, nullable
