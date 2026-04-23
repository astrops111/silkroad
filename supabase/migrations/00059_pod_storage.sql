-- ============================================================
-- Storage bucket for proof-of-delivery artefacts (Phase 2 follow-up)
--
-- Holds two artefact types per shipment:
--   - signature.png  (base64 PNG captured client-side via canvas)
--   - photo.jpg      (recipient photo uploaded from camera/file)
--
-- Bucket is private (public=false). Signed URLs are generated on
-- read; admin role gates writes. Admin reads via signed URL OR via
-- the policy below — we keep both paths so the shipment-detail page
-- can render thumbnails directly.
--
-- If your Supabase project was set up with the bucket already
-- created via dashboard, the INSERT no-ops thanks to ON CONFLICT.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('shipment-pod', 'shipment-pod', false)
ON CONFLICT (id) DO NOTHING;

-- Read: any authenticated admin can read POD artefacts.
DO $$ BEGIN
  DROP POLICY IF EXISTS "shipment-pod admin read" ON storage.objects;
END $$;
CREATE POLICY "shipment-pod admin read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'shipment-pod' AND is_admin());

-- Write: same — admin only. The POD server action uses the user's
-- auth context, so the role check is honored.
DO $$ BEGIN
  DROP POLICY IF EXISTS "shipment-pod admin write" ON storage.objects;
END $$;
CREATE POLICY "shipment-pod admin write" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'shipment-pod' AND is_admin());

DO $$ BEGIN
  DROP POLICY IF EXISTS "shipment-pod admin update" ON storage.objects;
END $$;
CREATE POLICY "shipment-pod admin update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'shipment-pod' AND is_admin())
  WITH CHECK (bucket_id = 'shipment-pod' AND is_admin());

DO $$ BEGIN
  DROP POLICY IF EXISTS "shipment-pod admin delete" ON storage.objects;
END $$;
CREATE POLICY "shipment-pod admin delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'shipment-pod' AND is_admin());
