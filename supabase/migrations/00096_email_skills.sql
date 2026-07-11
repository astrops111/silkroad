-- ============================================================
-- 00096_email_skills.sql — Admin-creatable AI email-processing
-- skills, execution log, managed email templates, and the
-- human-approval draft queue (AI never sends autonomously).
-- ============================================================

-- ------------------------------------------------------------
-- email_skills — one row per configurable processing rule
-- trigger_conditions: { from_pattern?, subject_pattern?,
--   intents?: string[], direction?: 'inbound' }
-- allowed_actions constrain the tool set given to the model.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mailbox_id uuid REFERENCES mailboxes(id) ON DELETE CASCADE, -- null = all mailboxes
  trigger_conditions jsonb NOT NULL DEFAULT '{}',
  prompt_template text NOT NULL,
  allowed_actions text[] NOT NULL DEFAULT '{}',
  priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_skills_actions_valid CHECK (
    allowed_actions <@ ARRAY['draft_reply','create_ticket','link_to_rfq','create_crm_activity','escalate']::text[]
  )
);

-- ------------------------------------------------------------
-- email_skill_runs — audit + idempotency per (skill, message)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_skill_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES email_skills(id) ON DELETE CASCADE,
  email_message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'skipped')),
  actions_taken jsonb NOT NULL DEFAULT '[]',
  ai_output jsonb,
  error_message text,
  input_tokens int,
  output_tokens int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, email_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_skill_runs_message
  ON email_skill_runs (email_message_id);

-- ------------------------------------------------------------
-- email_templates — managed templates with {{variable}} slots,
-- used by transactional sends and as AI draft skeletons.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'reply', 'outreach')),
  subject_template text NOT NULL,
  html_template text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Human-approval queue: AI drafts are email_messages rows in
-- folder 'Drafts' with a review status. Nothing sends without
-- an admin approving (and optionally editing) the draft.
-- ------------------------------------------------------------
ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS draft_status text
    CHECK (draft_status IN ('pending_review', 'approved', 'discarded')),
  ADD COLUMN IF NOT EXISTS draft_skill_run_id uuid REFERENCES email_skill_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS draft_source_message_id uuid REFERENCES email_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_email_messages_drafts
  ON email_messages (mailbox_id, draft_status)
  WHERE draft_status = 'pending_review';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE email_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_skill_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email skills" ON email_skills
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins read skill runs" ON email_skill_runs
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins manage email templates" ON email_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- Feature flag — disabled by default; the runner no-ops until
-- an admin switches it on.
-- ------------------------------------------------------------
INSERT INTO ai_feature_flags (id, name, description, category, is_enabled, config)
VALUES (
  'email_skills',
  'AI Email Skills',
  'Admin-defined AI processing of inbound mailbox email: triage, draft replies (human-approved), RFQ linking, CRM logging, escalation.',
  'operations',
  false,
  '{"model": "claude-sonnet-4-20250514", "batchSize": 20}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Seed starter templates mirroring the Phase 1 transactional
-- emails so admins can begin editing copy immediately.
-- ------------------------------------------------------------
INSERT INTO email_templates (name, category, subject_template, html_template, variables) VALUES
  (
    'rfq_submitted_supplier',
    'transactional',
    'New RFQ {{rfqNumber}} — {{title}}',
    '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;"><h1>New Request for Quotation</h1><p>Hi {{supplierName}},</p><p><strong>{{buyerCompany}}</strong> has requested a quote from you for <strong>{{title}}</strong> ({{quantity}} {{unit}}). Quote deadline: {{deadline}}.</p><p><a href="{{actionUrl}}">Submit your quote</a></p></div>',
    ARRAY['rfqNumber','title','supplierName','buyerCompany','quantity','unit','deadline','actionUrl']
  ),
  (
    'quotation_received_buyer',
    'transactional',
    'New Quote for {{rfqNumber}} — {{title}}',
    '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;"><h1>New Quotation Received</h1><p>Hi {{buyerName}},</p><p><strong>{{supplierName}}</strong> has submitted a quotation for your RFQ <strong>{{rfqNumber}}</strong>. Review and compare quotes to find the best deal.</p><p><a href="{{actionUrl}}">View quotations</a></p></div>',
    ARRAY['rfqNumber','title','buyerName','supplierName','actionUrl']
  ),
  (
    'support_auto_ack',
    'reply',
    'We received your message — {{ticketNumber}}',
    '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;"><p>Hi {{requesterName}},</p><p>Thanks for reaching out to SilkRoad Africa support. Your request has been logged as <strong>{{ticketNumber}}</strong> and our team will reply within 24 hours.</p><p>— SilkRoad Support</p></div>',
    ARRAY['requesterName','ticketNumber']
  )
ON CONFLICT (name) DO NOTHING;
