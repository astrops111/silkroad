-- ============================================================
-- 00041_company_tiers_and_gates.sql — Unified company tier model
-- Promotes tier from supplier_profiles to companies so buyers and
-- suppliers share one subscription surface. Adds paid-member helper
-- and gates RFQ creation / quotation submission at the RLS layer.
-- ============================================================

-- ── Unified tier on companies ────────────────────────────────────────────────
-- Reuses existing `supplier_tier` enum ('free','standard','gold','verified').
-- Semantics here: `verified` is kept for back-compat but `is_verified` is a
-- separate boolean so tier expresses commercial plan only.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tier             supplier_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies (tier, tier_expires_at);

-- Backfill from supplier_profiles where tier was previously tracked.
UPDATE companies c
SET tier = sp.tier,
    tier_expires_at = sp.tier_expires_at
FROM supplier_profiles sp
WHERE sp.company_id = c.id
  AND c.tier = 'free'
  AND sp.tier <> 'free';

-- Keep supplier_profiles.tier in sync going forward via trigger so legacy
-- reads still work, but companies.tier is the authoritative source.
CREATE OR REPLACE FUNCTION sync_supplier_tier_from_company()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE supplier_profiles
    SET tier = NEW.tier, tier_expires_at = NEW.tier_expires_at
    WHERE company_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_tier_sync ON companies;
CREATE TRIGGER trg_companies_tier_sync
  AFTER UPDATE OF tier, tier_expires_at ON companies
  FOR EACH ROW
  WHEN (OLD.tier IS DISTINCT FROM NEW.tier
        OR OLD.tier_expires_at IS DISTINCT FROM NEW.tier_expires_at)
  EXECUTE FUNCTION sync_supplier_tier_from_company();

-- ── Paid-member predicate ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_paid_member(company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies
    WHERE id = company
      AND tier IN ('standard', 'gold')
      AND (tier_expires_at IS NULL OR tier_expires_at > now())
  );
$$;

-- Convenience: caller has at least one paid company they belong to.
CREATE OR REPLACE FUNCTION caller_has_paid_company()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(get_user_companies()) AS cid(id)
    WHERE is_paid_member(cid.id)
  );
$$;

COMMENT ON FUNCTION is_paid_member(UUID) IS
  'Returns true if the given company has an active paid tier (standard or gold).';
COMMENT ON FUNCTION caller_has_paid_company() IS
  'Returns true if the calling user is a member of at least one paid-tier company.';

-- ── Gate RFQ creation ────────────────────────────────────────────────────────
-- Existing "Buyer manages own RFQs" policy allows INSERT; we add a stricter
-- WITH CHECK policy requiring the buyer_company_id to be paid. Admins bypass.
DROP POLICY IF EXISTS "rfqs_paid_insert" ON rfqs;
CREATE POLICY "rfqs_paid_insert" ON rfqs
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      buyer_company_id IS NOT NULL
      AND buyer_company_id = ANY(get_user_companies())
      AND is_paid_member(buyer_company_id)
    )
  );

-- Tighten the existing catch-all so INSERT must satisfy the paid policy
-- (the catch-all still governs UPDATE/DELETE by owner).
DROP POLICY IF EXISTS "Buyer manages own RFQs" ON rfqs;
CREATE POLICY "rfqs_buyer_manages_own" ON rfqs
  FOR UPDATE USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  )
  WITH CHECK (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  );

DROP POLICY IF EXISTS "rfqs_buyer_deletes_own" ON rfqs;
CREATE POLICY "rfqs_buyer_deletes_own" ON rfqs
  FOR DELETE USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  );

-- ── Gate quotation submission ───────────────────────────────────────────────
DROP POLICY IF EXISTS "quotations_paid_insert" ON quotations;
CREATE POLICY "quotations_paid_insert" ON quotations
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      supplier_id = ANY(get_user_companies())
      AND is_paid_member(supplier_id)
    )
  );

-- Keep the existing catch-all for UPDATE/DELETE by owner, but split it so
-- the paid gate applies only at insert.
DROP POLICY IF EXISTS "Supplier manages own quotations" ON quotations;
CREATE POLICY "quotations_supplier_updates_own" ON quotations
  FOR UPDATE USING (
    supplier_id = ANY(get_user_companies()) OR is_admin()
  )
  WITH CHECK (
    supplier_id = ANY(get_user_companies()) OR is_admin()
  );

DROP POLICY IF EXISTS "quotations_supplier_deletes_own" ON quotations;
CREATE POLICY "quotations_supplier_deletes_own" ON quotations
  FOR DELETE USING (
    supplier_id = ANY(get_user_companies()) OR is_admin()
  );
