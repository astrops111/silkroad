-- ============================================================
-- 00054_document_requirements.sql
-- Per-destination shipping & customs document checklist.
-- Ops maintains rules like "to KE you need a CoO; to NG you need
-- SONCAP; CITES if HS = 9603..." — engine/UI uses this to render
-- a docs-needed checklist on each shipment.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'commercial_invoice',
    'packing_list',
    'bill_of_lading',
    'air_waybill',
    'certificate_of_origin',
    'sgs_inspection',          -- pre-shipment inspection (KE, MZ, etc.)
    'soncap',                  -- Nigeria SONCAP / SC certificate
    'pvoc',                    -- Pre-export verification of conformity
    'fumigation',
    'phytosanitary',
    'health_certificate',
    'cites',                   -- endangered species
    'msds',                    -- material safety data sheet (DG)
    'dg_declaration',          -- dangerous goods declaration
    'insurance_certificate',
    'form_e',                  -- China-ASEAN FTA
    'form_a',                  -- GSP
    'form_m',                  -- Nigeria import declaration
    'epz_permit',              -- EPZ / free zone
    'import_license',
    'tax_id_certificate',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_country CHAR(2) NOT NULL,

  document_type document_type NOT NULL,
  -- Optional scoping. If both NULL, the rule applies to every shipment to this country.
  hs_prefix TEXT,             -- e.g. only required for HS starting with this prefix
  shipping_method TEXT,       -- only required for this shipping_method (matches enum value)
  container_type TEXT,        -- only required for this container_type (matches enum value)

  is_required BOOLEAN NOT NULL DEFAULT true,    -- vs. recommended
  notes TEXT,
  external_url TEXT,          -- link to the issuing-authority page or template

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_country ON document_requirements(destination_country)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_doc_req_country_type ON document_requirements(destination_country, document_type)
  WHERE is_active = true;

-- updated_at trigger reuse
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_doc_req_updated_at ON document_requirements';
    EXECUTE 'CREATE TRIGGER trg_doc_req_updated_at BEFORE UPDATE ON document_requirements
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END $$;

-- RLS — admin-only (matches the rest of the logistics module).
ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "doc_requirements internal read" ON document_requirements;
  DROP POLICY IF EXISTS "doc_requirements internal write" ON document_requirements;
END $$;

CREATE POLICY "doc_requirements internal read" ON document_requirements
  FOR SELECT USING (is_admin());
CREATE POLICY "doc_requirements internal write" ON document_requirements
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Seed: a small starter set of common rules for the destinations we already
-- have port coverage for. Ops will refine; this is just enough that the docs
-- panel renders something useful out of the box.
INSERT INTO document_requirements (destination_country, document_type, is_required, notes) VALUES
  -- Universal
  ('KE', 'commercial_invoice', true, NULL),
  ('KE', 'packing_list', true, NULL),
  ('KE', 'bill_of_lading', true, 'For sea freight only'),
  ('KE', 'certificate_of_origin', true, 'Required for tariff classification'),
  ('KE', 'sgs_inspection', true, 'PVoC required pre-shipment'),

  ('NG', 'commercial_invoice', true, NULL),
  ('NG', 'packing_list', true, NULL),
  ('NG', 'bill_of_lading', true, NULL),
  ('NG', 'soncap', true, 'SONCAP certificate required for regulated goods'),
  ('NG', 'form_m', true, 'Form M required for all imports')
  ON CONFLICT DO NOTHING;
