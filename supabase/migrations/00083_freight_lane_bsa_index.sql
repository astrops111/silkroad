-- ============================================================
-- 00083_freight_lane_bsa_index.sql
--
-- Deferred partial index on the 'bsa' rate_source enum value.
-- Cannot be in 00076 because PostgreSQL 55P04 prevents using
-- a newly-added enum value as an index predicate in the same
-- transaction it was added.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_freight_lanes_bsa
  ON freight_lanes (origin_country, destination_country, shipping_method, container_type)
  WHERE source = 'bsa' AND is_active = true;
