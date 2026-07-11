-- ============================================================
-- 00093_rfq_invited_supplier_access.sql
--
-- Fixes a gap in the RFQ RLS policies from 00015_rfq_system.sql: private
-- RFQs created via /api/rfqs/from-cart (is_public = false, a specific
-- supplier listed in invited_supplier_ids) were only ever visible to the
-- buyer — the invited supplier's own company had no RLS grant to read the
-- row, so their "submit quote" page always got zero rows back (rendered as
-- a 404). Public/open RFQs already worked for suppliers at the RLS layer;
-- only the invited-supplier case was missing.
--
-- Adds "OR invited_supplier_ids && get_user_companies()" (array overlap) to
-- the read policies on rfqs/rfq_items/rfq_attachments. Write policies
-- ("Buyer manages own RFQs") are untouched — suppliers still can't modify
-- an RFQ, only view one they're invited to.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view public open RFQs" ON rfqs;
CREATE POLICY "Anyone can view public open RFQs" ON rfqs
  FOR SELECT USING (
    (is_public = true AND status IN ('open', 'quoted'))
    OR buyer_user_id = get_user_profile_id()
    OR buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR invited_supplier_ids && get_user_companies()
    OR is_admin()
  );

DROP POLICY IF EXISTS "RFQ items follow RFQ access" ON rfq_items;
CREATE POLICY "RFQ items follow RFQ access" ON rfq_items
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted'))
      OR invited_supplier_ids && get_user_companies()
      OR is_admin()
    )
  );

DROP POLICY IF EXISTS "RFQ attachments follow RFQ access" ON rfq_attachments;
CREATE POLICY "RFQ attachments follow RFQ access" ON rfq_attachments
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE
      buyer_user_id = get_user_profile_id()
      OR buyer_company_id IN (SELECT unnest(get_user_companies()))
      OR (is_public = true AND status IN ('open', 'quoted'))
      OR invited_supplier_ids && get_user_companies()
      OR is_admin()
    )
  );
