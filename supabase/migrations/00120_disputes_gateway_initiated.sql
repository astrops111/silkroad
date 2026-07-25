-- ============================================================
-- 00120_disputes_gateway_initiated.sql
-- Allows disputes to be opened by a payment gateway (card-network
-- chargeback, forced refund dispute, etc.) rather than only by a buyer
-- through openDispute(). A gateway-initiated dispute has no acting
-- user, so opened_by_user_id must become nullable.
-- ============================================================

ALTER TABLE disputes ALTER COLUMN opened_by_user_id DROP NOT NULL;

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'buyer';
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_initiated_by_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_initiated_by_check
  CHECK (initiated_by IN ('buyer', 'gateway'));

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS gateway_dispute_id TEXT;

-- A gateway-initiated dispute has no opened_by_user_id, and every other
-- dispute must have one — keeps the two columns from drifting out of sync.
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_initiated_by_user_consistency;
ALTER TABLE disputes ADD CONSTRAINT disputes_initiated_by_user_consistency
  CHECK ((initiated_by = 'gateway') = (opened_by_user_id IS NULL));

-- Idempotency for webhook retries — the same gateway dispute/chargeback
-- notification can be delivered more than once. Composite (not just
-- gateway_dispute_id) because one chargeback against a multi-vendor
-- purchase order fans out to one disputes row per affected supplier_order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_gateway_dispute_id
  ON disputes(gateway_dispute_id, supplier_order_id)
  WHERE gateway_dispute_id IS NOT NULL;
