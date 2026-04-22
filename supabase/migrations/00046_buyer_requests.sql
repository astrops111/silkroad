-- ============================================================
-- Buyer Requests — walk-in "Can't find what you want?" leads
-- ============================================================
-- Captures a buyer describing what they need when browsing didn't
-- surface a match. Ops follow up manually — no auto-matching yet.

CREATE TABLE IF NOT EXISTS buyer_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  company_name   TEXT,
  country_code   TEXT,

  category       TEXT,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  quantity       TEXT,
  budget_usd     TEXT,
  timeline       TEXT,

  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_review', 'matched', 'closed')),
  assigned_to    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ops_notes      TEXT,

  locale         TEXT,
  source_path    TEXT,
  user_agent     TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_requests_status  ON buyer_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_user    ON buyer_requests(buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_created ON buyer_requests(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_buyer_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_requests_updated_at ON buyer_requests;
CREATE TRIGGER trg_buyer_requests_updated_at
BEFORE UPDATE ON buyer_requests
FOR EACH ROW EXECUTE FUNCTION touch_buyer_requests_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE buyer_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can submit a request. Service role writes
-- bypass RLS; this policy lets authed users insert via PostgREST.
DROP POLICY IF EXISTS "Anyone can submit a buyer request" ON buyer_requests;
CREATE POLICY "Anyone can submit a buyer request" ON buyer_requests
  FOR INSERT WITH CHECK (true);

-- Signed-in buyers can read their own submissions.
DROP POLICY IF EXISTS "Buyers read their own requests" ON buyer_requests;
CREATE POLICY "Buyers read their own requests" ON buyer_requests
  FOR SELECT USING (
    buyer_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = buyer_user_id AND up.auth_id = auth.uid()
    )
  );

-- Super admins can read and manage all.
DROP POLICY IF EXISTS "Super admins manage buyer requests" ON buyer_requests;
CREATE POLICY "Super admins manage buyer requests" ON buyer_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_id
      WHERE up.auth_id = auth.uid()
        AND cm.role = 'admin_super'
    )
  );
