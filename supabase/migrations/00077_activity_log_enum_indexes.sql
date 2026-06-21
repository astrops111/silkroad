-- ============================================================
-- 00077_activity_log_enum_indexes.sql
--
-- Deferred partial indexes for system_activity_log on enum
-- values added in 00074.
--
-- Why deferred? PostgreSQL 55P04 — newly-added enum values
-- cannot be used in index predicates within the same
-- transaction they were added. Running them here (after 00074
-- is committed) avoids the UNSAFE_NEW_ENUM_VALUE_USAGE error.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_log_errors
  ON system_activity_log (created_at DESC)
  WHERE activity_type = 'error_logged';

CREATE INDEX IF NOT EXISTS idx_activity_log_dead_events
  ON system_activity_log (created_at DESC)
  WHERE activity_type = 'pipeline_event_dead';

CREATE INDEX IF NOT EXISTS idx_activity_log_stalls
  ON system_activity_log (created_at DESC)
  WHERE activity_type = 'order_stalled';
