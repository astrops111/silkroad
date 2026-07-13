-- ============================================================
-- 00111_shopping_assistant_logs.sql
-- Conversation log for the public shopping assistant. Sessions are
-- anonymous (random client-generated session_id — the assistant has
-- no access to accounts by design); page_path records WHERE on the
-- site each exchange happened. Written by the API route with the
-- service role; admins read for product/UX insight.
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_assistant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  page_path TEXT,                -- e.g. /marketplace/8a399925-…
  locale TEXT,
  products_mentioned JSONB,      -- uuid[] of catalog products surfaced (assistant rows)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sal_session ON shopping_assistant_logs(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sal_created ON shopping_assistant_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sal_page ON shopping_assistant_logs(page_path);

ALTER TABLE shopping_assistant_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for inserts; only admins may read.
DO $$ BEGIN
  DROP POLICY IF EXISTS "sal_admin_read" ON shopping_assistant_logs;
END $$;

CREATE POLICY "sal_admin_read" ON shopping_assistant_logs
  FOR SELECT USING (is_admin());
