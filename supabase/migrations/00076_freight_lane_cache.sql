-- ============================================================
-- 00076_freight_lane_cache.sql
--
-- Adds sub-day TTL support for carrier-API cached rates and
-- BSA (Block Space Agreement) as a first-class rate_source.
--
-- Why separate from valid_to?
--   valid_from / valid_to are DATE columns used for contract
--   validity windows (e.g. a rate card valid Jan–Jun).
--   live_rate_expires_at is a TIMESTAMPTZ used for API cache
--   TTL (e.g. "this Shipa Freight quote expires in 6 hours").
--   Mixing the two would make the DB query logic ambiguous.
-- ============================================================

-- ---- 1. Sub-day cache TTL + external ref columns ----
ALTER TABLE freight_lanes
  ADD COLUMN IF NOT EXISTS live_rate_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_ref text;

-- ---- 2. BSA as a valid rate_source ----
-- 'bsa' = Block Space Agreement — negotiated lane below market price.
-- LiveFreightLaneProvider checks BSA rows first (Tier 1), above all
-- carrier_api / manual_forwarder / rate_card rows.
ALTER TYPE rate_source ADD VALUE IF NOT EXISTS 'bsa';

-- ---- 3. Index for cached API rate lookup ----
-- LiveFreightLaneProvider.queryCachedApiRate filters:
--   source = 'carrier_api' AND shipping_method AND container_type
--   AND live_rate_expires_at > now()
CREATE INDEX IF NOT EXISTS idx_freight_lanes_api_cache
  ON freight_lanes (shipping_method, container_type, live_rate_expires_at)
  WHERE source = 'carrier_api' AND is_active = true;

-- ---- 4. Index for BSA rate lookup ----
-- Deferred to 00083_freight_lane_bsa_index.sql (PostgreSQL 55P04 —
-- cannot use newly-added 'bsa' enum value as index predicate in the same transaction).

-- ---- 5. Cleanup function for expired cached rates ----
-- Call from Vercel cron or run manually. Safe to run repeatedly.
CREATE OR REPLACE FUNCTION expire_carrier_api_lanes() RETURNS void
  LANGUAGE sql AS $$
    UPDATE freight_lanes
    SET is_active = false
    WHERE source = 'carrier_api'
      AND live_rate_expires_at IS NOT NULL
      AND live_rate_expires_at < now();
  $$;

COMMENT ON COLUMN freight_lanes.live_rate_expires_at IS
  'TTL timestamp for carrier_api cached rates. NULL on manual/BSA/rate_card rows.';

COMMENT ON COLUMN freight_lanes.external_ref IS
  'Upstream quote ID from the carrier API (e.g. Shipa/Freightos quote id). Used for booking handoff.';
