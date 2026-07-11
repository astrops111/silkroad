-- ============================================================
-- 00101_product_variants_expansion.sql — Amazon-style variants
--
-- product_variants already existed (00004_products.sql) but was
-- never wired up: no per-variant SKU fields (barcode/MOQ/pack
-- qty), no per-variant images, and no way to mark a default.
-- rfq_items was missing the variant_id that quotation_items and
-- supplier_order_items already carry, closing that gap here.
-- merged_into_product_id lets the data-migration script soft-
-- merge duplicate/variant product rows without ever deleting a
-- row that a past order/quote may reference.
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS jan_code TEXT,
  ADD COLUMN IF NOT EXISTS moq INT,
  ADD COLUMN IF NOT EXISTS box_pack_qty INT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_product_variants_jan_code
  ON product_variants(jan_code) WHERE jan_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_one_default
  ON product_variants(product_id) WHERE is_default;

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_images_variant
  ON product_images(variant_id) WHERE variant_id IS NOT NULL;

ALTER TABLE rfq_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_items_variant
  ON rfq_items(variant_id) WHERE variant_id IS NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS merged_into_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_merged_into
  ON products(merged_into_product_id) WHERE merged_into_product_id IS NOT NULL;

COMMENT ON COLUMN product_variants.jan_code IS 'Variant-specific JAN/EAN/UPC barcode; falls back to products.jan_code when null.';
COMMENT ON COLUMN product_variants.moq IS 'Variant-specific MOQ; falls back to products.moq when null.';
COMMENT ON COLUMN product_variants.box_pack_qty IS 'Variant-specific units-per-box; falls back to products.box_pack_qty when null.';
COMMENT ON COLUMN product_variants.is_default IS 'The variant pre-selected on the product page; at most one per product.';
COMMENT ON COLUMN product_images.variant_id IS 'Null = parent-level fallback image shown for any variant lacking its own photos.';
COMMENT ON COLUMN products.merged_into_product_id IS 'Set when this row was soft-merged into another product as a variant/duplicate; row stays inactive but is never deleted (order/quote history may reference it).';
