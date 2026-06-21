-- ─────────────────────────────────────────────────────────────
-- 00079 — Schema additions for review fixes
--
-- 1. customs_duty_assessed_minor / customs_vat_assessed_minor /
--    customs_other_assessed_minor / customs_assessed_currency
--    Assessed amounts are distinct from paid amounts.  Previously
--    customs.duties_assessed was writing into the _paid_ columns by
--    mistake; this migration adds the correct _assessed_ columns so
--    assessed ≠ paid is tracked independently.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS customs_duty_assessed_minor  BIGINT,
  ADD COLUMN IF NOT EXISTS customs_vat_assessed_minor   BIGINT,
  ADD COLUMN IF NOT EXISTS customs_other_assessed_minor BIGINT,
  ADD COLUMN IF NOT EXISTS customs_assessed_currency    CHAR(3);
