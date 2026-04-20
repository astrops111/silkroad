-- ============================================================
-- 00007_invoices.sql — B2B invoices, tax certificates, tax rates
-- ============================================================

-- B2B invoices (partitioned by created_at)
CREATE TABLE b2b_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  supplier_order_id UUID,
  purchase_order_id UUID,
  settlement_id UUID,
  invoice_number TEXT,
  invoice_type b2b_invoice_type NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,

  -- Issuer
  issuer_company_id UUID NOT NULL REFERENCES companies(id),
  issuer_tax_id TEXT,
  issuer_company_name TEXT,

  -- Recipient
  recipient_company_id UUID REFERENCES companies(id),
  recipient_tax_id TEXT,
  recipient_company_name TEXT,

  -- Carrier / donation (e-invoice)
  carrier_type TEXT,
  carrier_number TEXT,
  donation_code TEXT,

  -- Money (BIGINT, minor units)
  subtotal BIGINT NOT NULL,
  tax_rate NUMERIC(5,4) DEFAULT 0.05,
  tax_amount BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',

  -- Tax
  tax_type tax_type DEFAULT 'taxable',
  tax_system tax_system DEFAULT 'africa_vat',
  line_items JSONB NOT NULL DEFAULT '[]',

  -- China fapiao
  fapiao_code TEXT,
  fapiao_number TEXT,
  fapiao_check_code TEXT,
  golden_tax_response JSONB,

  -- Kenya eTIMS
  etims_cu_invoice_no TEXT,
  etims_response JSONB,

  -- Status & lifecycle
  status invoice_status DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  issue_attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,

  -- Region
  market_region market_region,
  country_code CHAR(2),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions: 2026 Q2, Q3, Q4
CREATE TABLE b2b_invoices_2026q2 PARTITION OF b2b_invoices
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE b2b_invoices_2026q3 PARTITION OF b2b_invoices
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE b2b_invoices_2026q4 PARTITION OF b2b_invoices
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX idx_inv_supplier_order ON b2b_invoices(supplier_order_id);
CREATE INDEX idx_inv_purchase_order ON b2b_invoices(purchase_order_id);
CREATE INDEX idx_inv_issuer ON b2b_invoices(issuer_company_id);
CREATE INDEX idx_inv_recipient ON b2b_invoices(recipient_company_id);
CREATE INDEX idx_inv_status ON b2b_invoices(status);
CREATE INDEX idx_inv_number ON b2b_invoices(invoice_number);
CREATE INDEX idx_inv_date ON b2b_invoices(invoice_date DESC);
CREATE INDEX idx_inv_country ON b2b_invoices(country_code);


-- ============================================================
-- Tax exemption certificates
-- ============================================================
CREATE TABLE tax_exemption_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,
  certificate_type TEXT NOT NULL,
  issuing_authority TEXT,
  document_url TEXT,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tec_company ON tax_exemption_certificates(company_id);
CREATE INDEX idx_tec_valid_until ON tax_exemption_certificates(valid_until);


-- ============================================================
-- Tax rates (per country/region)
-- ============================================================
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  region TEXT,
  rate NUMERIC(5,4) NOT NULL,
  tax_name TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  category TEXT,
  description TEXT,
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tr_country_active ON tax_rates(country_code, is_active);
