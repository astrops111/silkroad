-- ============================================================
-- 00124_notification_type_check_fix.sql
-- The 00080 constraint omitted types that live code passes to
-- create_notification(): 'rfq' (events.ts RFQ/quotation flows),
-- 'order' (order placed / new order), 'delivery' (every shipment
-- milestone in milestone-notify.ts), and 'quote'
-- (ops-freight-quotes). Those calls raised 23514, and because the
-- callers catch-and-swallow, in-app + email + deal-thread
-- notifications for those flows were silently dropped.
-- Full superset of 00080 plus the four missing values.
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
    'quote_submitted', 'quote_ready', 'quote_paid', 'quote_expired',
    'rfq', 'order', 'delivery', 'quote',
    'system'
  ));
