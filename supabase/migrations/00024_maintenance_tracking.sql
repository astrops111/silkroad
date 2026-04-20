-- ============================================================
-- Maintenance Tracking Tables for Super Admin
-- Covers: webhooks, AI usage, email delivery, gateway health,
-- sessions, scheduled jobs, db metrics, admin audit, storage,
-- subscriptions, shipment exceptions, API rate limits, cache
-- ============================================================

-- ============================================================
-- 1. WEBHOOK DELIVERY TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type      TEXT NOT NULL,          -- 'stripe', 'mtn_momo', 'airtel', 'alipay', 'wechat'
  event_type        TEXT NOT NULL,          -- e.g. 'payment_intent.succeeded'
  external_event_id TEXT,
  http_status_code  INT,
  request_headers   JSONB DEFAULT '{}',
  request_payload   JSONB DEFAULT '{}',
  response_payload  JSONB DEFAULT '{}',
  error_message     TEXT,
  retry_count       INT NOT NULL DEFAULT 0,
  last_retry_at     TIMESTAMPTZ,
  processing_time_ms INT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'failed', 'expired')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_type_status ON webhook_deliveries(webhook_type, status, created_at DESC);
CREATE INDEX idx_webhook_event ON webhook_deliveries(external_event_id);
CREATE INDEX idx_webhook_created ON webhook_deliveries(created_at DESC);

-- ============================================================
-- 2. AI FEATURE USAGE & TOKEN TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type    TEXT NOT NULL,            -- 'listing_generator', 'pricing_engine', 'support_agent', 'dispute_resolver', 'compliance_scanner'
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  model_used      TEXT,                     -- 'claude-sonnet-4-5-20250514', etc.
  input_tokens    INT NOT NULL DEFAULT 0,
  output_tokens   INT NOT NULL DEFAULT 0,
  total_tokens    INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
  request_duration_ms INT,
  status          TEXT NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success', 'error', 'partial', 'timeout')),
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_feature ON ai_usage_log(feature_type, created_at DESC);
CREATE INDEX idx_ai_usage_company ON ai_usage_log(company_id, created_at DESC);
CREATE INDEX idx_ai_usage_created ON ai_usage_log(created_at DESC);
CREATE INDEX idx_ai_usage_status ON ai_usage_log(status, created_at DESC);

-- Monthly quota per company per feature
CREATE TABLE IF NOT EXISTS ai_usage_quota (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_type  TEXT NOT NULL,
  monthly_limit INT NOT NULL DEFAULT 100,
  current_usage INT NOT NULL DEFAULT 0,
  month_start   DATE NOT NULL,
  month_end     DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_type, month_start)
);

-- ============================================================
-- 3. EMAIL DELIVERY TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS email_delivery_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id   TEXT,
  recipient_email     TEXT NOT NULL,
  subject             TEXT NOT NULL,
  template            TEXT,                 -- 'welcome', 'order_confirmation', 'password_reset', etc.
  sent_to_user_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  sent_to_company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  bounce_type         TEXT,                 -- 'permanent', 'temporary'
  bounce_reason       TEXT,
  error_message       TEXT,
  opened_at           TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_status ON email_delivery_log(status, created_at DESC);
CREATE INDEX idx_email_recipient ON email_delivery_log(recipient_email, created_at DESC);
CREATE INDEX idx_email_template ON email_delivery_log(template, created_at DESC);
CREATE INDEX idx_email_created ON email_delivery_log(created_at DESC);

-- ============================================================
-- 4. PAYMENT GATEWAY HEALTH METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS gateway_health_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway               TEXT NOT NULL,      -- 'stripe', 'mtn_momo', 'airtel_money', 'alipay', 'wechat_pay'
  is_available          BOOLEAN NOT NULL DEFAULT true,
  response_time_ms      INT,
  error_message         TEXT,
  transaction_count_24h INT DEFAULT 0,
  success_rate_24h      NUMERIC(5,2) DEFAULT 100.00,
  avg_processing_time_ms INT DEFAULT 0,
  checked_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_health ON gateway_health_checks(gateway, checked_at DESC);

-- Per-transaction gateway metrics
CREATE TABLE IF NOT EXISTS gateway_transaction_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway           TEXT NOT NULL,
  payment_id        UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  operation         TEXT NOT NULL,          -- 'charge', 'refund', 'capture', 'verify'
  amount            BIGINT,
  currency          CHAR(3),
  status            TEXT NOT NULL,          -- 'success', 'failed', 'timeout', 'pending'
  response_time_ms  INT,
  error_code        TEXT,
  error_message     TEXT,
  external_ref      TEXT,                   -- gateway's transaction ID
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_tx_gateway ON gateway_transaction_log(gateway, status, created_at DESC);
CREATE INDEX idx_gateway_tx_created ON gateway_transaction_log(created_at DESC);

