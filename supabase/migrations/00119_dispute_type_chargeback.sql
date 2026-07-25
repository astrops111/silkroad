-- ============================================================
-- 00119_dispute_type_chargeback.sql
-- Adds 'chargeback' as a valid dispute_type value, for gateway-initiated
-- disputes (card network chargebacks, etc.) recorded via payment webhooks.
--
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction as any
-- statement that uses the new value, so this is isolated in its own
-- migration file with nothing else in it.
-- ============================================================

ALTER TYPE dispute_type ADD VALUE IF NOT EXISTS 'chargeback';
