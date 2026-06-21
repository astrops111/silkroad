-- ============================================================
-- 00079_settlement_kyc_notifications.sql
-- Adds settlement_blocked and settlement_failed notification types
-- for KYC guard failures in the settlement engine
-- ============================================================

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'order_placed', 'order_paid', 'order_confirmed', 'order_shipped', 'order_delivered',
    'rfq_received', 'rfq_quoted', 'rfq_awarded', 'rfq_expired',
    'quotation_received', 'quotation_accepted', 'quotation_rejected',
    'message_received',
    'product_approved', 'product_rejected',
    'settlement_ready', 'settlement_paid', 'settlement_blocked', 'settlement_failed',
    'supplier_verified', 'supplier_suspended',
    'system'
  ));
