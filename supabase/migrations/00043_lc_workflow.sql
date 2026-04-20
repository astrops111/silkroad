-- ============================================================
-- 00043_lc_workflow.sql — Letter of Credit workflow (UCP 600)
-- The resources portal settles via LC at sight or usance. No
-- third-party escrow; the platform orchestrates document
-- presentation and state transitions while funds flow bank-to-bank.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE lc_status AS ENUM (
    'draft',             -- buyer drafting application
    'applied',           -- application submitted to issuing bank
    'issued',            -- issuing bank has issued LC
    'advised',           -- advising bank has advised beneficiary
    'confirmed',         -- confirmed by a confirming bank (optional)
    'docs_presented',    -- beneficiary presented docs to negotiating bank
    'discrepancies',     -- bank flagged discrepancies
    'accepted',          -- applicant accepted docs (or bank waived)
    'settled',           -- beneficiary paid, applicant reimbursed
    'expired',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lc_type AS ENUM (
    'sight',             -- payable on sight of compliant docs
    'usance_30',
    'usance_60',
    'usance_90',
    'usance_120',
    'usance_180'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Letters of credit ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS letters_of_credit (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_reference            TEXT UNIQUE NOT NULL,   -- platform reference (pre-issuance)
  bank_lc_number          TEXT,                    -- official LC number from issuing bank

  rfq_id                  UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  quotation_id            UUID REFERENCES quotations(id) ON DELETE SET NULL,

  applicant_company_id    UUID NOT NULL REFERENCES companies(id),  -- buyer
  beneficiary_company_id  UUID NOT NULL REFERENCES companies(id),  -- supplier

  -- Banks (free text until verified counterparty integrations exist)
  issuing_bank_name       TEXT,
  issuing_bank_swift      TEXT,
  advising_bank_name      TEXT,
  advising_bank_swift     TEXT,
  confirming_bank_name    TEXT,
  confirming_bank_swift   TEXT,

  -- Terms
  lc_type                 lc_type NOT NULL DEFAULT 'sight',
  amount_usd              NUMERIC(14,2) NOT NULL,
  tolerance_pct           NUMERIC(5,2) DEFAULT 5.00,  -- quantity/amount tolerance
  currency                CHAR(3) NOT NULL DEFAULT 'USD',
  ucp_version             TEXT NOT NULL DEFAULT 'UCP 600',

  -- Dates
  issue_date              DATE,
  expiry_date             DATE,
  latest_shipment_date    DATE,
  presentation_days       INT DEFAULT 21,       -- days after shipment to present docs

  -- Required documents (checklist of SWIFT MT700 field 46A items)
  documents_required      JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- e.g. ["commercial_invoice","packing_list","bill_of_lading",
  --       "certificate_of_origin","inspection_certificate","assay_report",
  --       "insurance_policy","phytosanitary_certificate"]

  -- State
  status                  lc_status NOT NULL DEFAULT 'draft',
  discrepancies           JSONB DEFAULT '[]'::jsonb,

  -- Settlement
  settled_amount_usd      NUMERIC(14,2),
  settled_at              TIMESTAMPTZ,

  -- Audit
  created_by              UUID REFERENCES user_profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (amount_usd > 0),
  CHECK (applicant_company_id <> beneficiary_company_id)
);

CREATE INDEX IF NOT EXISTS idx_lc_rfq         ON letters_of_credit(rfq_id);
CREATE INDEX IF NOT EXISTS idx_lc_quotation   ON letters_of_credit(quotation_id);
CREATE INDEX IF NOT EXISTS idx_lc_applicant   ON letters_of_credit(applicant_company_id);
CREATE INDEX IF NOT EXISTS idx_lc_beneficiary ON letters_of_credit(beneficiary_company_id);
CREATE INDEX IF NOT EXISTS idx_lc_status      ON letters_of_credit(status);

DROP TRIGGER IF EXISTS trg_lc_updated_at ON letters_of_credit;
CREATE TRIGGER trg_lc_updated_at
  BEFORE UPDATE ON letters_of_credit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Document presentations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lc_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_id            UUID NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,

  document_type    TEXT NOT NULL,     -- matches an entry in documents_required
  file_url         TEXT NOT NULL,
  file_name        TEXT,
  file_size_bytes  INT,

  presented_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  presented_by     UUID REFERENCES user_profiles(id),

  -- Review outcome
  review_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (review_status IN ('pending','accepted','discrepancy','waived')),
  review_notes     TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES user_profiles(id),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_documents_lc     ON lc_documents(lc_id);
CREATE INDEX IF NOT EXISTS idx_lc_documents_status ON lc_documents(lc_id, review_status);

-- ── State transition log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lc_state_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_id         UUID NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
  from_status   lc_status,
  to_status     lc_status NOT NULL,
  note          TEXT,
  actor_user_id UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_history_lc ON lc_state_history(lc_id, created_at DESC);

-- Log state changes automatically
CREATE OR REPLACE FUNCTION log_lc_state_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lc_state_history (lc_id, from_status, to_status, actor_user_id)
    VALUES (NEW.id, OLD.status, NEW.status, NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO lc_state_history (lc_id, from_status, to_status, actor_user_id)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lc_state_history ON letters_of_credit;
CREATE TRIGGER trg_lc_state_history
  AFTER INSERT OR UPDATE OF status ON letters_of_credit
  FOR EACH ROW EXECUTE FUNCTION log_lc_state_change();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE letters_of_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE lc_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lc_state_history  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lc_counterparties_read" ON letters_of_credit;
CREATE POLICY "lc_counterparties_read" ON letters_of_credit
  FOR SELECT USING (
    is_admin()
    OR applicant_company_id   = ANY(get_user_companies())
    OR beneficiary_company_id = ANY(get_user_companies())
  );

DROP POLICY IF EXISTS "lc_applicant_manages" ON letters_of_credit;
CREATE POLICY "lc_applicant_manages" ON letters_of_credit
  FOR ALL USING (
    is_admin() OR applicant_company_id = ANY(get_user_companies())
  )
  WITH CHECK (
    is_admin()
    OR (
      applicant_company_id = ANY(get_user_companies())
      AND is_paid_member(applicant_company_id)
    )
  );

DROP POLICY IF EXISTS "lc_docs_counterparties" ON lc_documents;
CREATE POLICY "lc_docs_counterparties" ON lc_documents
  FOR ALL USING (
    is_admin()
    OR lc_id IN (
      SELECT id FROM letters_of_credit
      WHERE applicant_company_id   = ANY(get_user_companies())
         OR beneficiary_company_id = ANY(get_user_companies())
    )
  );

DROP POLICY IF EXISTS "lc_history_counterparties" ON lc_state_history;
CREATE POLICY "lc_history_counterparties" ON lc_state_history
  FOR SELECT USING (
    is_admin()
    OR lc_id IN (
      SELECT id FROM letters_of_credit
      WHERE applicant_company_id   = ANY(get_user_companies())
         OR beneficiary_company_id = ANY(get_user_companies())
    )
  );
