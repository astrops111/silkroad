-- ============================================================
-- companies.type now accepts 'both' for orgs that operate as a
-- buyer AND a supplier on the platform.
-- ============================================================

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_type_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_type_check
  CHECK (type IN ('buyer_org', 'supplier', 'logistics', 'both'));
