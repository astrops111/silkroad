-- ============================================================
-- Supplier Applications — inbound requests to open a supplier account
-- ============================================================
-- A prospective supplier fills in a contact form describing their business
-- and the products they want to sell. Platform admins review and approve
-- (or reject) each application from the admin inbox at
-- /admin/supplier-applications. Approval is a manual step — admins create
-- the company + supplier_profile + owner membership outside this table.

CREATE TABLE IF NOT EXISTS supplier_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Contact
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  role_at_company     TEXT,

  -- Company
  company_name        TEXT NOT NULL,
  company_name_local  TEXT,
  country_code        TEXT,
  city                TEXT,
  website             TEXT,
  years_in_business   TEXT,
  employee_range      TEXT,

  -- Products / capabilities
  product_categories  TEXT[] DEFAULT '{}',
  products_description TEXT NOT NULL,
  monthly_capacity    TEXT,
  existing_markets    TEXT,
  certifications      TEXT,
  sample_available    BOOLEAN DEFAULT false,

  -- Workflow
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'contacted')),
  assigned_to         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  admin_notes         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Provenance
  locale              TEXT,
  source_path         TEXT,
  user_agent          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_apps_status   ON supplier_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_apps_user     ON supplier_applications(requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_apps_created  ON supplier_applications(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_supplier_applications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_apps_updated_at ON supplier_applications;
CREATE TRIGGER trg_supplier_apps_updated_at
BEFORE UPDATE ON supplier_applications
FOR EACH ROW EXECUTE FUNCTION touch_supplier_applications_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE supplier_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can submit an application.
DROP POLICY IF EXISTS "Anyone can submit a supplier application" ON supplier_applications;
CREATE POLICY "Anyone can submit a supplier application" ON supplier_applications
  FOR INSERT WITH CHECK (true);

-- Signed-in requesters can read their own submissions.
DROP POLICY IF EXISTS "Requesters read their own applications" ON supplier_applications;
CREATE POLICY "Requesters read their own applications" ON supplier_applications
  FOR SELECT USING (
    requester_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = requester_user_id AND up.auth_id = auth.uid()
    )
  );

-- Platform admins can read and manage all applications.
DROP POLICY IF EXISTS "Admins manage supplier applications" ON supplier_applications;
CREATE POLICY "Admins manage supplier applications" ON supplier_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_id
      WHERE up.auth_id = auth.uid()
        AND cm.role IN ('admin_super', 'admin_moderator', 'admin_support')
    )
  );
