-- ============================================================
-- Local dev seed — runs after migrations on `supabase db reset`
-- Creates real auth.users with passwords + demo data
-- NEVER loaded on production (supabase/seed.sql is local-only)
--
-- All test passwords: password123
-- ============================================================

-- ============================================================
-- 1. Demo companies (buyers, suppliers, platform)
-- ============================================================
INSERT INTO companies (id, name, slug, type, country_code, market_region, verification_status, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Silk Road Africa Platform', 'silkroad-africa-platform', 'buyer_org', 'US', 'global', 'verified', true),
  ('33333333-0001-0000-0000-000000000000', 'TechHub Ghana Ltd', 'techhub-ghana', 'buyer_org', 'GH', 'africa_west', 'verified', true),
  ('33333333-0002-0000-0000-000000000000', 'Nairobi Imports Ltd', 'nairobi-imports', 'buyer_org', 'KE', 'africa_east', 'verified', true),
  ('33333333-0003-0000-0000-000000000000', 'Cairo Electronics Corp', 'cairo-electronics', 'buyer_org', 'EG', 'africa_north', 'verified', true),
  ('33333333-0004-0000-0000-000000000000', 'Guangzhou Trading Co.', 'guangzhou-trading', 'buyer_org', 'CN', 'cn', 'verified', true),
  ('22222222-0001-0000-0000-000000000000', 'HuaNan Precision Machinery', 'huanan-precision', 'supplier', 'CN', 'cn', 'verified', true),
  ('22222222-0006-0000-0000-000000000000', 'Accra Exports Ltd', 'accra-exports', 'supplier', 'GH', 'africa_west', 'verified', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. auth.users — Supabase Auth records with real passwords
-- Hash below = bcrypt of "password123"
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'amara@techhub.gh',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amara Diallo"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'james@nairobiimports.ke',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"James Mwangi"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ahmed@cairoelectronics.eg',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ahmed Hassan"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'li.wei@gztrading.cn',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Li Wei"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'david.chen@huanan.cn',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Chen"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'kwame@accraexports.gh',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kwame Asante"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@silkroadafrica.com',
   '$2b$10$aZALBsJ5HNEEPT78DcZ2Zu/TdVnJ9y.XuuTBBVqat6lDWzBhOfBG6',
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Platform Admin"}',
   now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. auth.identities — required for email/password login
-- ============================================================
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000001","email":"amara@techhub.gh","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000002","email":"james@nairobiimports.ke","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000003","email":"ahmed@cairoelectronics.eg","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000004","email":"li.wei@gztrading.cn","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000005","email":"david.chen@huanan.cn","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000006","email":"kwame@accraexports.gh","email_verified":true,"phone_verified":false}', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000099', 'email',
   '{"sub":"00000000-0000-0000-0000-000000000099","email":"admin@silkroadafrica.com","email_verified":true,"phone_verified":false}', now(), now(), now())
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ============================================================
-- 4. user_profiles — application-level user records
-- ============================================================
INSERT INTO user_profiles (id, auth_id, email, full_name, phone, preferred_locale, preferred_currency, country_code, is_active) VALUES
  ('55555555-0001-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'amara@techhub.gh',         'Amara Diallo',   '+233201234567', 'en', 'USD', 'GH', true),
  ('55555555-0002-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'james@nairobiimports.ke',  'James Mwangi',   '+254712345678', 'sw', 'KES', 'KE', true),
  ('55555555-0003-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'ahmed@cairoelectronics.eg','Ahmed Hassan',   '+201012345678', 'ar', 'EGP', 'EG', true),
  ('55555555-0004-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'li.wei@gztrading.cn',      'Li Wei',         '+8613812345678','zh', 'CNY', 'CN', true),
  ('55555555-0005-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005', 'david.chen@huanan.cn',     'David Chen',     '+8613900001111','zh', 'CNY', 'CN', true),
  ('55555555-0006-0000-0000-000000000000', '00000000-0000-0000-0000-000000000006', 'kwame@accraexports.gh',    'Kwame Asante',   '+233209876543', 'en', 'USD', 'GH', true),
  ('55555555-0099-0000-0000-000000000000', '00000000-0000-0000-0000-000000000099', 'admin@silkroadafrica.com', 'Platform Admin', NULL,            'en', 'USD', 'US', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. company_members — tie users to companies with platform_role
-- ============================================================
INSERT INTO company_members (company_id, user_id, role, is_primary) VALUES
  ('33333333-0001-0000-0000-000000000000', '55555555-0001-0000-0000-000000000000', 'buyer',           true),
  ('33333333-0002-0000-0000-000000000000', '55555555-0002-0000-0000-000000000000', 'buyer',           true),
  ('33333333-0003-0000-0000-000000000000', '55555555-0003-0000-0000-000000000000', 'buyer',           true),
  ('33333333-0004-0000-0000-000000000000', '55555555-0004-0000-0000-000000000000', 'buyer',           true),
  ('22222222-0001-0000-0000-000000000000', '55555555-0005-0000-0000-000000000000', 'supplier_owner',  true),
  ('22222222-0006-0000-0000-000000000000', '55555555-0006-0000-0000-000000000000', 'supplier_owner',  true),
  ('11111111-0000-0000-0000-000000000001', '55555555-0099-0000-0000-000000000000', 'admin_super',     true)
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ============================================================
-- 6. Sample activity log for the System Monitor
-- ============================================================
INSERT INTO system_activity_log (activity_type, actor_id, actor_email, target_type, target_id, target_label, description, metadata, created_at) VALUES
  ('user_login',            '55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'user',    '55555555-0099-0000-0000-000000000000', NULL,                          'Platform Admin logged in',                            '{}',                                                          now() - interval '2 hours'),
  ('user_registered',       '55555555-0001-0000-0000-000000000000', 'amara@techhub.gh',         'user',    '55555555-0001-0000-0000-000000000000', NULL,                          'New buyer registered from Ghana',                     '{"country":"GH"}',                                            now() - interval '3 days'),
  ('company_verified',      '55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'company', '22222222-0001-0000-0000-000000000000', 'HuaNan Precision Machinery',  'Supplier verified by admin',                          '{}',                                                          now() - interval '2 days'),
  ('product_approved',      '55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'product', NULL,                                   'CNC Laser Cutting Machine',   'Product listing approved',                            '{}',                                                          now() - interval '2 days'),
  ('order_created',         '55555555-0001-0000-0000-000000000000', 'amara@techhub.gh',         'order',   NULL,                                   'PO-2026-1247',                'New purchase order placed',                           '{"total":"$24,000"}',                                         now() - interval '5 days'),
  ('payment_received',      NULL,                                   NULL,                        'order',   NULL,                                   'PO-2026-1247',                'Payment of $24,000 received via Stripe',              '{"gateway":"stripe","amount":2400000}',                       now() - interval '5 days'),
  ('dispute_opened',        '55555555-0002-0000-0000-000000000000', 'james@nairobiimports.ke',  'order',   NULL,                                   'PO-2026-1240',                'Quality issue reported — 12 units damaged',           '{"reason":"quality_mismatch"}',                               now() - interval '12 hours'),
  ('payment_failed',        NULL,                                   NULL,                        'order',   NULL,                                   'PO-2026-1238',                'MTN MoMo payment failed — insufficient funds',        '{"gateway":"mtn_momo","error":"insufficient_funds"}',         now() - interval '1 day'),
  ('settlement_processed',  '55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'company', '22222222-0001-0000-0000-000000000000', 'HuaNan Precision Machinery',  'Weekly settlement of $9,200 processed',               '{"amount":920000,"currency":"USD"}',                          now() - interval '8 hours'),
  ('system_event',          NULL,                                   NULL,                        NULL,      NULL,                                   NULL,                          'Scheduled maintenance: database backup completed',    '{"duration_ms":4520}',                                        now() - interval '6 hours');

-- ============================================================
-- 7. Sample system logs across all levels
-- ============================================================
INSERT INTO system_logs (level, source, message, request_id, created_at) VALUES
  ('info',  'api/payments/stripe',      'Payment intent created for PO-2026-1247',               'req_abc123', now() - interval '5 days'),
  ('info',  'api/payments/stripe',      'Payment confirmed — $24,000',                          'req_abc124', now() - interval '5 days'),
  ('warn',  'api/payments/mtn-momo',    'MTN MoMo timeout — retrying',                          'req_def456', now() - interval '1 day'),
  ('error', 'api/payments/mtn-momo',    'Payment failed: insufficient funds',                    'req_def457', now() - interval '1 day'),
  ('info',  'worker/settlement',        'Processing settlement batch #47',                       NULL,         now() - interval '8 hours'),
  ('warn',  'api/supplier/ai-listing',  'AI listing generation slow — 12.3s response',          'req_jkl012', now() - interval '2 days'),
  ('error', 'api/webhooks/stripe',      'Webhook signature verification failed',                 'req_mno345', now() - interval '4 days'),
  ('fatal', 'worker/email',             'Resend API key invalid — all emails blocked',           NULL,         now() - interval '7 days'),
  ('info',  'worker/email',             'Resend API key rotated — emails restored',              NULL,         now() - interval '7 days' + interval '15 minutes'),
  ('debug', 'api/rfqs',                 'RFQ auto-expire job: 0 RFQs expired',                   NULL,         now() - interval '6 hours');

-- ============================================================
-- 8. Sample error logs
-- ============================================================
INSERT INTO error_logs (error_code, message, stack_trace, source, severity, request_id, user_id, metadata, resolved, created_at) VALUES
  ('PAYMENT_FAILED',    'MTN MoMo payment failed: insufficient funds', NULL, 'api/payments/mtn-momo', 'error',    'req_def457', '55555555-0002-0000-0000-000000000000', '{"gateway":"mtn_momo","order":"PO-2026-1238"}', false, now() - interval '1 day'),
  ('WEBHOOK_SIGNATURE', 'Stripe webhook signature verification failed', 'Error: No signatures found matching expected signature\n  at Webhook.constructEvent (stripe/lib/Webhooks.js:45:13)', 'api/webhooks/stripe', 'error', 'req_mno345', NULL, '{"ip":"54.187.205.235"}', true, now() - interval '4 days'),
  ('AI_TIMEOUT',        'AI listing generation timed out after 30s', NULL, 'api/supplier/ai-listing', 'warning', 'req_jkl012', '55555555-0005-0000-0000-000000000000', '{"model":"claude-sonnet-4-5","input_tokens":2400}', false, now() - interval '2 days'),
  ('EMAIL_API_KEY',     'Resend API key invalid — 401 Unauthorized', 'Error: Request failed with status 401\n  at ResendClient.send', 'worker/email', 'critical', NULL, NULL, '{"resend_error":"Invalid API Key"}', true, now() - interval '7 days'),
  ('DB_CONNECTION',     'Database connection pool exhausted', 'Error: remaining connection slots are reserved', 'worker/settlement', 'critical', NULL, NULL, '{"pool_size":50,"active":50}', true, now() - interval '10 days');

-- ============================================================
-- 9. Sample webhook deliveries
-- ============================================================
INSERT INTO webhook_deliveries (webhook_type, event_type, external_event_id, http_status_code, processing_time_ms, status, created_at) VALUES
  ('stripe',     'payment_intent.succeeded', 'evt_stripe_001', 200, 145, 'delivered', now() - interval '5 days'),
  ('stripe',     'payment_intent.succeeded', 'evt_stripe_002', 200, 230, 'delivered', now() - interval '3 days'),
  ('stripe',     'charge.refunded',          'evt_stripe_003', 200, 89,  'delivered', now() - interval '1 day'),
  ('mtn_momo',   'payment_failed',           'momo_ref_001',   200, 312, 'delivered', now() - interval '1 day'),
  ('mtn_momo',   'payment_succeeded',        'momo_ref_002',   200, 198, 'delivered', now() - interval '4 days'),
  ('stripe',     'webhook_verification_failed', NULL,          400, 12,  'failed',    now() - interval '4 days'),
  ('alipay',     'trade.success',            'ali_001',        200, 567, 'delivered', now() - interval '6 days'),
  ('wechat_pay', 'transaction.success',      'wx_001',         200, 423, 'delivered', now() - interval '2 days');

-- ============================================================
-- 10. Sample email delivery log
-- ============================================================
INSERT INTO email_delivery_log (recipient_email, subject, template, status, created_at) VALUES
  ('amara@techhub.gh',          'Welcome to SilkRoad Africa',              'welcome',             'sent',     now() - interval '3 days'),
  ('amara@techhub.gh',          'Order Confirmed — PO-2026-1247',         'order_confirmation',  'sent',     now() - interval '5 days'),
  ('david.chen@huanan.cn',      'New Order from TechHub Ghana',            'new_order_supplier',  'sent',     now() - interval '5 days'),
  ('james@nairobiimports.ke',   'Order PO-2026-1240 — Delivered',         'order_status_update', 'sent',     now() - interval '1 day'),
  ('ahmed@cairoelectronics.eg', 'Welcome to SilkRoad Africa',              'welcome',             'bounced',  now() - interval '10 days'),
  ('kwame@accraexports.gh',     'Your supplier verification is approved',  'welcome',             'sent',     now() - interval '2 days');

-- ============================================================
-- 11. AI usage
-- ============================================================
INSERT INTO ai_usage_log (feature_type, company_id, user_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost_usd, request_duration_ms, status, created_at) VALUES
  ('listing_generator',  '22222222-0001-0000-0000-000000000000', '55555555-0005-0000-0000-000000000000', 'claude-sonnet-4-5', 1800, 2400, 4200, 0.0252, 8500, 'success', now() - interval '2 days'),
  ('listing_generator',  '22222222-0006-0000-0000-000000000000', '55555555-0006-0000-0000-000000000000', 'claude-sonnet-4-5', 2100, 2800, 4900, 0.0294, 12300, 'success', now() - interval '6 hours'),
  ('pricing_engine',     '22222222-0001-0000-0000-000000000000', '55555555-0005-0000-0000-000000000000', 'claude-sonnet-4-5', 900,  600,  1500, 0.0090, 3200,  'success', now() - interval '3 days'),
  ('support_agent',      '33333333-0001-0000-0000-000000000000', '55555555-0001-0000-0000-000000000000', 'claude-sonnet-4-5', 500,  800,  1300, 0.0078, 4100,  'success', now() - interval '1 day'),
  ('dispute_resolver',   NULL,                                    '55555555-0099-0000-0000-000000000000', 'claude-sonnet-4-5', 3200, 1800, 5000, 0.0300, 9800,  'success', now() - interval '12 hours'),
  ('compliance_scanner', '22222222-0006-0000-0000-000000000000', NULL,                                    'claude-sonnet-4-5', 4500, 1200, 5700, 0.0342, 7600,  'success', now() - interval '2 days'),
  ('listing_generator',  '22222222-0001-0000-0000-000000000000', '55555555-0005-0000-0000-000000000000', 'claude-sonnet-4-5', 2400, 0,    2400, 0.0144, 30000, 'error',   now() - interval '2 days');

-- ============================================================
-- 12. Login attempts (success + failed brute-force)
-- ============================================================
INSERT INTO login_attempts (email, user_id, ip_address, status, failure_reason, attempted_at) VALUES
  ('admin@silkroadafrica.com', '55555555-0099-0000-0000-000000000000', '192.168.1.10',    'success', NULL,               now() - interval '2 hours'),
  ('amara@techhub.gh',         '55555555-0001-0000-0000-000000000000', '41.215.130.42',   'success', NULL,               now() - interval '30 minutes'),
  ('amara@techhub.gh',         NULL,                                    '103.45.67.89',    'failed',  'invalid_password', now() - interval '1 hour'),
  ('david.chen@huanan.cn',     '55555555-0005-0000-0000-000000000000', '116.25.103.8',    'success', NULL,               now() - interval '6 hours'),
  ('unknown@hacker.com',       NULL,                                    '185.220.101.45',  'failed',  'invalid_password', now() - interval '3 hours'),
  ('unknown@hacker.com',       NULL,                                    '185.220.101.45',  'failed',  'invalid_password', now() - interval '3 hours' + interval '10 seconds'),
  ('unknown@hacker.com',       NULL,                                    '185.220.101.45',  'blocked', 'rate_limited',     now() - interval '3 hours' + interval '20 seconds');

-- ============================================================
-- 13. Gateway transactions
-- ============================================================
INSERT INTO gateway_transaction_log (gateway, operation, amount, currency, status, response_time_ms, error_code, error_message, external_ref, created_at) VALUES
  ('stripe',       'charge', 2400000, 'USD', 'success', 1450, NULL,                  NULL,                                    'pi_stripe_001',  now() - interval '5 days'),
  ('stripe',       'charge', 2240000, 'USD', 'success', 980,  NULL,                  NULL,                                    'pi_stripe_002',  now() - interval '3 days'),
  ('mtn_momo',     'charge', 560000,  'USD', 'failed',  8500, 'INSUFFICIENT_FUNDS',  'Payer account has insufficient funds',  'momo_tx_001',    now() - interval '1 day'),
  ('mtn_momo',     'charge', 2850000, 'USD', 'success', 3200, NULL,                  NULL,                                    'momo_tx_002',    now() - interval '10 days'),
  ('stripe',       'refund', 285000,  'USD', 'success', 670,  NULL,                  NULL,                                    'rf_stripe_001',  now() - interval '1 day'),
  ('alipay',       'charge', 925000,  'USD', 'success', 4500, NULL,                  NULL,                                    'ali_tx_001',     now() - interval '20 days'),
  ('wechat_pay',   'charge', 1800000, 'CNY', 'success', 3800, NULL,                  NULL,                                    'wx_tx_001',      now() - interval '2 days'),
  ('mtn_momo',     'charge', 150000,  'USD', 'timeout', 30000,'TIMEOUT',             'Request timed out after 30s',           'momo_tx_003',    now() - interval '3 days'),
  ('airtel_money', 'charge', 420000,  'KES', 'success', 2100, NULL,                  NULL,                                    'air_tx_001',     now() - interval '4 days');

-- ============================================================
-- 14. Admin action audit
-- ============================================================
INSERT INTO admin_action_audit (admin_id, admin_email, action_type, target_entity, target_id, target_label, reason, created_at) VALUES
  ('55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'company_verification', 'company', '22222222-0001-0000-0000-000000000000', 'HuaNan Precision Machinery', 'Factory inspection passed',                        now() - interval '2 days'),
  ('55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'product_approval',     'product', NULL,                                     'CNC Laser Cutting Machine',  'Product listing meets quality standards',          now() - interval '2 days'),
  ('55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'config_change',        'config',  NULL,                                     'Commission Rate',             'Updated platform commission from 3% to 2.5%',     now() - interval '5 days'),
  ('55555555-0099-0000-0000-000000000000', 'admin@silkroadafrica.com', 'dispute_resolution',   'dispute', NULL,                                     'PO-2026-1240 Dispute',        'Resolved in favour of buyer — partial refund',    now() - interval '6 hours');

-- ============================================================
-- 15. Scheduled jobs
-- ============================================================
INSERT INTO scheduled_job_runs (job_name, job_type, started_at, completed_at, duration_ms, status, rows_affected, created_at) VALUES
  ('expire_rate_locks',   'pg_cron', now() - interval '6 hours',  now() - interval '6 hours'  + interval '120 milliseconds',  120,  'success', 0,  now() - interval '6 hours'),
  ('auto_expire_rfqs',    'pg_cron', now() - interval '6 hours',  now() - interval '6 hours'  + interval '350 milliseconds',  350,  'success', 2,  now() - interval '6 hours'),
  ('process_settlements', 'api_cron',now() - interval '8 hours',  now() - interval '8 hours'  + interval '4500 milliseconds', 4500, 'success', 3,  now() - interval '8 hours'),
  ('database_backup',     'pg_cron', now() - interval '6 hours',  now() - interval '6 hours'  + interval '4520 milliseconds', 4520, 'success', 0,  now() - interval '6 hours'),
  ('sync_exchange_rates', 'api_cron',now() - interval '3 hours',  now() - interval '3 hours'  + interval '2300 milliseconds', 2300, 'success', 42, now() - interval '3 hours');
