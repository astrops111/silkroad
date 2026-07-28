-- ============================================================
-- 00128_commodities_approval_admin_only.sql
--
-- src/lib/actions/resources-listing.ts's toggleResourceListingActive
-- was fixed to only allow suppliers two closed self-service status
-- transitions (approved->suspended, suspended->pending) — but that's an
-- application-layer guard only. commodities' RLS policy
-- "commodities_seller_own" (00035_commission_rules_commodities.sql) is
-- `FOR ALL USING (tenant_id IN get_user_companies())` with no WITH CHECK
-- restricting *which* status a seller may write, so any authenticated
-- member of a supplier company could set status = 'approved' directly
-- via a raw Supabase/PostgREST call, bypassing the app entirely and
-- self-approving export listings with zero compliance review.
--
-- This trigger is the actual enforcement boundary: it fires regardless
-- of transport (server action, direct client call, admin tooling) and
-- blocks any insert/update that sets status = 'approved' unless the
-- acting user is_admin(). Mirrors the existing enforce_resource_compliance
-- trigger's pattern (BEFORE INSERT OR UPDATE OF status on commodities).
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_commodity_approval_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can approve a resource listing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commodity_approval_admin_only ON commodities;
CREATE TRIGGER trg_commodity_approval_admin_only
  BEFORE INSERT OR UPDATE OF status ON commodities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_commodity_approval_admin_only();
