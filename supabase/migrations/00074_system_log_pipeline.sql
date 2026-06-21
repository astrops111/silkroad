-- ============================================================
-- 00074_system_log_pipeline.sql
--
-- Extends the existing system log infrastructure (00037) with:
--
-- 1. New activity types covering the post-payment pipeline
-- 2. Trigger: pipeline_events → system_activity_log
--    Auto-logs every significant pipeline state change without
--    requiring TypeScript changes in individual handlers.
-- 3. Trigger: error_logs INSERT → system_activity_log
--    Every logged error appears in the unified audit trail.
-- 4. log_pipeline_activity() RPC for application-level logging.
-- 5. Indexes for fast per-order timeline queries.
-- ============================================================

-- ============================================================
-- 1. Extend system_activity_type enum
-- ============================================================

DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'pipeline_event_enqueued';  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'pipeline_event_processed'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'pipeline_event_failed';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'pipeline_event_dead';      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'supplier_order_confirmed'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'customs_entry_filed';      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'customs_cleared';          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'customs_hold_opened';      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'customs_hold_resolved';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'delivery_confirmed';       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'dispute_window_opened';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'dispute_window_closed';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'order_stalled';            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'settlement_processed';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE system_activity_type ADD VALUE IF NOT EXISTS 'error_logged';             EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================
-- 2. Trigger: pipeline_events → system_activity_log
--
-- Maps event_type + final status to human-readable audit entries.
-- Fires on INSERT (enqueue) and on status UPDATE.
-- Dead events are always logged. Succeeded events logged only
-- for business-significant types (not internal stubs).
-- ============================================================

CREATE OR REPLACE FUNCTION trg_pipeline_event_to_activity_log()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_type  system_activity_type;
  v_description    TEXT;
  v_target_type    TEXT;
  v_target_id      UUID;
  v_skip           BOOLEAN := false;
