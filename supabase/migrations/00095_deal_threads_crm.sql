-- ============================================================
-- 00095_deal_threads_crm.sql — Deal threads + built-in CRM
-- (contacts, opportunities, tasks, notes, activity timeline),
-- modeled on open-source CRM patterns (NextCRM / Twenty) and
-- implemented natively on the existing companies/user_profiles.
--
-- deal_threads is the umbrella that threads one RFQ deal through
-- quote → order → shipment → conversation → email thread.
-- crm_contacts integrates BOTH buyer and supplier platform users
-- (backfilled below) plus external email senders.
-- ============================================================

-- ------------------------------------------------------------
-- deal_threads
-- purchase/supplier order ids and shipment_id are plain uuids:
-- those tables are partitioned (composite PK, no plain-id unique
-- constraint to reference) — validated in application code.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deal_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid UNIQUE REFERENCES rfqs(id) ON DELETE SET NULL,
  quotation_id uuid,
  purchase_order_id uuid,
  supplier_order_id uuid,
  shipment_id uuid,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  buyer_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  supplier_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'closed')),
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_threads_buyer ON deal_threads (buyer_company_id);
CREATE INDEX IF NOT EXISTS idx_deal_threads_supplier ON deal_threads (supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_deal_threads_po ON deal_threads (purchase_order_id)
  WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_threads_so ON deal_threads (supplier_order_id)
  WHERE supplier_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_threads_shipment ON deal_threads (shipment_id)
  WHERE shipment_id IS NOT NULL;

-- ------------------------------------------------------------
-- crm_contacts — platform users (buyers AND suppliers) plus
-- external contacts discovered via email or added manually.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  title text,
  country_code text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('platform', 'email', 'manual', 'chatbot')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_email
  ON crm_contacts (lower(email))
  WHERE email IS NOT NULL AND user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts (company_id);

-- ------------------------------------------------------------
-- crm_opportunities — one per deal thread, stage auto-driven by
-- the RFQ → quote → order lifecycle.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  deal_thread_id uuid UNIQUE REFERENCES deal_threads(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  primary_contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead', 'rfq_submitted', 'quoted', 'negotiation', 'won', 'lost')),
  amount_minor bigint,
  currency text,
  owner_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  expected_close_date date,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities (stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_company ON crm_opportunities (company_id);

-- ------------------------------------------------------------
-- crm_tasks / crm_notes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assignee_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON crm_tasks (assignee_user_id, status);

CREATE TABLE IF NOT EXISTS crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- crm_activities — unified timeline (deal + company + contact)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL CHECK (activity_type IN (
    'rfq_submitted', 'quote_submitted', 'quote_accepted', 'quote_rejected',
    'order_created', 'payment_confirmed', 'shipment_milestone',
    'email_inbound', 'email_outbound', 'message_inbound', 'message_outbound',
    'ticket_created', 'ticket_resolved', 'note', 'task', 'ai_action'
  )),
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'user', 'ai')),
  actor_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  deal_thread_id uuid REFERENCES deal_threads(id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  email_message_id uuid REFERENCES email_messages(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_company ON crm_activities (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities (deal_thread_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity ON crm_activities (opportunity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities (contact_id, occurred_at DESC);
-- Idempotency guard for pipeline-retried milestone emails (Phase 6b)
CREATE INDEX IF NOT EXISTS idx_crm_activities_reference
  ON crm_activities (reference_type, reference_id, activity_type);

-- ------------------------------------------------------------
-- Link email threads to deals (column existed since 00094)
-- ------------------------------------------------------------
ALTER TABLE email_threads
  ADD CONSTRAINT email_threads_deal_thread_fk
  FOREIGN KEY (deal_thread_id) REFERENCES deal_threads(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- RLS — admin-only (writes happen via service client hooks)
-- ------------------------------------------------------------
ALTER TABLE deal_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deal threads" ON deal_threads
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage crm contacts" ON crm_contacts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage crm opportunities" ON crm_opportunities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage crm tasks" ON crm_tasks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage crm notes" ON crm_notes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage crm activities" ON crm_activities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- Backfill: every buyer AND supplier platform user becomes a
-- CRM contact under their company (user request).
-- ------------------------------------------------------------
INSERT INTO crm_contacts (user_id, company_id, full_name, email, phone, country_code, source)
SELECT DISTINCT ON (up.id)
  up.id,
  cm.company_id,
  up.full_name,
  up.email,
  up.phone,
  up.country_code,
  'platform'
FROM user_profiles up
JOIN company_members cm ON cm.user_id = up.id
JOIN companies c ON c.id = cm.company_id
WHERE cm.role NOT IN ('admin_super', 'admin_moderator', 'admin_support')
ORDER BY up.id, cm.is_primary DESC, cm.joined_at
ON CONFLICT (user_id) DO NOTHING;
