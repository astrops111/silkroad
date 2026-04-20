-- ============================================================
-- 00036_security_hardening.sql — Resolve "Danger" recommendations
-- ============================================================

-- 1. ENABLE RLS ON MISSING TABLES
ALTER TABLE IF EXISTS route_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS optimized_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS optimized_route_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_feature_flags ENABLE ROW LEVEL SECURITY;

-- 2. DROP INSECURE "SERVICE ROLE" POLICIES THAT ACCIDENTALLY OPENED TABLES TO PUBLIC
-- Service role bypasses RLS automatically in Supabase, so these "managed by" policies
-- were not only redundant but dangerous as they provided 'USING (true)'.

DO $$
DECLARE
  tbl_name TEXT;
  pol_name TEXT;
BEGIN
  -- List of tables from 00033 and 00022 that had insecure "Service role manages..." policies
  FOR tbl_name IN
    SELECT unnest(ARRAY[
      'system_activity_log', 'system_logs', 'error_logs',
      'webhook_deliveries', 'ai_usage_log', 'ai_usage_quota',
      'email_delivery_log', 'gateway_health_checks', 'gateway_transaction_log',
      'user_sessions', 'login_attempts', 'scheduled_job_runs',
      'database_metrics', 'admin_action_audit', 'data_deletion_requests',
      'file_storage_log', 'subscription_events', 'shipment_exceptions',
      'shipment_sla_tracking', 'api_rate_limit_breaches', 'refund_processing_log'
    ])
  LOOP
    -- Drop the naming pattern used in 00033
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages activity log" ON system_activity_log');
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages system logs" ON system_logs');
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages error logs" ON error_logs');
    
    -- Drop the naming pattern used in 00022 loop
    pol_name := format('Service role manages %I', tbl_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl_name);
  END LOOP;
END
$$;

-- 3. DEFINE SECURE ROLE-BASED POLICIES FOR NEWLY PROTECTED TABLES

-- 3.1 AI Feature Flags: Admins manage, all authenticated users can read (to check available features)
CREATE POLICY "Super admins manage AI flags" ON ai_feature_flags
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Authenticated users read AI flags" ON ai_feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3.2 Route Optimization: Logistics and Admins only
CREATE POLICY "Logistics and Admins see optimization runs" ON route_optimization_runs
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY "Logistics and Admins manage optimization runs" ON route_optimization_runs
  FOR ALL USING (is_logistics() OR is_admin()) WITH CHECK (is_logistics() OR is_admin());

CREATE POLICY "Logistics and Admins see optimized routes" ON optimized_routes
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY "Logistics and Admins manage optimized routes" ON optimized_routes
  FOR ALL USING (is_logistics() OR is_admin()) WITH CHECK (is_logistics() OR is_admin());

CREATE POLICY "Logistics and Admins see route shipments" ON optimized_route_shipments
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY "Logistics and Admins manage route shipments" ON optimized_route_shipments
  FOR ALL USING (is_logistics() OR is_admin()) WITH CHECK (is_logistics() OR is_admin());

-- 4. HARDEN LOGGING POLICIES (Required because we dropped the "Service role" ones)
-- Super admins already had SELECT policies in 00033/00022, but we ensure they have full management access.
-- We also ensure only 'service_role' can actually INSERT (implicit via RLS bypass).

CREATE POLICY "Super admins manage activity log" ON system_activity_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Super admins manage system logs" ON system_logs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Super admins manage error logs" ON error_logs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Re-verify that all maintenance tables have admin manage policies
DO $$
DECLARE
  tbl_name TEXT;
  pol_name TEXT;
BEGIN
  FOR tbl_name IN
    SELECT unnest(ARRAY[
      'webhook_deliveries', 'ai_usage_log', 'ai_usage_quota',
      'email_delivery_log', 'gateway_health_checks', 'gateway_transaction_log',
      'user_sessions', 'login_attempts', 'scheduled_job_runs',
      'database_metrics', 'admin_action_audit', 'data_deletion_requests',
      'file_storage_log', 'subscription_events', 'shipment_exceptions',
      'shipment_sla_tracking', 'api_rate_limit_breaches', 'refund_processing_log'
    ])
  LOOP
    pol_name := format('Super admin manages %I', tbl_name);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (is_admin()) WITH CHECK (is_admin())', pol_name, tbl_name);
  END LOOP;
END
$$;
