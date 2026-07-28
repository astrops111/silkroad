-- ============================================================
-- 00127_email_case_index.sql — index for case-linked email lookups
--
-- email_threads.deal_thread_id (FK added in 00095_deal_threads_crm.sql)
-- was never indexed, unlike crm_activities.deal_thread_id. The unified
-- mail inbox filters by case and the deal-detail page's linked-email
-- panel both query on this column, so it needs one.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_email_threads_deal_thread
  ON email_threads (deal_thread_id)
  WHERE deal_thread_id IS NOT NULL;
