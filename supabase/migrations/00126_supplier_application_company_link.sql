-- ============================================================
-- 00126_supplier_application_company_link.sql
-- Link approved supplier applications to the company that
-- approval provisions. Doubles as the idempotency marker so
-- re-approving an application never creates a second company.
-- ============================================================

ALTER TABLE supplier_applications
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
