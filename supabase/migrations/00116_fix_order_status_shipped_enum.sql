-- notify_on_order_status_change() referenced the literal 'shipped' in two
-- IN-lists, but 'shipped' was never a value of the b2b_order_status enum
-- (the enum uses 'dispatched' for this state — see 00001_enums.sql). Since
-- this function is an AFTER INSERT OR UPDATE OF status trigger on
-- supplier_orders, the invalid enum literal made every single insert or
-- status update on that table fail with:
--   invalid input value for enum b2b_order_status: "shipped"
-- regardless of what status was actually being written. This blocked the
-- entire order-creation pipeline (RFQ award->convert, quote accept->order,
-- checkout), not just RFQs.

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

  IF NEW.status = 'dispatched' AND (OLD IS NULL OR OLD.status != 'dispatched') THEN
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
