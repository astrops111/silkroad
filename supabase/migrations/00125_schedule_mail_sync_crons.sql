-- ============================================================
-- 00125_schedule_mail_sync_crons.sql
-- Un-pause background mail processing. 00102 left app-mail-sync
-- and app-email-skills commented out, so inbound IMAP sync (and
-- everything downstream: support-ticket intake, CRM contact
-- capture, AI email skills, auto-replies) only ran when an admin
-- happened to open the mail section. Schedule both, using the
-- exact commands 00102 documented for resuming.
-- cron.schedule(name, ...) upserts by name — safe to re-run.
-- app_cron_call() no-ops with a warning if the Vault secrets
-- (app_base_url / cron_secret) are missing.
-- ============================================================

select cron.schedule(
  'app-mail-sync', '*/5 * * * *',
  $$select public.app_cron_call('/api/cron/mail-sync')$$
);
select cron.schedule(
  'app-email-skills', '*/5 * * * *',
  $$select public.app_cron_call('/api/cron/email-skills')$$
);
