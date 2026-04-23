-- ============================================================
-- Ocean tracking fields + carrier-aggregator poll metadata
-- (Phase 2)
--
-- Adds the per-container / per-BL identifiers a real container
-- tracking aggregator (Searates / ShipsGo / terminal49) needs to
-- correlate vessel + voyage + port events back to a shipment.
--
-- Poll-side fields (tracking_provider, tracking_external_ref,
-- last_polled_at) are populated when ops "activates tracking" on
-- a shipment from the admin UI. The Vercel cron at
-- /api/cron/carrier-tracking-poll selects active shipments where
-- tracking_provider IS NOT NULL, calls the adapter's
-- pollTrackingEvents(refs[]), normalizes the response into
-- TrackingEventIngestion, and feeds them through the existing
-- addTrackingEvent path. Dedup uses
-- shipment_tracking_events.(external_event_id, source_adapter_id),
-- already created in 00055_tracking_events_dedupe.sql.
-- ============================================================

ALTER TABLE b2b_shipments
  ADD COLUMN IF NOT EXISTS container_number TEXT,
  ADD COLUMN IF NOT EXISTS seal_number TEXT,
  ADD COLUMN IF NOT EXISTS bill_of_lading TEXT,
  ADD COLUMN IF NOT EXISTS booking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier_scac CHAR(4),
  ADD COLUMN IF NOT EXISTS vessel_name TEXT,
  ADD COLUMN IF NOT EXISTS voyage_no TEXT,
  ADD COLUMN IF NOT EXISTS pol_port_id UUID REFERENCES ports(id),
  ADD COLUMN IF NOT EXISTS pod_port_id UUID REFERENCES ports(id),
  ADD COLUMN IF NOT EXISTS tracking_provider TEXT,
  ADD COLUMN IF NOT EXISTS tracking_external_ref TEXT,
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;

-- Lookup index for the cron's batch query: pick up active shipments
-- with tracking activated, ordered by stale-first.
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_tracking_active
  ON b2b_shipments(last_polled_at NULLS FIRST)
  WHERE tracking_provider IS NOT NULL
    AND status NOT IN ('delivered', 'lost', 'damaged', 'returned');

-- Secondary index when cron needs to look up a shipment by external ref
-- (e.g. webhook arrives keyed on container number).
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_tracking_ref
  ON b2b_shipments(tracking_provider, tracking_external_ref)
  WHERE tracking_provider IS NOT NULL;

-- Container # / BoL # are queried directly during operations
-- (e.g. ops pastes a container # to find the shipment).
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_container ON b2b_shipments(container_number)
  WHERE container_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_bl ON b2b_shipments(bill_of_lading)
  WHERE bill_of_lading IS NOT NULL;
