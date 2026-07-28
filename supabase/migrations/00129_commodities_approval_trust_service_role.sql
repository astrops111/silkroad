-- ============================================================
-- 00129_commodities_approval_trust_service_role.sql
--
-- moderateResourceListing (src/lib/actions/resources-listing.ts) writes
-- the approval via createServiceClient() after its own requireAdminWrite()
-- gate — service-role connections have no auth.uid() at all, so the
-- 00128 trigger's is_admin() check unconditionally rejected it, even
-- though the write path is already admin-gated at the app layer.
--
-- A cookie-scoped (auth.uid()-bound) write attempting the same thing is
-- still blocked, since a non-admin's own session has neither
-- auth.role() = 'service_role' nor is_admin() = true.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_commodity_approval_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND auth.role() IS DISTINCT FROM 'service_role' AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can approve a resource listing';
  END IF;
  RETURN NEW;
END;
$$;
