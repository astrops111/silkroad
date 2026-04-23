-- ============================================================
-- 00055_tracking_events_dedupe.sql
-- Proper dedupe for carrier-webhook-driven tracking events.
-- Adds external_event_id + source_adapter_id with a composite unique index
-- so repeated webhook deliveries are idempotent.
-- ============================================================

ALTER TABLE shipment_tracking_events
  ADD COLUMN IF NOT EXISTS external_event_id TEXT,
  ADD COLUMN IF NOT EXISTS source_adapter_id TEXT;

-- Partial unique index: only enforces uniqueness when external_event_id is set.
-- Events recorded manually (no external_event_id) are never deduped.
-- Scoped to (shipment_id, source_adapter_id, external_event_id) so two carriers
-- can independently emit id=12345 on the same shipment without collision.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracking_events_external
  ON shipment_tracking_events (shipment_id, source_adapter_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_source
  ON shipment_tracking_events (source_adapter_id)
  WHERE source_adapter_id IS NOT NULL;
