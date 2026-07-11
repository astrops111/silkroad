-- ============================================================
-- 00097_tickets.sql — Support ticketing: tickets + event log.
-- Intake: inbound support@ email (mail-sync hook), in-app
-- requests, and the AI email-skill create_ticket action.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE
    DEFAULT 'TKT-' || lpad(nextval('ticket_number_seq')::text, 6, '0'),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source text NOT NULL CHECK (source IN ('email', 'in_app', 'ai')),
  requester_email text,
  requester_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  assignee_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  email_thread_id uuid REFERENCES email_threads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  deal_thread_id uuid REFERENCES deal_threads(id) ON DELETE SET NULL,
  ai_triage jsonb,
  sla_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets (assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_email_thread ON tickets (email_thread_id)
  WHERE email_thread_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'status_changed', 'assigned', 'priority_changed',
    'comment', 'email_in', 'email_out', 'ai_triage'
  )),
  actor_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON ticket_events (ticket_id, created_at);

-- ------------------------------------------------------------
-- RLS: admins manage everything; requesters can read their own
-- tickets (future buyer-facing ticket view).
-- ------------------------------------------------------------
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tickets" ON tickets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Requesters read own tickets" ON tickets
  FOR SELECT USING (requester_user_id = get_user_profile_id());

CREATE POLICY "Admins manage ticket events" ON ticket_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Requesters read own ticket events" ON ticket_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.requester_user_id = get_user_profile_id()
    )
  );
