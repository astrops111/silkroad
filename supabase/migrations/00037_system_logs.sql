-- ============================================================
-- System Logs & Audit Trail for Super Admin
-- ============================================================

-- Activity types for the audit log
DO $$ BEGIN
  CREATE TYPE system_activity_type AS ENUM (
    'user_login', 'user_logout', 'user_registered',
    'company_created', 'company_verified', 'company_rejected',
    'product_created', 'product_approved', 'product_rejected',
    'order_created', 'order_status_changed',
    'payment_received', 'payment_failed',
    'dispute_opened', 'dispute_resolved',
    'settlement_processed', 'shipment_created', 'shipment_delivered',
    'rfq_published', 'admin_action', 'system_event', 'config_changed', 'role_changed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- System Activity Log (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type system_activity_type NOT NULL,
  actor_id      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_email   TEXT,
  target_type   TEXT,           -- e.g. 'product', 'order', 'company', 'user'
  target_id     UUID,
  target_label  TEXT,           -- human-readable label e.g. "ORD-2024-4871"
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_type ON system_activity_log(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON system_activity_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON system_activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON system_activity_log(created_at DESC);

-- ============================================================
-- Application Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level       log_level NOT NULL DEFAULT 'info',
  source      TEXT NOT NULL,       -- e.g. 'api/payments/stripe', 'worker/settlement'
  message     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  request_id  TEXT,                -- correlate logs within a single request
  user_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_request ON system_logs(request_id) WHERE request_id IS NOT NULL;

-- ============================================================
-- Error Logs (dedicated table for fast error querying)
-- ============================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code    TEXT,              -- e.g. 'PAYMENT_FAILED', 'AUTH_ERROR'
  message       TEXT NOT NULL,
  stack_trace   TEXT,
  source        TEXT NOT NULL,     -- e.g. 'api/orders', 'webhook/mtn-momo'
  severity      TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  request_id    TEXT,
  user_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_by   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_code ON error_logs(error_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);

-- ============================================================
-- RLS — only super admins can read
-- ============================================================
ALTER TABLE system_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Service role (API routes) can insert freely
DROP POLICY IF EXISTS "Service role manages activity log" ON system_activity_log;
CREATE POLICY "Service role manages activity log" ON system_activity_log
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages system logs" ON system_logs;
CREATE POLICY "Service role manages system logs" ON system_logs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages error logs" ON error_logs;
CREATE POLICY "Service role manages error logs" ON error_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Super admins can read all logs
DROP POLICY IF EXISTS "Super admins read activity log" ON system_activity_log;
CREATE POLICY "Super admins read activity log" ON system_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_id
      WHERE up.auth_id = auth.uid()
        AND cm.role = 'admin_super'
    )
  );

DROP POLICY IF EXISTS "Super admins read system logs" ON system_logs;
CREATE POLICY "Super admins read system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_id
      WHERE up.auth_id = auth.uid()
        AND cm.role = 'admin_super'
    )
  );

DROP POLICY IF EXISTS "Super admins read error logs" ON error_logs;
CREATE POLICY "Super admins read error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_id
      WHERE up.auth_id = auth.uid()
        AND cm.role = 'admin_super'
    )
  );
