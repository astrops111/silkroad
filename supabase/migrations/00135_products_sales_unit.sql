-- products.sales_unit — the noun for ONE orderable unit of a listing.
--
-- Two different packing models now coexist:
--
--   box_pack_qty > 1  — the piece is the priced unit. base_price is per piece and
--                       the storefront multiplies by box_pack_qty to quote a box
--                       (korean-beauty-trading-co). sales_unit stays NULL.
--
--   sales_unit set    — the pack ITSELF is the priced unit. base_price is the price
--                       of one whole "Box"/"Bag" and nothing is multiplied, so the
--                       quoted price is exact rather than a per-piece rounding of it
--                       (HODAF OEM, where a box of 144 patches costs $1.40 — storing
--                       0.975c per piece in a BIGINT cents column would misquote it).
--
-- NULL means "Piece", which is every existing row's behaviour — nothing to backfill.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_unit TEXT;

COMMENT ON COLUMN products.sales_unit IS
  'Singular noun for one orderable unit (e.g. Box, Bag). NULL = Piece. When set, base_price is the price of one whole unit and moq counts those units.';
