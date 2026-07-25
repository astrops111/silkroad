-- 00118: platform-wide settings (commission rate, order limits, currencies,
-- gateway toggles, notification toggles, maintenance mode).
-- Single-row config table — enforced by the `singleton` check constraint
-- instead of a separate lock table, matching this codebase's preference for
-- minimal additive schema. Admin UI (src/app/(protected)/admin/settings)
-- was previously local-only React state with no persistence at all.

create table if not exists public.platform_settings (
  singleton boolean primary key default true,
  commission_rate numeric(5,2) not null default 8.00,
  min_order_value integer not null default 100,
  max_order_value integer not null default 500000,
  quote_ttl_days integer not null default 14,
  dispute_window_days integer not null default 30,
  default_currency text not null default 'USD',
  supported_currencies text[] not null default array['USD','EUR','GBP','CNY','KES','NGN','GHS','UGX','TZS','RWF'],
  gateways jsonb not null default '{
    "stripe": true, "flutterwave": true, "mtn_momo": true, "airtel_money": true,
    "mpesa": true, "wechat_pay": false, "alipay": false, "xtransfer": true, "bank_transfer": true
  }'::jsonb,
  notify_on_new_order boolean not null default true,
  notify_on_dispute boolean not null default true,
  notify_on_payment_fail boolean not null default true,
  notify_on_supplier_apply boolean not null default true,
  maintenance_mode boolean not null default false,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (singleton)
);

insert into public.platform_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.platform_settings enable row level security;

-- Any admin can read (settings gate checkout/gateway behavior app-wide and
-- several are read server-side outside the admin UI, e.g. commission_rate
-- by the settlement engine); only admin_super may write, enforced at the
-- API layer (requireSuperAdmin in /api/admin/settings) to match the same
-- super-admin-only pattern already used for /api/admin/ai-features.
create policy "platform_settings_admin_select" on public.platform_settings
  for select using (is_admin());

create policy "platform_settings_admin_all" on public.platform_settings
  for all using (is_admin()) with check (is_admin());

comment on table public.platform_settings is 'Singleton row of platform-wide config, edited from /admin/settings. commission_rate is consulted by the settlement engine as an override of PLATFORM_COMMISSION_RATE.';
