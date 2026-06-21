-- ─────────────────────────────────────────────────────────────
-- 00078 — Settlement idempotency & atomic claim
--
-- Fixes two critical bugs:
-- 1. Concurrent cron invocations calling processSettlement() on the
--    same settlement would both read 'ready', pass the dispute check,
--    and each issue a real payout before either wrote 'processing'.
--    Fix: claim_settlement() uses SELECT FOR UPDATE SKIP LOCKED so
--    only one caller can own the row at a time.
--
-- 2. Retried delivery.completed events called calculateSettlement()
--    again, inserting a second settlement row for the same supplier
--    order — both would eventually be paid.
--    Fix: unique partial index prevents a second 'active' settlement
--    row for the same single-order settlement.
-- ─────────────────────────────────────────────────────────────

-- Add cancelled/voided to settlement_status for the idempotency index predicate.
DO $$ BEGIN ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'voided';    EXCEPTION WHEN others THEN NULL; END $$;

-- Unique index deferred to 00084_settlement_idempotency_index.sql (PostgreSQL
-- 55P04 — cannot use newly-added enum values in index predicates same transaction).

-- Atomic settlement claim.
-- Selects the row with FOR UPDATE SKIP LOCKED: if a concurrent transaction
-- already holds the lock, this call returns no rows immediately (no wait,
-- no error). The caller treats 0 rows as "already in progress — skip".
-- The UPDATE to 'processing' happens in the same transaction, so the claim
-- and the status flip are atomic.
CREATE OR REPLACE FUNCTION claim_settlement(p_id uuid)
RETURNS SETOF settlements
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v settlements;
BEGIN
  SELECT *
  INTO v
  FROM settlements
  WHERE id = p_id
    AND status IN ('ready', 'failed')
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    -- Row is locked by a concurrent caller, already processing/paid, or doesn't exist.
    RETURN;
  END IF;

  UPDATE settlements
  SET    status     = 'processing',
         updated_at = now()
  WHERE  id = p_id;

  RETURN NEXT v;   -- returns the row as it was before the status flip
END;
$$;
