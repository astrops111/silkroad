-- ============================================================
-- 00112_assistant_usage_costs.sql
-- Per-response usage accounting on assistant conversation logs:
-- model, input/output tokens, and estimated cost (rates live in
-- src/lib/ai/nvidia.ts). The prompt is the paired 'user' row of the
-- same session; created_at is the timestamp.
-- Plus a daily cost aggregator view (admin-only via base-table RLS).
-- ============================================================

ALTER TABLE shopping_assistant_logs
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12,6);

CREATE OR REPLACE VIEW shopping_assistant_daily_costs
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  model,
  COUNT(*)::int                          AS responses,
  COALESCE(SUM(input_tokens), 0)::bigint  AS input_tokens,
  COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
  COALESCE(SUM(cost_usd), 0)::numeric(14,6) AS cost_usd
FROM shopping_assistant_logs
WHERE role = 'assistant' AND model IS NOT NULL
GROUP BY 1, 2;

GRANT SELECT ON shopping_assistant_daily_costs TO authenticated;
