-- ============================================================
-- 00017_notifications.sql — In-app notification system
-- Uses Supabase Realtime for live push to connected clients
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),

  -- Content
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT,                  -- lucide icon name: 'shopping-cart', 'file-text', 'truck', etc.
  action_url TEXT,            -- where clicking the notification navigates to

  -- Type for filtering/grouping
  type TEXT NOT NULL CHECK (type IN (
    'order_placed', 'order_paid', 'order_confirmed', 'order_shipped', 'order_delivered',
    'rfq_received', 'rfq_quoted', 'rfq_awarded', 'rfq_expired',
    'quotation_received', 'quotation_accepted', 'quotation_rejected',
    'message_received',
    'product_approved', 'product_rejected',
    'settlement_ready', 'settlement_paid',
    'supplier_verified', 'supplier_suspended',
    'system'
  )),

  -- Context references
  reference_type TEXT,        -- 'order', 'rfq', 'quotation', 'product', 'settlement', 'conversation'
  reference_id UUID,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(user_id, type);
CREATE INDEX idx_notifications_company ON notifications(company_id, created_at DESC);

-- Notification preferences per user
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Channel toggles
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT true,
  push BOOLEAN DEFAULT false,

  -- Per-type toggles (null = use default which is ON)
  order_updates BOOLEAN DEFAULT true,
  rfq_updates BOOLEAN DEFAULT true,
  message_alerts BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  settlement_updates BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================================
-- Helper function to create a notification
-- Called from API routes or triggers
-- ============================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_company_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_prefs RECORD;
BEGIN
  -- Check preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;

  -- If no prefs, default to all on
  IF v_prefs IS NULL OR v_prefs.in_app = true THEN
    INSERT INTO notifications (user_id, company_id, title, body, type, icon, action_url, reference_type, reference_id)
    VALUES (p_user_id, p_company_id, p_title, p_body, p_type, p_icon, p_action_url, p_reference_type, p_reference_id)
    RETURNING id INTO v_id;

    RETURN v_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger: notify supplier when order is placed
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_user_id UUID;
  v_buyer_user_id UUID;
  v_order_number TEXT;
BEGIN
  -- Get supplier primary user
  SELECT cm.user_id INTO v_supplier_user_id
  FROM company_members cm
  WHERE cm.company_id = NEW.supplier_id AND cm.is_primary = true
  LIMIT 1;

  -- Get buyer from purchase order
  SELECT po.buyer_user_id INTO v_buyer_user_id
  FROM purchase_orders po
  WHERE po.id = NEW.purchase_order_id;

  v_order_number := NEW.order_number;

  -- Notify based on status change
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    -- Notify supplier: new paid order
    IF v_supplier_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_supplier_user_id, NEW.supplier_id,
        'New Order Received',
        'Order ' || v_order_number || ' has been paid and is ready for confirmation.',
        'order_paid', 'shopping-cart',
        '/supplier/orders/' || NEW.id,
        'order', NEW.id
      );
    END IF;
  END IF;

  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Notify buyer: order confirmed
    IF v_buyer_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_buyer_user_id, NULL,
        'Order Confirmed',
        'Your order ' || v_order_number || ' has been confirmed by the supplier.',
        'order_confirmed', 'check-circle-2',
        '/dashboard/orders/' || NEW.purchase_order_id,
        'order', NEW.id
      );
    END IF;
  END IF;

  IF NEW.status IN ('shipped', 'dispatched') AND (OLD IS NULL OR OLD.status NOT IN ('shipped', 'dispatched')) THEN
    IF v_buyer_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_buyer_user_id, NULL,
        'Order Shipped',
        'Your order ' || v_order_number || ' is on its way!',
        'order_shipped', 'truck',
        '/dashboard/orders/' || NEW.purchase_order_id,
        'order', NEW.id
      );
    END IF;
  END IF;

  IF NEW.status = 'delivered' AND (OLD IS NULL OR OLD.status != 'delivered') THEN
    IF v_buyer_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_buyer_user_id, NULL,
        'Order Delivered',
        'Your order ' || v_order_number || ' has been delivered.',
        'order_delivered', 'package',
        '/dashboard/orders/' || NEW.purchase_order_id,
        'order', NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_supplier_order_status_notify
AFTER INSERT OR UPDATE OF status ON supplier_orders
FOR EACH ROW EXECUTE FUNCTION notify_on_order_status_change();

-- ============================================================
-- Trigger: notify supplier when quotation is accepted/rejected
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_quotation_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_user_id UUID;
  v_rfq_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    SELECT title INTO v_rfq_title FROM rfqs WHERE id = NEW.rfq_id;

    PERFORM create_notification(
      NEW.supplier_user_id, NEW.supplier_id,
      'Quotation Accepted!',
      'Your quotation for "' || COALESCE(v_rfq_title, 'RFQ') || '" has been accepted.',
      'quotation_accepted', 'check-circle-2',
      '/supplier/rfq',
      'quotation', NEW.id
    );
  END IF;

  IF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status != 'rejected') THEN
    SELECT title INTO v_rfq_title FROM rfqs WHERE id = NEW.rfq_id;

    PERFORM create_notification(
      NEW.supplier_user_id, NEW.supplier_id,
      'Quotation Not Selected',
      'Your quotation for "' || COALESCE(v_rfq_title, 'RFQ') || '" was not selected.',
      'quotation_rejected', 'x-circle',
      '/supplier/rfq',
      'quotation', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quotation_status_notify
AFTER UPDATE OF status ON quotations
FOR EACH ROW EXECUTE FUNCTION notify_on_quotation_status_change();

-- ============================================================
-- Trigger: notify on product moderation
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_product_moderation()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_user_id UUID;
BEGIN
  IF NEW.moderation_status IN ('approved', 'rejected') AND (OLD IS NULL OR OLD.moderation_status != NEW.moderation_status) THEN
    SELECT cm.user_id INTO v_supplier_user_id
    FROM company_members cm
    WHERE cm.company_id = NEW.supplier_id AND cm.is_primary = true
    LIMIT 1;

    IF v_supplier_user_id IS NOT NULL THEN
      IF NEW.moderation_status = 'approved' THEN
        PERFORM create_notification(
          v_supplier_user_id, NEW.supplier_id,
          'Product Approved',
          '"' || NEW.name || '" has been approved and is now live on the marketplace.',
          'product_approved', 'check-circle-2',
          '/supplier/products',
          'product', NEW.id
        );
      ELSE
        PERFORM create_notification(
          v_supplier_user_id, NEW.supplier_id,
          'Product Rejected',
          '"' || NEW.name || '" has been rejected. Please review and resubmit.',
          'product_rejected', 'x-circle',
          '/supplier/products',
          'product', NEW.id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_moderation_notify
AFTER UPDATE OF moderation_status ON products
FOR EACH ROW EXECUTE FUNCTION notify_on_product_moderation();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (user_id = get_user_profile_id() OR is_admin());

CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = get_user_profile_id() OR is_admin());

-- Enable Realtime for live notification push
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
