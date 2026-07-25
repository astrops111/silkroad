-- ============================================================
-- 00122_product_notes_column.sql
-- Some product names carry a leading parenthetical qualifier
-- (e.g. "(mini)Mask Fit Red Cushion 4.5g 24W", "(EU) Okra Phyto
-- Mucin Skin Booster"). We're relocating that qualifier to the
-- end of the name for readability, and additionally capturing it
-- here so it stays queryable/filterable on its own.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN products.notes IS
  'Free-text qualifier extracted from the product name (e.g. mini, EU, Sample) or other internal remarks.';
