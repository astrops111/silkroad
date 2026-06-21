-- ============================================================
-- 00074: Quote lifecycle triggers + notification types
-- ============================================================

-- 1. Extend notifications.type CHECK to include quote events
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'order_placed', 'order_paid', 'order_confirmed', 'order_shipped', 'order_delivered',
  'rfq_received', 'rfq_quoted', 'rfq_awarded', 'rfq_expired',
  'quotation_received', 'quotation_accepted', 'quotation_rejected',
  'message_received',
  'product_approved', 'product_rejected',
  'settlement_ready', 'settlement_paid',
  'supplier_verified', 'supplier_suspended',
  'quote_submitted', 'quote_ready', 'quote_paid', 'quote_expired',
  'system'
));

-- ============================================================
-- 2. Sync purchase_order paid → buyer_quote_request paid
-- ============================================================
CREATE OR REPLACE FUNCTION sync_quote_paid_on_order_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE buyer_quote_requests
    SET status = 'paid', updated_at = now()
    WHERE purchase_order_id = NEW.id
      AND status NOT IN ('paid', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quote_paid_on_order_paid ON purchase_orders;
CREATE TRIGGER trg_sync_quote_paid_on_order_paid
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION sync_quote_paid_on_order_paid();

-- ============================================================
-- 3. Notify buyer when their quote is ready
-- ============================================================
CREATE OR REPLACE FUNCTION notify_buyer_on_quote_ready()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ready' AND (OLD.status IS DISTINCT FROM 'ready') THEN
    PERFORM create_notification(
      NEW.buyer_user_id,
      NULL,
      'Your quote is ready',
      'Landed-cost quote ' || NEW.quote_number || ' is ready to review. Click to see the full breakdown and pay.',
      'quote_ready',
      'file-text',
      '/quotes/' || NEW.id::TEXT,
      'buyer_quote_request',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyer_on_quote_ready ON buyer_quote_requests;
CREATE TRIGGER trg_notify_buyer_on_quote_ready
  AFTER UPDATE ON buyer_quote_requests
  FOR EACH ROW EXECUTE FUNCTION notify_buyer_on_quote_ready();

-- ============================================================
-- 4. Notify admins when a new quote is submitted
-- ============================================================
CREATE OR REPLACE FUNCTION notify_admins_on_quote_submitted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_admin RECORD;
BEGIN
  FOR v_admin IN
    SELECT up.id AS user_id
    FROM company_members cm
    JOIN user_profiles up ON up.id = cm.user_id
    WHERE cm.role IN ('admin_super', 'admin_moderator', 'logistics_admin', 'logistics_dispatcher')
  LOOP
    PERFORM create_notification(
      v_admin.user_id,
      NULL,
      'New quote request',
      'Buyer submitted cart for quote ' || NEW.quote_number || '. Action required: calculate landed cost.',
      'quote_submitted',
      'clipboard-list',
      '/admin/logistics/buyer-quotes/' || NEW.id::TEXT,
      'buyer_quote_request',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_quote_submitted ON buyer_quote_requests;
CREATE TRIGGER trg_notify_admins_on_quote_submitted
  AFTER INSERT ON buyer_quote_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admins_on_quote_submitted();

-- ============================================================
-- 5. Notify buyer when their quote expires
-- ============================================================
CREATE OR REPLACE FUNCTION notify_buyer_on_quote_expired()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'expired' AND (OLD.status IS DISTINCT FROM 'expired') THEN
    PERFORM create_notification(
      NEW.buyer_user_id,
      NULL,
      'Quote expired',
      'Your quote ' || NEW.quote_number || ' has expired. Submit a new cart request to get a fresh quote.',
      'quote_expired',
      'clock',
      '/quotes',
      'buyer_quote_request',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyer_on_quote_expired ON buyer_quote_requests;
CREATE TRIGGER trg_notify_buyer_on_quote_expired
  AFTER UPDATE ON buyer_quote_requests
  FOR EACH ROW EXECUTE FUNCTION notify_buyer_on_quote_expired();