BEGIN

  -- Primary target: purchase_order > supplier_order > shipment
  IF NEW.purchase_order_id IS NOT NULL THEN
    v_target_type := 'purchase_order';
    v_target_id   := NEW.purchase_order_id;
  ELSIF NEW.supplier_order_id IS NOT NULL THEN
    v_target_type := 'supplier_order';
    v_target_id   := NEW.supplier_order_id;
  ELSIF NEW.shipment_id IS NOT NULL THEN
    v_target_type := 'shipment';
    v_target_id   := NEW.shipment_id;
  END IF;

  -- ── INSERT: newly enqueued event ─────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    -- Only log business-significant event types on enqueue
    CASE NEW.event_type
      WHEN 'order.payment_confirmed',
           'customs.entry_filed', 'customs.cleared',
           'customs.hold_opened', 'customs.hold_resolved',
           'delivery.completed',
           'dispute_window.opened', 'dispute_window.closed',
           'settlement.triggered',
           'shipment.stalled', 'customs.demurrage_warning' THEN
        v_activity_type := 'pipeline_event_enqueued';
        v_description   := 'Event enqueued: ' || replace(NEW.event_type::TEXT, '.', ' › ');
      ELSE
        v_skip := true;
    END CASE;

    IF NOT v_skip THEN
      INSERT INTO system_activity_log (
        activity_type, target_type, target_id, target_label,
        description, metadata
      ) VALUES (
        v_activity_type, v_target_type, v_target_id,
        NEW.event_type::TEXT,
        v_description,
        jsonb_build_object(
          'eventId',        NEW.id,
          'eventType',      NEW.event_type,
          'idempotencyKey', NEW.idempotency_key
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  -- ── UPDATE: only act when status actually changes ──────────────────────
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status

    WHEN 'dead' THEN
      v_activity_type := 'pipeline_event_dead';
      v_description   := 'DEAD after ' || NEW.attempt_count::TEXT
                         || ' attempts: ' || NEW.event_type::TEXT
                         || '. Error: ' || COALESCE(NEW.last_error, 'unknown');

    WHEN 'succeeded' THEN
      CASE NEW.event_type
        WHEN 'order.payment_confirmed' THEN
          v_activity_type := 'supplier_order_confirmed';
          v_description   := 'Platform PO issued to supplier. Order confirmed.';
        WHEN 'customs.entry_filed' THEN
          v_activity_type := 'customs_entry_filed';
          v_description   := 'Customs entry filed with authority.';
        WHEN 'customs.cleared' THEN
          v_activity_type := 'customs_cleared';
          v_description   := 'Customs cleared — goods released from port.';
        WHEN 'customs.hold_opened' THEN
          v_activity_type := 'customs_hold_opened';
          v_description   := 'Customs hold opened. Ops attention required.';
        WHEN 'customs.hold_resolved' THEN
          v_activity_type := 'customs_hold_resolved';
          v_description   := 'Customs hold resolved.';
        WHEN 'delivery.completed' THEN
          v_activity_type := 'delivery_confirmed';
          v_description   := 'Delivery completed. POD captured.';
        WHEN 'dispute_window.opened' THEN
          v_activity_type := 'dispute_window_opened';
          v_description   := 'Buyer dispute window opened.';
        WHEN 'dispute_window.closed' THEN
          v_activity_type := 'dispute_window_closed';
          v_description   := 'Dispute window closed. Settlement released.';
        WHEN 'settlement.triggered' THEN
          v_activity_type := 'settlement_processed';
          v_description   := 'Supplier settlement calculation triggered.';
        WHEN 'shipment.stalled' THEN
          v_activity_type := 'order_stalled';
          v_description   := 'Stall alert raised — SLA breach detected.';
        WHEN 'customs.demurrage_warning' THEN
          v_activity_type := 'order_stalled';
          v_description   := 'Demurrage warning — free days expiring at port.';
        ELSE
          v_skip := true;
      END CASE;

    WHEN 'failed' THEN
      -- Log repeatedly-failing events (>=3 attempts) to surface in audit
      IF NEW.attempt_count >= 3 THEN
        v_activity_type := 'pipeline_event_failed';
        v_description   := NEW.event_type::TEXT || ' failing (' || NEW.attempt_count::TEXT
                           || ' attempts). Error: ' || COALESCE(NEW.last_error, 'unknown');
      ELSE
        v_skip := true;
      END IF;

    ELSE
      v_skip := true;
  END CASE;

  IF NOT v_skip THEN
    INSERT INTO system_activity_log (
      activity_type, target_type, target_id,
      target_label, description, metadata
    ) VALUES (
      v_activity_type, v_target_type, v_target_id,
      NEW.event_type::TEXT,
      v_description,
      jsonb_build_object(
        'eventId',      NEW.id,
        'eventType',    NEW.event_type,
        'status',       NEW.status,
        'attemptCount', NEW.attempt_count,
        'result',       NEW.result,
        'lastError',    NEW.last_error
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pipeline_event_activity ON pipeline_events;
CREATE TRIGGER trg_pipeline_event_activity
  AFTER INSERT OR UPDATE OF status ON pipeline_events
  FOR EACH ROW
  EXECUTE FUNCTION trg_pipeline_event_to_activity_log();

-- ============================================================
-- 3. Trigger: error_logs → system_activity_log
--
-- Every error written via logError() automatically surfaces
-- in the unified audit trail with severity tag and source.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_error_log_to_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_activity_log (
    activity_type,
    actor_id,
    target_type,
    target_label,
    description,
    metadata
  ) VALUES (
    'error_logged',
    NEW.user_id,
    'error',
    NEW.error_code,
    '[' || UPPER(NEW.severity) || '] ' || NEW.source || ': ' || NEW.message,
    jsonb_build_object(
      'errorId',   NEW.id,
      'errorCode', NEW.error_code,
      'severity',  NEW.severity,
      'source',    NEW.source,
      'requestId', NEW.request_id,
      'resolved',  NEW.resolved
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_error_log_activity ON error_logs;
CREATE TRIGGER trg_error_log_activity
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION trg_error_log_to_activity();

-- ============================================================
-- 4. log_pipeline_activity()
--    RPC for TypeScript code to write to system_activity_log
--    without needing a pipeline_event row — e.g. payment
--    received events that fire before the pipeline starts.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Indexes for efficient per-order timeline queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_log_purchase_order
  ON system_activity_log (target_id, created_at DESC)
  WHERE target_type = 'purchase_order';

CREATE INDEX IF NOT EXISTS idx_activity_log_supplier_order
  ON system_activity_log (target_id, created_at DESC)
  WHERE target_type = 'supplier_order';

-- Partial indexes on new enum values deferred to 00077_activity_log_enum_indexes.sql
-- (PostgreSQL 55P04: cannot use newly-added enum values as index predicates in the same transaction)
