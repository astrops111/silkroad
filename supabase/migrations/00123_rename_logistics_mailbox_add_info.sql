-- ============================================================
-- 00123_rename_logistics_mailbox_add_info.sql — rename the
-- logistic@ mailbox (seeded in 00094) to logistics@, and add
-- the info@ mailbox. All four hosted boxes (sales, logistics,
-- support, info) share one mailbox password at the host, but
-- each keeps its own credential_ref env var per the existing
-- per-mailbox pattern.
-- ============================================================

UPDATE mailboxes
SET
  address = 'logistics@silkroad.africa',
  username = 'logistics@silkroad.africa',
  credential_ref = 'MAIL_PW_LOGISTICS'
WHERE address = 'logistic@silkroad.africa';

INSERT INTO mailboxes (address, display_name, username, credential_ref)
VALUES
  ('info@silkroad.africa', 'SilkRoad Info', 'info@silkroad.africa', 'MAIL_PW_INFO')
ON CONFLICT (address) DO NOTHING;
