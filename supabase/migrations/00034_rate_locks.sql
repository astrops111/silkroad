-- ============================================================
-- 00021_rate_locks.sql — Exchange rate locking for checkout
--
-- Locks a rate at checkout time so the buyer sees an exact local
-- amount. The lock is valid for a configurable window (default 15 min).
-- Payment must reference a valid lock or be rejected.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who locked
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  purchase_order_id UUID,            -- set after order is created

  -- Currencies
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,

  -- Locked rate + amounts
  exchange_rate NUMERIC(18,8) NOT NULL,
  original_amount BIGINT NOT NULL,   -- in from_currency (stored units)
  converted_amount BIGINT NOT NULL,  -- in to_currency (stored units)

  -- Validity
  locked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  validity_minutes INT DEFAULT 15,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  used_at TIMESTAMPTZ,

  -- Audit
  rate_source TEXT,                   -- 'direct', 'via_usd', etc.

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_locks_user ON rate_locks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_locks_order ON rate_locks(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_locks_expires ON rate_locks(expires_at) WHERE status = 'active';

-- Auto-expire stale locks (called by pg_cron every minute)
CREATE OR REPLACE FUNCTION expire_stale_rate_locks()
RETURNS void AS $$
BEGIN
  UPDATE rate_locks
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE rate_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own rate locks" ON rate_locks;
CREATE POLICY "Users see own rate locks" ON rate_locks
  FOR ALL USING (user_id = get_user_profile_id() OR is_admin());
