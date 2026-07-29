-- ============================================================
-- 00133_rfq_admin_gated_supplier_visibility.sql
--
-- RFQs are no longer visible/notified to suppliers the moment a buyer
-- publishes them. An admin must first review the RFQ and either assign it
-- to a specific supplier (who then gets a draft quote to confirm) or
-- respond on the supplier's behalf directly (submitting a quote for them).
-- supplier_visible_at is set by that admin action; NULL means "not yet
-- reviewed" — public and invited-supplier RLS reads are gated on it.
-- Buyer and admin access are unaffected.
-- ============================================================

ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS supplier_visible_at timestamptz;

DROP POLICY IF EXISTS "Anyone can view public open RFQs" ON rfqs;
CREATE POLICY "Anyone can view public open RFQs" ON rfqs
  FOR SELECT USING (
    (is_public = true AND status IN ('open', 'quoted') AND supplier_visible_at IS NOT NULL)
    OR buyer_user_id = get_user_profile_id()
    OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR (invited_supplier_ids && get_user_companies() AND supplier_visible_at IS NOT NULL)
    OR is_admin()
  );

DROP POLICY IF EXISTS "RFQ items follow RFQ access" ON rfq_items;
CREATE POLICY "RFQ items follow RFQ access" ON rfq_items
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted') AND supplier_visible_at IS NOT NULL)
      OR (invited_supplier_ids && get_user_companies() AND supplier_visible_at IS NOT NULL)
      OR is_admin()
    )
  );

DROP POLICY IF EXISTS "RFQ attachments follow RFQ access" ON rfq_attachments;
CREATE POLICY "RFQ attachments follow RFQ access" ON rfq_attachments
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted') AND supplier_visible_at IS NOT NULL)
      OR (invited_supplier_ids && get_user_companies() AND supplier_visible_at IS NOT NULL)
      OR is_admin()
    )
  );
