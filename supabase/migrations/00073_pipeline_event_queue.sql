-- ============================================================
-- 00073_pipeline_event_queue.sql
--
-- Durable, retryable event queue for the post-payment pipeline.
-- Replaces manual admin status transitions with event-driven
-- orchestration: each stage completion auto-enqueues the next.
--
-- Processing: Vercel Cron at /api/cron/pipeline-processor (1 min)
-- Monitoring: Vercel Cron at /api/cron/pipeline-monitor  (15 min)
-- ============================================================

-- ============================================================
-- Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE pipeline_event_status AS ENUM (
    'pending',      -- waiting to be processed
    'processing',   -- locked by processor (in-flight)
    'succeeded',    -- handler completed successfully
    'failed',       -- handler threw, will retry per policy
    'dead',         -- max retries exceeded, needs manual action
    'cancelled'     -- manually cancelled by admin
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_event_type AS ENUM (
    -- Stage 1: Supplier order
    'order.payment_confirmed',
    'order.supplier_notified',
    'order.supplier_shipped',

    -- Stage 2: Origin logistics
    'shipment.created',
    'shipment.freight_booked',
    'shipment.export_customs_filed',
    'shipment.export_cleared',
    'shipment.origin_departed',
    'shipment.arrived_destination',

    -- Stage 3-4: Import customs & clearance
    'customs.arrival_notice_received',
    'customs.entry_filed',
    'customs.duties_assessed',
    'customs.duties_paid',
    'customs.cleared',
    'customs.hold_opened',
    'customs.hold_resolved',

    -- Stage 5: Last-mile delivery
    'delivery.scheduled',
    'delivery.picked_up',
    'delivery.completed',
    'dispute_window.opened',
    'dispute_window.closed',

    -- Cross-cutting
    'shipment.stalled',
    'customs.demurrage_warning',
    'settlement.triggered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- pipeline_events — the event queue
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          pipeline_event_type NOT NULL,
  status              pipeline_event_status NOT NULL DEFAULT 'pending',

  -- Entity refs (no FK on partitioned tables purchase_orders/supplier_orders/b2b_shipments)
  purchase_order_id   UUID,
  supplier_order_id   UUID,
  shipment_id         UUID,

  -- Handler payload
  payload             JSONB NOT NULL DEFAULT '{}',

  -- Retry
  attempt_count       INT NOT NULL DEFAULT 0,
  max_attempts        INT NOT NULL DEFAULT 5,
  last_attempt_at     TIMESTAMPTZ,
  next_retry_at       TIMESTAMPTZ,          -- NULL = process immediately
  locked_until        TIMESTAMPTZ,          -- in-flight lock window

  -- Results
  result              JSONB,
  last_error          TEXT,
  error_history       JSONB NOT NULL DEFAULT '[]',  -- [{attempt,error,at}]

  -- Idempotency
  idempotency_key     TEXT UNIQUE,

  -- Provenance
  triggered_by_type   pipeline_event_type,
  triggered_by_id     UUID,
  created_by          UUID,                 -- NULL = system/db trigger

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ
);

-- Processor: pick up work
CREATE INDEX IF NOT EXISTS idx_pipeline_events_processor
  ON pipeline_events (status, next_retry_at NULLS FIRST, locked_until)
  WHERE status IN ('pending', 'failed');

-- Per-order progress
CREATE INDEX IF NOT EXISTS idx_pipeline_events_order
  ON pipeline_events (purchase_order_id, created_at DESC)
  WHERE purchase_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_events_supplier_order
  ON pipeline_events (supplier_order_id, created_at DESC)
  WHERE supplier_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_events_shipment
  ON pipeline_events (shipment_id, created_at DESC)
  WHERE shipment_id IS NOT NULL;

-- Stall monitor
CREATE INDEX IF NOT EXISTS idx_pipeline_events_stall
  ON pipeline_events (status, created_at)
  WHERE status IN ('pending', 'processing', 'failed');

-- Dead events admin panel
CREATE INDEX IF NOT EXISTS idx_pipeline_events_dead
  ON pipeline_events (created_at DESC)
  WHERE status = 'dead';

-- ============================================================
-- enqueue_pipeline_event
-- Idempotent helper — called by DB triggers and application code.
-- Returns the new event id, or NULL if idempotency key already exists.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- claim_pipeline_events
-- Atomically locks a batch for the processor using SKIP LOCKED
-- so concurrent cron invocations never double-process an event.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigger: supplier_orders status → enqueue pipeline events
-- ============================================================

CREATE OR REPLACE FUNCTION trg_supplier_order_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    PERFORM enqueue_pipeline_event(
      'order.payment_confirmed',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',  NEW.supplier_id,
        'grandTotal',  NEW.total_amount,
        'currency',    NEW.currency,
        'orderNumber', NEW.order_number
      )
    );
  END IF;

  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM enqueue_pipeline_event(
      'order.supplier_notified',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',        NEW.supplier_id,
        'estimatedShipDate', NEW.estimated_ship_date
      )
    );
  END IF;

  IF NEW.status = 'ready_to_ship' AND (OLD IS NULL OR OLD.status != 'ready_to_ship') THEN
    PERFORM enqueue_pipeline_event(
      'order.supplier_shipped',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',     NEW.supplier_id,
        'shippingMethod', NEW.shipping_method,
        'tradeTerm',      NEW.trade_term,
        'shipToCountry',  NEW.ship_to_country
      )
    );
  END IF;

  IF NEW.status = 'delivered' AND (OLD IS NULL OR OLD.status != 'delivered') THEN
    PERFORM enqueue_pipeline_event(
      'settlement.triggered',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object('supplierId', NEW.supplier_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_order_pipeline ON supplier_orders;
CREATE TRIGGER trg_supplier_order_pipeline
  AFTER UPDATE OF status ON supplier_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_supplier_order_pipeline();

-- ============================================================
-- Trigger: b2b_shipments INSERT + status/customs_status UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION trg_shipment_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  -- New shipment record created
  IF TG_OP = 'INSERT' THEN
    PERFORM enqueue_pipeline_event(
      'shipment.created',
      NULL, NEW.supplier_order_id, NEW.id,
      jsonb_build_object(
        'shippingMethod', NEW.shipping_method,
        'originZoneId',   NEW.origin_zone_id,
        'destZoneId',     NEW.destination_zone_id
      )
    );
    RETURN NEW;
  END IF;

  -- Shipment status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'dispatched' THEN
        PERFORM enqueue_pipeline_event(
          'shipment.origin_departed', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object('trackingNumber', NEW.tracking_number)
        );
      WHEN 'at_hub' THEN
        PERFORM enqueue_pipeline_event(
          'shipment.arrived_destination', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object('trackingNumber', NEW.tracking_number, 'freeDays', 5)
        );
      WHEN 'out_for_delivery' THEN
        PERFORM enqueue_pipeline_event(
          'delivery.picked_up', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object('driverId', NEW.assigned_driver_id)
        );
      WHEN 'delivered' THEN
        PERFORM enqueue_pipeline_event(
          'delivery.completed', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object(
            'podPhotoUrl',  NEW.pod_photo_url,
            'podRecipient', NEW.pod_recipient_name
          )
        );
      ELSE NULL;
    END CASE;
  END IF;

  -- Customs status changes
  IF NEW.customs_status IS DISTINCT FROM OLD.customs_status THEN
    CASE NEW.customs_status
      WHEN 'submitted' THEN
        PERFORM enqueue_pipeline_event(
          'customs.entry_filed', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object('brokerRef', NEW.customs_broker_ref)
        );
      WHEN 'on_hold' THEN
        PERFORM enqueue_pipeline_event(
          'customs.hold_opened', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object('brokerRef', NEW.customs_broker_ref)
        );
      WHEN 'cleared' THEN
        PERFORM enqueue_pipeline_event(
          'customs.cleared', NULL, NEW.supplier_order_id, NEW.id,
          jsonb_build_object(
            'dutyPaidMinor', NEW.customs_duty_paid_minor,
            'vatPaidMinor',  NEW.customs_vat_paid_minor,
            'currency',      NEW.customs_paid_currency,
            'clearedAt',     NEW.customs_cleared_at
          )
        );
      ELSE NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_pipeline_insert ON b2b_shipments;
CREATE TRIGGER trg_shipment_pipeline_insert
  AFTER INSERT ON b2b_shipments
  FOR EACH ROW
  EXECUTE FUNCTION trg_shipment_pipeline();

DROP TRIGGER IF EXISTS trg_shipment_pipeline_update ON b2b_shipments;
CREATE TRIGGER trg_shipment_pipeline_update
  AFTER UPDATE OF status, customs_status ON b2b_shipments
  FOR EACH ROW
  EXECUTE FUNCTION trg_shipment_pipeline();

-- ============================================================
-- RLS: admins and logistics roles can read/manage events.
-- Service role (cron processor) bypasses RLS automatically.
-- ============================================================

ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_events_admin_all"
  ON pipeline_events
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
