-- ============================================================
-- 00094_mail_system.sql — Admin webmail: mailboxes, IMAP sync
-- state, email threads/messages/attachments + storage bucket.
--
-- Mailboxes are hosted at Namecheap Private Email
-- (mail.privateemail.com — IMAP 993 SSL / SMTP 465 SSL) and
-- synced into these tables by /api/cron/mail-sync. Passwords are
-- NOT stored here: credential_ref names the Vercel env var that
-- holds the mailbox password (MAIL_PW_SALES etc.).
-- ============================================================

-- ------------------------------------------------------------
-- mailboxes — one row per hosted address
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  display_name text NOT NULL,
  -- shared: team boxes like sales@ — access via mailbox_permissions grants.
  -- personal: one admin user's company mailbox — access via owner_user_id.
  mailbox_type text NOT NULL DEFAULT 'shared' CHECK (mailbox_type IN ('shared', 'personal')),
  owner_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  imap_host text NOT NULL DEFAULT 'mail.privateemail.com',
  imap_port int NOT NULL DEFAULT 993,
  smtp_host text NOT NULL DEFAULT 'mail.privateemail.com',
  smtp_port int NOT NULL DEFAULT 465,
  username text NOT NULL,
  credential_ref text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- mailbox_permissions — per-admin-user access grants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'send', 'manage')),
  granted_by uuid REFERENCES user_profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mailbox_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mailbox_permissions_user
  ON mailbox_permissions (user_id);

-- ------------------------------------------------------------
-- mailbox_sync_state — incremental IMAP sync checkpoint
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_sync_state (
  mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  folder text NOT NULL,
  uidvalidity bigint,
  last_uid bigint NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  PRIMARY KEY (mailbox_id, folder)
);

-- ------------------------------------------------------------
-- email_threads — conversation grouping within a mailbox
-- (deal_thread_id FK is added in 00095 once deal_threads exists)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  subject_normalized text,
  first_message_at timestamptz,
  last_message_at timestamptz,
  message_count int NOT NULL DEFAULT 0,
  deal_thread_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_mailbox
  ON email_threads (mailbox_id, last_message_at DESC);

-- ------------------------------------------------------------
-- email_messages — one row per message, inbound and outbound
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES email_threads(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id text,
  in_reply_to text,
  references_header text[],
  imap_uid bigint,
  folder text,
  from_address text NOT NULL,
  from_name text,
  to_addresses text[] NOT NULL,
  cc_addresses text[],
  subject text,
  text_body text,
  html_body text,
  snippet text,
  is_read boolean NOT NULL DEFAULT false,
  skill_processed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mailbox_id, folder, imap_uid)
);

-- Dedupe by RFC 5322 Message-ID within a mailbox (Sent-folder copies of
-- messages we already inserted at SMTP time hit this and are skipped).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_messages_msgid
  ON email_messages (mailbox_id, message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_messages_thread
  ON email_messages (thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_unprocessed
  ON email_messages (skill_processed_at)
  WHERE skill_processed_at IS NULL AND direction = 'inbound';
CREATE INDEX IF NOT EXISTS idx_email_messages_from
  ON email_messages (from_address, created_at DESC);

-- ------------------------------------------------------------
-- email_attachments — stored in the email-attachments bucket
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  filename text,
  content_type text,
  size_bytes int,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message
  ON email_attachments (email_message_id);

-- ------------------------------------------------------------
-- Access helper — mailbox visibility is per admin user:
--   admin_super sees everything; a personal mailbox is visible to
--   its owner; any mailbox is visible via a mailbox_permissions
--   grant. Cron/service client bypasses RLS entirely.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_super_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = get_user_profile_id()
      AND cm.role = 'admin_super'
  );
$$;

CREATE OR REPLACE FUNCTION can_access_mailbox(p_mailbox_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin_user()
  OR EXISTS (
    SELECT 1 FROM mailboxes m
    WHERE m.id = p_mailbox_id
      AND m.owner_user_id = get_user_profile_id()
  )
  OR EXISTS (
    SELECT 1 FROM mailbox_permissions mp
    WHERE mp.mailbox_id = p_mailbox_id
      AND mp.user_id = get_user_profile_id()
  );
$$;

-- ------------------------------------------------------------
-- RLS — permission-based (cron uses the service client, bypasses)
-- ------------------------------------------------------------
ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read accessible mailboxes" ON mailboxes
  FOR SELECT USING (can_access_mailbox(id));
CREATE POLICY "Super admins manage mailboxes" ON mailboxes
  FOR ALL USING (is_super_admin_user()) WITH CHECK (is_super_admin_user());

CREATE POLICY "Users read own mailbox grants" ON mailbox_permissions
  FOR SELECT USING (user_id = get_user_profile_id() OR is_super_admin_user());
CREATE POLICY "Super admins manage mailbox grants" ON mailbox_permissions
  FOR ALL USING (is_super_admin_user()) WITH CHECK (is_super_admin_user());

CREATE POLICY "Users read sync state of accessible mailboxes" ON mailbox_sync_state
  FOR SELECT USING (can_access_mailbox(mailbox_id));

CREATE POLICY "Users access threads of accessible mailboxes" ON email_threads
  FOR ALL USING (can_access_mailbox(mailbox_id)) WITH CHECK (can_access_mailbox(mailbox_id));

CREATE POLICY "Users access messages of accessible mailboxes" ON email_messages
  FOR ALL USING (can_access_mailbox(mailbox_id)) WITH CHECK (can_access_mailbox(mailbox_id));

CREATE POLICY "Users access attachments of accessible mailboxes" ON email_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM email_messages em
      WHERE em.id = email_message_id AND can_access_mailbox(em.mailbox_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_messages em
      WHERE em.id = email_message_id AND can_access_mailbox(em.mailbox_id)
    )
  );

-- ------------------------------------------------------------
-- Seed the three hosted mailboxes
-- ------------------------------------------------------------
INSERT INTO mailboxes (address, display_name, username, credential_ref)
VALUES
  ('sales@silkroad.africa',    'SilkRoad Sales',     'sales@silkroad.africa',    'MAIL_PW_SALES'),
  ('logistic@silkroad.africa', 'SilkRoad Logistics', 'logistic@silkroad.africa', 'MAIL_PW_LOGISTIC'),
  ('support@silkroad.africa',  'SilkRoad Support',   'support@silkroad.africa',  'MAIL_PW_SUPPORT')
ON CONFLICT (address) DO NOTHING;

-- ------------------------------------------------------------
-- Private storage bucket for attachments (same pattern as 00059)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Object paths are "{mailbox_id}/{message_id}/{filename}", so the first
-- path segment drives the same per-user mailbox access check as the tables.
DO $$ BEGIN
  DROP POLICY IF EXISTS "email-attachments mailbox read" ON storage.objects;
END $$;
CREATE POLICY "email-attachments mailbox read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'email-attachments'
    AND can_access_mailbox(((storage.foldername(name))[1])::uuid)
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "email-attachments mailbox write" ON storage.objects;
END $$;
CREATE POLICY "email-attachments mailbox write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'email-attachments'
    AND can_access_mailbox(((storage.foldername(name))[1])::uuid)
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "email-attachments mailbox delete" ON storage.objects;
END $$;
CREATE POLICY "email-attachments mailbox delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'email-attachments'
    AND can_access_mailbox(((storage.foldername(name))[1])::uuid)
  );
