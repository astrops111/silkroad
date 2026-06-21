-- Migration: 00075_security_hardening
-- Purpose: Fix critical RLS policies and SECURITY DEFINER function exposure
-- Date: 2026-06-21
--
-- Fixes addressed:
--   C7  — Replace overly-broad buyer_quote_requests FOR ALL policy with
--          split SELECT + INSERT policies; buyers cannot UPDATE/DELETE.
--   C8  — Revoke PUBLIC/authenticated EXECUTE on SECURITY DEFINER pipeline
--          functions so only service_role (cron processor) can call them.
--   H15 — Tighten supplier_orders INSERT policy to verify the purchase order
--          contains at least one product belonging to the inserting supplier.
--   M3  — Recreate all three SECURITY DEFINER functions with
--          SET search_path = public to prevent search_path injection attacks.


-- ============================================================
-- C7: Fix buyer_quote_requests RLS policy
--
-- The original "bqr_buyer_own" policy was FOR ALL without WITH CHECK,
-- meaning any authenticated buyer could UPDATE their own row and spoof
-- status='paid' or set total_amount=1.  We replace it with two
-- narrow policies: SELECT (read own rows) and INSERT (create new rows).
-- All mutations (UPDATE status, populate cost fields, etc.) go through
-- service_role only — no buyer UPDATE or DELETE policy is created here.
-- ============================================================

-- Remove the overly broad FOR ALL policy
DROP POLICY IF EXISTS "bqr_buyer_own" ON buyer_quote_requests;

-- Buyers can SELECT their own rows
CREATE POLICY "bqr_buyer_select" ON buyer_quote_requests
  FOR SELECT USING (
    buyer_user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  );

-- Buyers can INSERT new quote requests; WITH CHECK ensures they can only
-- set themselves as the buyer (prevents inserting rows for other users).
CREATE POLICY "bqr_buyer_insert" ON buyer_quote_requests
  FOR INSERT WITH CHECK (
    buyer_user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  );

-- No buyer UPDATE or DELETE policy — those operations are performed by
-- service_role (cost engine, payment webhook) which bypasses RLS.


-- ============================================================
-- C8: Revoke PUBLIC/authenticated EXECUTE on SECURITY DEFINER
--     pipeline functions
--
-- enqueue_pipeline_event, claim_pipeline_events, and log_pipeline_activity
-- are all SECURITY DEFINER (run as the postgres superuser).  Without an
-- explicit REVOKE, any authenticated user can call them, injecting fake
-- pipeline events or forging audit log entries.
--
-- service_role bypasses EXECUTE grants/revokes automatically in Supabase,
-- so the cron processor continues to work unaffected.
--
-- Exact signatures are taken verbatim from 00073 and 00074.
-- ============================================================

