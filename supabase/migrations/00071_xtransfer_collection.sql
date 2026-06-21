-- ============================================================
-- 00071_xtransfer_collection.sql — XTransfer inbound collection
-- ============================================================
-- Adds 'xtransfer' to the payment_gateway enum so buyer payments
-- via XTransfer (bank wire / SWIFT collection) can be recorded
-- in payment_transactions.gateway.

ALTER TYPE payment_gateway ADD VALUE IF NOT EXISTS 'xtransfer';