-- ============================================================
-- 5. USER SESSION & LOGIN TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  ip_address      INET,
  user_agent      TEXT,
  device_type     TEXT,                     -- 'mobile', 'desktop', 'tablet'
  country_code    CHAR(2),
  logged_in_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  logged_out_at   TIMESTAMPTZ,
  is_suspicious   BOOLEAN NOT NULL DEFAULT false,
  suspicious_reason TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, last_activity_at DESC);
CREATE INDEX idx_sessions_suspicious ON user_sessions(is_suspicious) WHERE is_suspicious = true;

CREATE TABLE IF NOT EXISTS login_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ip_address      INET,
  user_agent      TEXT,
  status          TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked', 'mfa_required')),
  failure_reason  TEXT,                     -- 'invalid_password', 'account_locked', 'rate_limited'
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_email ON login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_ip ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX idx_login_status ON login_attempts(status, attempted_at DESC);

-- ============================================================
-- 6. SCHEDULED JOB TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name        TEXT NOT NULL,            -- 'expire_rate_locks', 'process_settlements', 'expire_rfqs', etc.
  job_type        TEXT NOT NULL DEFAULT 'pg_cron',  -- 'pg_cron', 'api_cron', 'background_worker'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INT,
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'success', 'failed', 'partial', 'timeout')),
  error_message   TEXT,
  rows_affected   INT DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  next_scheduled_run TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_runs_name ON scheduled_job_runs(job_name, created_at DESC);
CREATE INDEX idx_job_runs_status ON scheduled_job_runs(status, created_at DESC);
CREATE INDEX idx_job_runs_created ON scheduled_job_runs(created_at DESC);

-- ============================================================
-- 7. DATABASE METRICS (periodic snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS database_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name        TEXT NOT NULL,
  row_count         BIGINT DEFAULT 0,
  table_size_bytes  BIGINT DEFAULT 0,
  index_size_bytes  BIGINT DEFAULT 0,
  total_size_bytes  BIGINT DEFAULT 0,
  dead_rows         BIGINT DEFAULT 0,
  last_vacuum_at    TIMESTAMPTZ,
  last_analyze_at   TIMESTAMPTZ,
  measured_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_db_metrics_table ON database_metrics(table_name, measured_at DESC);
CREATE INDEX idx_db_metrics_measured ON database_metrics(measured_at DESC);

-- ============================================================
-- 8. ADMIN ACTION AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_action_audit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  admin_email       TEXT,
  action_type       TEXT NOT NULL,          -- 'company_suspension', 'product_removal', 'user_ban', 'role_change', 'data_export', 'config_change'
  target_entity     TEXT,                   -- 'company', 'product', 'user', 'order', 'config'
  target_id         UUID,
  target_label      TEXT,                   -- human-readable
  reason            TEXT,
  supporting_evidence JSONB DEFAULT '{}',
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approval_status   TEXT DEFAULT 'auto_approved'
                    CHECK (approval_status IN ('pending', 'approved', 'denied', 'auto_approved')),
  ip_address        INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin ON admin_action_audit(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_type ON admin_action_audit(action_type, created_at DESC);
CREATE INDEX idx_admin_audit_target ON admin_action_audit(target_entity, target_id);
CREATE INDEX idx_admin_audit_created ON admin_action_audit(created_at DESC);

-- ============================================================
-- 9. DATA DELETION REQUESTS (GDPR/CCPA)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  request_type    TEXT NOT NULL CHECK (request_type IN ('account_deletion', 'data_export', 'data_erasure')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'denied')),
  reason          TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at     TIMESTAMPTZ,             -- legal deadline (e.g. 30 days for GDPR)
  processed_by    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  denial_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deletion_status ON data_deletion_requests(status, deadline_at);

-- ============================================================
-- 10. FILE STORAGE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS file_storage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       TEXT NOT NULL,
  file_name       TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type       TEXT,
  file_category   TEXT,                     -- 'product_image', 'invoice', 'certificate', 'avatar', 'document'
  uploaded_by     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_company ON file_storage_log(company_id, created_at DESC);
CREATE INDEX idx_storage_category ON file_storage_log(file_category, created_at DESC);
CREATE INDEX idx_storage_deleted ON file_storage_log(is_deleted, created_at DESC);

-- ============================================================
-- 11. SUBSCRIPTION / BILLING AUDIT TRAIL
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type              TEXT NOT NULL,     -- 'created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'payment_failed', 'payment_recovered'
  tier_from               TEXT,
  tier_to                 TEXT,
  stripe_subscription_id  TEXT,
  stripe_invoice_id       TEXT,
  amount                  BIGINT,           -- in minor units
  currency                CHAR(3),
  billing_period_start    DATE,
  billing_period_end      DATE,
  failure_reason          TEXT,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_events_company ON subscription_events(company_id, created_at DESC);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type, created_at DESC);
