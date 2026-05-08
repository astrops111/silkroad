-- ============================================================
-- Phase 3: Demurrage tracking, AR invoice linking, customs
-- declaration submission fields.
--
-- b2b_invoices already exists (00007). We only ADD columns.
-- b2b_shipments gets demurrage + customs-API tracking cols.
-- customs_hold_reason enum gains 'demurrage' and 'detention'.
-- ============================================================

-- ── 1. Demurrage / detention fields on b2b_shipments ────────
--
-- at_hub_since  : stamped when status first enters 'at_hub'.
--                 Used as the free-time clock baseline.
-- demurrage_flagged_at : set once the cron detects overrun;
--                 prevents duplicate events per container.
-- free_time_days : per-shipment override (default 5 days).

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS at_hub_since          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demurrage_flagged_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS free_time_days        INTEGER NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_b2b_shipments_demurrage_check
  ON b2b_shipments(at_hub_since)
  WHERE status = 'at_hub'
    AND at_hub_since IS NOT NULL
    AND demurrage_flagged_at IS NULL;

-- ── 2. Customs-API submission columns on b2b_shipments ──────
--
-- Tracks whether an electronic declaration was auto-submitted
-- via Kenya iCMS or Nigeria NICIS2 and the acknowledgement ref.

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS customs_api_submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customs_api_provider      TEXT,
  ADD COLUMN IF NOT EXISTS customs_api_ref           TEXT;

-- ── 3. Expand customs_hold_reason enum ──────────────────────
--
-- ADD VALUE cannot run inside a transaction on older Postgres.
-- Supabase applies migrations outside a txn block so the DO $$
-- guards are purely defensive.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'demurrage'
      AND enumtypid = 'customs_hold_reason'::regtype
  ) THEN
    ALTER TYPE customs_hold_reason ADD VALUE 'demurrage';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'detention'
      AND enumtypid = 'customs_hold_reason'::regtype
  ) THEN
    ALTER TYPE customs_hold_reason ADD VALUE 'detention';
  END IF;
END $$;

-- ── 4. Extend b2b_invoices for shipment linkage ──────────────
--
-- b2b_invoices is a partitioned table (00007_invoices.sql).
-- ALTER on the parent propagates to all child partitions in PG12+.
-- shipment_id  : optional — set when invoice is for a specific
--                delivery rather than just an order.
-- html_storage_path : Supabase Storage path for the HTML/PDF
--                rendition. Set by the AR issuer after upload.

-- b2b_shipments is partitioned on (id, created_at); a FK referencing only id
-- requires a standalone unique constraint which partitioned tables do not support
-- before PG16. Referential integrity enforced at the application layer.
ALTER TABLE b2b_invoices
  ADD COLUMN IF NOT EXISTS shipment_id        UUID,
  ADD COLUMN IF NOT EXISTS html_storage_path  TEXT;

CREATE INDEX IF NOT EXISTS idx_inv_shipment
  ON b2b_invoices(shipment_id)
  WHERE shipment_id IS NOT NULL;
