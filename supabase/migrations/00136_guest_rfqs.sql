-- ============================================================
-- Guest RFQs — quote requests from signed-out visitors
-- ============================================================
-- The cart / quote builder (/cart) is a public route: a visitor can add
-- products and request a quote without an account. Until now rfqs.buyer_user_id
-- was NOT NULL, so those submissions had nowhere to land.
--
-- Rather than mint throwaway auth users, a guest RFQ carries its contact
-- details inline and leaves buyer_user_id NULL. Ops work the RFQ from
-- /admin/rfqs exactly as they would an account-holder's.
--
-- Safety notes:
--   * Guest RFQs are inserted with the service client, so the existing
--     "buyer_user_id = get_user_profile_id()" check is bypassed by design —
--     the route validates the payload instead.
--   * Those same SELECT policies compare a NULL buyer_user_id, which yields
--     NULL (never true), so a guest RFQ is invisible to every non-admin.
--     Suppliers still only see an RFQ after an admin assigns it
--     (00133_rfq_admin_gated_supplier_visibility.sql).

ALTER TABLE rfqs ALTER COLUMN buyer_user_id DROP NOT NULL;

ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS guest_name    TEXT,
  ADD COLUMN IF NOT EXISTS guest_email   TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone   TEXT,
  ADD COLUMN IF NOT EXISTS guest_company TEXT;

COMMENT ON COLUMN rfqs.guest_email IS
  'Contact email for RFQs submitted without an account; NULL for account-holder RFQs.';

-- Every RFQ must still be attributable to someone.
ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS rfqs_buyer_identity_check;
ALTER TABLE rfqs ADD CONSTRAINT rfqs_buyer_identity_check
  CHECK (buyer_user_id IS NOT NULL OR guest_email IS NOT NULL);

-- Lets ops group a returning guest's requests, and later backfill
-- buyer_user_id if that visitor registers with the same address.
CREATE INDEX IF NOT EXISTS idx_rfqs_guest_email
  ON rfqs (lower(guest_email))
  WHERE guest_email IS NOT NULL;
