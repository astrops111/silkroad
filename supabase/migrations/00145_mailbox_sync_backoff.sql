-- Per-mailbox backoff for the mail-sync cron.
-- A mailbox whose IMAP connection keeps failing is retried at growing
-- intervals (5 → 10 → 20 → 40 → 60 min cap) instead of every 5-minute tick,
-- and only pages Telegram once the outage is sustained. Reset on success.

ALTER TABLE mailboxes
  ADD COLUMN IF NOT EXISTS sync_failure_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_retry_after timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text;
