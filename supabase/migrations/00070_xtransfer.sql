-- ============================================================
-- 00070_xtransfer.sql — XTransfer payout gateway fields
-- ============================================================
-- XTransfer is a cross-border B2B remittance platform used
-- to pay CN/SEA/KR/JP suppliers. These fields store the
-- XTransfer-side identifiers needed to initiate payouts.

-- supplier_profiles: XTransfer beneficiary / payee details
ALTER TABLE supplier_profiles
  ADD COLUMN IF NOT EXISTS xtransfer_payee_id       TEXT,        -- XTransfer beneficiary ID (from /beneficiary/create)
  ADD COLUMN IF NOT EXISTS xtransfer_payee_status    TEXT,        -- "active" | "pending_review" | "rejected"
  ADD COLUMN IF NOT EXISTS xtransfer_payout_currency CHAR(3) DEFAULT 'CNY'; -- preferred payout currency

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_xtransfer
  ON supplier_profiles(xtransfer_payee_id)
  WHERE xtransfer_payee_id IS NOT NULL;

-- settlements: XTransfer transfer reference for payout traceability
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS xtransfer_transfer_id TEXT; -- XTransfer transferId from /transfer/create

CREATE INDEX IF NOT EXISTS idx_settlements_xtransfer
  ON settlements(xtransfer_transfer_id)
  WHERE xtransfer_transfer_id IS NOT NULL;

COMMENT ON COLUMN supplier_profiles.xtransfer_payee_id IS
  'XTransfer beneficiary ID. Populated by POST /api/admin/xtransfer/register-supplier. Required for XTransfer payouts.';
COMMENT ON COLUMN settlements.xtransfer_transfer_id IS
  'XTransfer transferId for the outbound payout. Set when payout_method = xtransfer.';