CREATE INDEX idx_sub_events_created ON subscription_events(created_at DESC);

-- ============================================================
-- 12. SHIPMENT EXCEPTIONS & SLA
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_exceptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL NOT NULL,
  exception_type  TEXT NOT NULL,            -- 'delayed', 'lost', 'damaged', 'customs_hold', 'address_issue', 'weather', 'refused'
  description     TEXT,
  reported_by     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolution      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipment_exc_shipment ON shipment_exceptions(shipment_id, created_at DESC);
CREATE INDEX idx_shipment_exc_type ON shipment_exceptions(exception_type, created_at DESC);

CREATE TABLE IF NOT EXISTS shipment_sla_tracking (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id           UUID NOT NULL NOT NULL,
  promised_delivery_date DATE,
  actual_delivery_date  DATE,
  sla_met               BOOLEAN,
  days_variance         INT,               -- negative = early, positive = late
  shipping_method       TEXT,
  origin_country        CHAR(2),
  destination_country   CHAR(2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_met ON shipment_sla_tracking(sla_met, created_at DESC);

-- ============================================================
-- 13. API RATE LIMITING & ABUSE DETECTION
-- ============================================================
CREATE TABLE IF NOT EXISTS api_rate_limit_breaches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  endpoint        TEXT NOT NULL,
  request_count   INT NOT NULL,
  window_seconds  INT NOT NULL,
  ip_address      INET,
  action_taken    TEXT NOT NULL DEFAULT 'throttled'
                  CHECK (action_taken IN ('throttled', 'blocked', 'warned', 'reviewed')),
  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_breach_endpoint ON api_rate_limit_breaches(endpoint, flagged_at DESC);
CREATE INDEX idx_rate_breach_user ON api_rate_limit_breaches(user_id, flagged_at DESC);

-- ============================================================
-- 14. REFUND PROCESSING LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS refund_processing_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id          UUID REFERENCES disputes(id) ON DELETE SET NULL,
  order_id            UUID,
  original_payment_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  gateway             TEXT NOT NULL,
  refund_amount       BIGINT NOT NULL,
  currency            CHAR(3) NOT NULL,
  external_refund_id  TEXT,
  status              TEXT NOT NULL DEFAULT 'initiated'
                      CHECK (status IN ('initiated', 'pending', 'completed', 'failed')),
  error_message       TEXT,
  initiated_by        UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_status ON refund_processing_log(status, created_at DESC);
CREATE INDEX idx_refund_dispute ON refund_processing_log(dispute_id);
CREATE INDEX idx_refund_order ON refund_processing_log(order_id);

-- ============================================================
-- RLS — Super admin read access on all maintenance tables
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'webhook_deliveries',
      'ai_usage_log',
      'ai_usage_quota',
      'email_delivery_log',
      'gateway_health_checks',
      'gateway_transaction_log',
      'user_sessions',
      'login_attempts',
      'scheduled_job_runs',
      'database_metrics',
      'admin_action_audit',
      'data_deletion_requests',
      'file_storage_log',
      'subscription_events',
      'shipment_exceptions',
      'shipment_sla_tracking',
      'api_rate_limit_breaches',
      'refund_processing_log'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Service role full access (for API routes inserting data)
    EXECUTE format(
      'CREATE POLICY "Service role manages %1$s" ON %1$s FOR ALL USING (true) WITH CHECK (true)',
      tbl
    );

    -- Super admin read access
    EXECUTE format(
      'CREATE POLICY "Super admin reads %1$s" ON %1$s FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM company_members cm
          JOIN user_profiles up ON up.id = cm.user_id
          WHERE up.auth_id = auth.uid()
            AND cm.role = ''admin_super''
        )
      )',
      tbl
    );
  END LOOP;
END
$$;