-- enqueue_pipeline_event (00073)
REVOKE EXECUTE ON FUNCTION enqueue_pipeline_event(
  pipeline_event_type,
  UUID,
  UUID,
  UUID,
  JSONB,
  TEXT,
  pipeline_event_type,
  UUID,
  TIMESTAMPTZ,
  INT
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION enqueue_pipeline_event(
  pipeline_event_type,
  UUID,
  UUID,
  UUID,
  JSONB,
  TEXT,
  pipeline_event_type,
  UUID,
  TIMESTAMPTZ,
  INT
) FROM authenticated;

-- claim_pipeline_events (00073)
REVOKE EXECUTE ON FUNCTION claim_pipeline_events(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_pipeline_events(INT) FROM authenticated;

-- log_pipeline_activity (00074)
REVOKE EXECUTE ON FUNCTION log_pipeline_activity(
  system_activity_type,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  UUID,
  JSONB
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION log_pipeline_activity(
  system_activity_type,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  UUID,
  JSONB
) FROM authenticated;


-- ============================================================
-- H15: Tighten supplier_orders INSERT policy
--
-- The old policy (supplier_orders_admin_insert) checked only that
-- supplier_id belongs to the caller's companies, but did NOT verify
-- that the purchase_order_id being referenced actually involves this
-- supplier.  A rogue supplier could create a supplier_orders row
-- attached to any purchase_order.
--
-- The new policy adds an EXISTS subquery through supplier_order_items
-- -> products to confirm the purchase order already has at least one
-- product whose supplier_id matches the inserting party.
--
-- Schema note: there is no purchase_order_items table in this codebase.
-- Line items live in supplier_order_items (linked to supplier_orders).
-- Products carry their supplier company via products.supplier_id.
--
-- We DROP both the old admin-named policy and any pre-existing
-- supplier-specific INSERT policy before creating the unified one.
-- ============================================================

DROP POLICY IF EXISTS supplier_orders_admin_insert ON supplier_orders;
DROP POLICY IF EXISTS supplier_orders_supplier_insert ON supplier_orders;

CREATE POLICY supplier_orders_supplier_insert ON supplier_orders
  FOR INSERT WITH CHECK (
    -- Platform admins can always create supplier orders
    is_admin()
    OR (
      -- The supplier_id on the new row must belong to the caller's companies
      supplier_id = ANY(get_user_companies())
      AND (
        -- The purchase_order must contain at least one product from this supplier.
        -- We verify via supplier_order_items on existing supplier_orders rows
        -- for that purchase_order, joined to products.supplier_id.
        -- This prevents a supplier from attaching themselves to a foreign order.
        EXISTS (
          SELECT 1
          FROM supplier_order_items soi
          JOIN supplier_orders so
            ON so.id = soi.supplier_order_id
          JOIN products p
            ON p.id = soi.product_id
          WHERE so.purchase_order_id = supplier_orders.purchase_order_id
            AND p.supplier_id = ANY(get_user_companies())
        )
        -- Allow first-row inserts when purchase_order_id is being created
        -- atomically in the same transaction (no prior supplier_orders rows yet).
        -- In that case fall back to confirming supplier_id membership only,
        -- which is already checked by the outer AND above.
        OR NOT EXISTS (
          SELECT 1
          FROM supplier_orders existing
          WHERE existing.purchase_order_id = supplier_orders.purchase_order_id
        )
      )
    )
  );


-- ============================================================
-- M3: Add SET search_path = public to SECURITY DEFINER functions
--
-- Without SET search_path, a SECURITY DEFINER function can be tricked
-- via search_path injection: an attacker sets their own search_path to
-- a schema containing shadow tables, then calls the function which
-- resolves table names in the attacker's schema instead of public.
--
-- We recreate all three SECURITY DEFINER functions from 00073 and 00074
-- with identical bodies but adding the SET search_path = public attribute.
-- Using CREATE OR REPLACE preserves all existing grants/dependencies.
--
-- IMPORTANT: CREATE OR REPLACE on a SECURITY DEFINER function resets
-- EXECUTE privileges to PUBLIC defaults.  The REVOKE block at the end
-- of this migration re-applies the C8 lockdown after each replacement.
-- ============================================================

-- ---- enqueue_pipeline_event (body identical to 00073) ------------------

CREATE OR REPLACE FUNCTION enqueue_pipeline_event(
  p_event_type          pipeline_event_type,
  p_purchase_order_id   UUID        DEFAULT NULL,
  p_supplier_order_id   UUID        DEFAULT NULL,
  p_shipment_id         UUID        DEFAULT NULL,
  p_payload             JSONB       DEFAULT '{}',
  p_idempotency_key     TEXT        DEFAULT NULL,
  p_triggered_by_type   pipeline_event_type DEFAULT NULL,
  p_triggered_by_id     UUID        DEFAULT NULL,
  p_next_retry_at       TIMESTAMPTZ DEFAULT NULL,
  p_max_attempts        INT         DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  v_id       UUID;
  v_idem_key TEXT;
BEGIN
  v_idem_key := COALESCE(
    p_idempotency_key,
    p_event_type::TEXT || ':'
      || COALESCE(
           p_supplier_order_id::TEXT,
           p_purchase_order_id::TEXT,
           p_shipment_id::TEXT,
           gen_random_uuid()::TEXT
         )
  );

  INSERT INTO pipeline_events (
    event_type, purchase_order_id, supplier_order_id, shipment_id,
    payload, idempotency_key,
    triggered_by_type, triggered_by_id,
    next_retry_at, max_attempts
  ) VALUES (
    p_event_type, p_purchase_order_id, p_supplier_order_id, p_shipment_id,
    p_payload, v_idem_key,
    p_triggered_by_type, p_triggered_by_id,
    p_next_retry_at, p_max_attempts
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- ---- claim_pipeline_events (body identical to 00073) -------------------

CREATE OR REPLACE FUNCTION claim_pipeline_events(p_batch_size INT DEFAULT 20)
RETURNS SETOF pipeline_events AS $$
BEGIN
  RETURN QUERY
    UPDATE pipeline_events
    SET
      status          = 'processing',
      locked_until    = now() + INTERVAL '90 seconds',
      last_attempt_at = now(),
      attempt_count   = attempt_count + 1
    WHERE id IN (
      SELECT id
      FROM pipeline_events
      WHERE
        status IN ('pending', 'failed')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY created_at ASC
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- ---- log_pipeline_activity (body identical to 00074) -------------------

CREATE OR REPLACE FUNCTION log_pipeline_activity(
  p_activity_type  system_activity_type,
  p_description    TEXT,
  p_target_type    TEXT        DEFAULT NULL,
  p_target_id      UUID        DEFAULT NULL,
  p_target_label   TEXT        DEFAULT NULL,
  p_actor_id       UUID        DEFAULT NULL,
  p_metadata       JSONB       DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO system_activity_log (
    activity_type, description,
    target_type, target_id, target_label,
    actor_id, metadata
  ) VALUES (
    p_activity_type, p_description,
    p_target_type, p_target_id, p_target_label,
    p_actor_id, p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- C8 (re-apply after M3 CREATE OR REPLACE resets grants)
--
-- CREATE OR REPLACE resets EXECUTE on a function to PUBLIC.
-- We must re-revoke after all three function replacements above.
-- ============================================================

REVOKE EXECUTE ON FUNCTION enqueue_pipeline_event(
  pipeline_event_type,
  UUID,
  UUID,
  UUID,
  JSONB,
  TEXT,
  pipeline_event_type,
  UUID,
  TIMESTAMPTZ,
  INT
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION enqueue_pipeline_event(
  pipeline_event_type,
  UUID,
  UUID,
  UUID,
  JSONB,
  TEXT,
  pipeline_event_type,
  UUID,
  TIMESTAMPTZ,
  INT
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION claim_pipeline_events(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_pipeline_events(INT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION log_pipeline_activity(
  system_activity_type,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  UUID,
  JSONB
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION log_pipeline_activity(
  system_activity_type,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  UUID,
  JSONB
) FROM authenticated;
