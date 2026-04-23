-- ============================================================
-- 00053_shipments_allow_ops_source.sql
-- Decouple b2b_shipments from supplier_order_id being NOT NULL.
-- Shipments can now originate from either (a) a platform supplier
-- order, or (b) an ops-originated freight quote (off-platform work).
-- ============================================================

-- 1) Allow supplier_order_id to be NULL on the parent (cascades to partitions).
ALTER TABLE b2b_shipments
  ALTER COLUMN supplier_order_id DROP NOT NULL;

-- 2) Add ops_freight_quote_id FK so we can point a shipment at an ops quote.
ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS ops_freight_quote_id UUID
    REFERENCES ops_freight_quotes(id);

CREATE INDEX IF NOT EXISTS idx_shipments_ops_freight_quote
  ON b2b_shipments(ops_freight_quote_id)
  WHERE ops_freight_quote_id IS NOT NULL;

-- 3) A shipment must have at least one source.
--    Idempotent: drop-if-exists then add.
DO $$ BEGIN
  EXECUTE 'ALTER TABLE b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_has_source';
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE b2b_shipments
  ADD CONSTRAINT b2b_shipments_has_source
    CHECK (supplier_order_id IS NOT NULL OR ops_freight_quote_id IS NOT NULL);
