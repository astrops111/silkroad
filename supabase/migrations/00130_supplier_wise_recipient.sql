-- ============================================================
-- 00130_supplier_wise_recipient.sql
-- Wise Business payout rail: store the supplier's Wise recipient
-- (target account) id. Set after creating the recipient in the
-- Wise dashboard/API. When present (and WISE_API_TOKEN +
-- WISE_PROFILE_ID are configured) the settlement engine pays out
-- via Wise ahead of the Flutterwave mobile-money/bank fallback.
-- ============================================================

ALTER TABLE supplier_profiles
  ADD COLUMN IF NOT EXISTS wise_recipient_id TEXT;

COMMENT ON COLUMN supplier_profiles.wise_recipient_id IS
  'Wise (TransferWise) target account id for supplier payouts. Payout priority: xtransfer > stripe > wise > flutterwave momo > flutterwave bank.';
