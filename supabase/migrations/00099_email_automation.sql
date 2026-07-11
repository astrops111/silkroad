-- ============================================================
-- 00099_email_automation.sql — Auto-responses + automated email
-- chains (drip/follow-up sequences).
--
-- 7b: per-mailbox auto-reply (loop-safe, cooldown per sender).
-- 7c: sequences — trigger event enrolls a subject (rfq/order/user),
--     steps send templated emails after delays, stop conditions
--     end the chain when the subject converts/replies.
-- ============================================================

-- ------------------------------------------------------------
-- Per-mailbox auto-response (first-touch acknowledgement)
-- ------------------------------------------------------------
ALTER TABLE mailboxes
  ADD COLUMN IF NOT EXISTS auto_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_reply_cooldown_hours int NOT NULL DEFAULT 24;

-- ------------------------------------------------------------
-- Sequences
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  trigger_event text NOT NULL CHECK (trigger_event IN (
    'rfq_no_quote', 'quote_expiring', 'order_payment_pending',
    'post_delivery_review', 'user_registered', 'custom'
  )),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  delay_hours int NOT NULL DEFAULT 24,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  subject_template text,          -- fallback when no managed template
  html_template text,
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('rfq', 'quotation', 'order', 'user')),
  subject_id uuid NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  current_step int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped')),
  next_send_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_due
  ON email_sequence_enrollments (next_send_at)
  WHERE status = 'active';

-- ------------------------------------------------------------
-- RLS — admin-only (cron uses service client)
-- ------------------------------------------------------------
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email sequences" ON email_sequences
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage sequence steps" ON email_sequence_steps
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins manage sequence enrollments" ON email_sequence_enrollments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- Starter sequences (inactive until an admin enables them)
-- ------------------------------------------------------------
INSERT INTO email_sequences (name, description, trigger_event, is_active) VALUES
  (
    'rfq_no_quote_reminder',
    'Remind the invited supplier when an RFQ has no quote after 48h; escalate to ops at 96h.',
    'rfq_no_quote',
    false
  ),
  (
    'quote_expiring_nudge',
    'Nudge the buyer 3 days before a received quotation expires.',
    'quote_expiring',
    false
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_sequence_steps (sequence_id, step_order, delay_hours, subject_template, html_template)
SELECT s.id, v.step_order, v.delay_hours, v.subject_template, v.html_template
FROM email_sequences s
JOIN (VALUES
  ('rfq_no_quote_reminder', 1, 48,
   'Reminder: quote requested — {{rfqNumber}}',
   '<div style="font-family:system-ui,sans-serif;"><p>Hi {{name}},</p><p>A buyer is still waiting for your quote on <strong>{{rfqNumber}}</strong>. Submitting promptly greatly increases your win rate.</p><p><a href="{{actionUrl}}">Submit your quote</a></p></div>'),
  ('rfq_no_quote_reminder', 2, 96,
   'Second reminder: {{rfqNumber}} still unquoted',
   '<div style="font-family:system-ui,sans-serif;"><p>Hi {{name}},</p><p><strong>{{rfqNumber}}</strong> remains unquoted. If you cannot serve this request, let us know and we will guide the buyer to alternatives.</p></div>'),
  ('quote_expiring_nudge', 1, 0,
   'Your quote for {{rfqNumber}} expires soon',
   '<div style="font-family:system-ui,sans-serif;"><p>Hi {{name}},</p><p>The quotation you received for <strong>{{rfqNumber}}</strong> expires in 3 days. Review and award it before it lapses.</p><p><a href="{{actionUrl}}">Compare quotes</a></p></div>')
) AS v(sequence_name, step_order, delay_hours, subject_template, html_template)
  ON v.sequence_name = s.name
ON CONFLICT (sequence_id, step_order) DO NOTHING;
