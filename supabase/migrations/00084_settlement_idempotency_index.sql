-- ============================================================
-- 00084_settlement_idempotency_index.sql
--
-- Deferred unique index for settlement idempotency.
-- Cannot be in 00078 because 'cancelled' and 'voided' were
-- added to settlement_status in 00078, and PostgreSQL 55P04
-- prevents using newly-added enum values as index predicates
-- in the same transaction.
-- ============================================================

-- Prevent duplicate active settlement records for a single supplier order.
-- Covers the common case where supplier_order_ids has exactly one element.
-- Cancelled / voided settlements are excluded so re-settlement is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_single_order
  ON settlements((supplier_order_ids[1]))
  WHERE array_length(supplier_order_ids, 1) = 1
    AND status NOT IN ('cancelled', 'voided');
