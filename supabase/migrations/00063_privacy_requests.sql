-- California CCPA / CPRA privacy request log.
-- Accessible only via service role; no public RLS policies.
CREATE TABLE IF NOT EXISTS privacy_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text        NOT NULL CHECK (request_type IN ('know', 'delete', 'correct', 'opt_out')),
  full_name    text        NOT NULL,
  email        text        NOT NULL,
  details      text,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'in_review', 'completed', 'denied')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
-- No public policies — only service-role access for admin review.

CREATE INDEX IF NOT EXISTS privacy_requests_email_idx  ON privacy_requests (email);
CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON privacy_requests (status);
