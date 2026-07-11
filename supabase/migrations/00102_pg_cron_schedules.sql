-- ============================================================
-- 00102_pg_cron_schedules.sql — Cron scheduling via Supabase
--
-- The app runs on Cloud Run (no Vercel crons). Instead of Google
-- Cloud Scheduler, pg_cron fires HTTP GETs (pg_net, async) at the
-- app's /api/cron/* endpoints, authenticated with the same
-- CRON_SECRET bearer token the routes already verify.
--
-- Secrets are NOT in this migration. Before the jobs can fire,
-- create them once in Vault (SQL editor):
--   select vault.create_secret('https://silkroad-africa-798904783325.asia-east1.run.app', 'app_base_url');
--   select vault.create_secret('<CRON_SECRET value>', 'cron_secret');
-- Until both exist, app_cron_call raises a warning and no-ops.
--
-- pg_cron evaluates schedules in UTC on Supabase. "2am" ops time
-- is Asia/Taipei (UTC+8), so daily jobs run at 18:00 UTC.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper: call an app cron endpoint with the bearer secret from Vault.
create or replace function public.app_cron_call(path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'cron_secret';

  if base_url is null or secret is null then
    raise warning 'app_cron_call(%): vault secrets app_base_url / cron_secret not set', path;
    return;
  end if;

  -- Async: pg_net queues the request; responses land in net._http_response.
  -- Generous timeout — mail/AI passes can run for minutes.
  perform net.http_get(
    url := base_url || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 300000
  );
end;
$$;

revoke execute on function public.app_cron_call(text) from public, anon, authenticated;

-- cron.schedule(name, ...) upserts by name — safe to re-run.
select cron.schedule(
  'app-pipeline-processor', '* * * * *',
  $$select public.app_cron_call('/api/cron/pipeline-processor')$$
);
select cron.schedule(
  'app-pipeline-monitor', '*/15 * * * *',
  $$select public.app_cron_call('/api/cron/pipeline-monitor')$$
);
select cron.schedule(
  'app-carrier-tracking', '*/30 * * * *',
  $$select public.app_cron_call('/api/cron/carrier-tracking-poll')$$
);
select cron.schedule(
  'app-exchange-rates', '0 * * * *',
  $$select public.app_cron_call('/api/cron/exchange-rates')$$
);
-- Daily at 02:00 Asia/Taipei = 18:00 UTC
select cron.schedule(
  'app-expire-quotes', '0 18 * * *',
  $$select public.app_cron_call('/api/cron/expire-quotes')$$
);
select cron.schedule(
  'app-email-sequences', '0 18 * * *',
  $$select public.app_cron_call('/api/cron/email-sequences')$$
);

-- Paused by choice — the on-load pass (POST /api/admin/mail/process)
-- covers these while admins use the mail section. To resume background
-- processing, run in the SQL editor:
--   select cron.schedule('app-mail-sync', '*/5 * * * *',
--     $$select public.app_cron_call('/api/cron/mail-sync')$$);
--   select cron.schedule('app-email-skills', '*/5 * * * *',
--     $$select public.app_cron_call('/api/cron/email-skills')$$);
