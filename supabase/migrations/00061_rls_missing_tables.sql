-- Enable RLS on tables that were missing it (security finding C-3)

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Helper: resolve auth.uid() → user_profiles.id
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM user_profiles WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Helper: resolve auth.uid() → company_id (first membership)
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth_profile_id() LIMIT 1
$$;

-- ── disputes ────────────────────────────────────────────────────────────────

CREATE POLICY "disputes_select_parties" ON disputes
  FOR SELECT USING (
    opened_by_company_id = auth_company_id()
    OR supplier_company_id = auth_company_id()
  );

CREATE POLICY "disputes_insert_buyer" ON disputes
  FOR INSERT WITH CHECK (
    opened_by_company_id = auth_company_id()
  );

CREATE POLICY "disputes_update_parties" ON disputes
  FOR UPDATE USING (
    opened_by_company_id = auth_company_id()
    OR supplier_company_id = auth_company_id()
  );

-- ── promoted_listings ────────────────────────────────────────────────────────

CREATE POLICY "promoted_listings_select_own" ON promoted_listings
  FOR SELECT USING (supplier_id = auth_company_id());

CREATE POLICY "promoted_listings_insert_own" ON promoted_listings
  FOR INSERT WITH CHECK (supplier_id = auth_company_id());

CREATE POLICY "promoted_listings_update_own" ON promoted_listings
  FOR UPDATE USING (supplier_id = auth_company_id());

CREATE POLICY "promoted_listings_delete_own" ON promoted_listings
  FOR DELETE USING (supplier_id = auth_company_id());

-- ── promotion_usage ──────────────────────────────────────────────────────────

CREATE POLICY "promotion_usage_select_own" ON promotion_usage
  FOR SELECT USING (supplier_id = auth_company_id());

CREATE POLICY "promotion_usage_insert_own" ON promotion_usage
  FOR INSERT WITH CHECK (supplier_id = auth_company_id());

CREATE POLICY "promotion_usage_update_own" ON promotion_usage
  FOR UPDATE USING (supplier_id = auth_company_id());

-- ── reviews ──────────────────────────────────────────────────────────────────

-- Anyone can read reviews (public product ratings)
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (reviewer_user_id = auth_profile_id());

CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (reviewer_user_id = auth_profile_id());

CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (reviewer_user_id = auth_profile_id());
