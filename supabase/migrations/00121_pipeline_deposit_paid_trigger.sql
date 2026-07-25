-- ============================================================
-- 00121_pipeline_deposit_paid_trigger.sql
-- A deposit landing (supplier_orders.status → 'deposit_paid') should kick
-- off the same supplier-notification/production-start pipeline as a full
-- payment — that's the commercial point of a deposit. Widen the existing
-- order.payment_confirmed trigger condition to cover both statuses.
--
-- The later deposit_paid → paid transition (balance payment) must NOT
-- re-fire the event — the supplier was already notified when the deposit
-- landed — so the OLD.status guard excludes both terminal-paid statuses,
-- not just 'paid'.
--
-- CREATE OR REPLACE FUNCTION is idempotent; only the first IF branch of
-- trg_supplier_order_pipeline() (defined in 00073_pipeline_event_queue.sql)
-- changes, the rest of the function is reproduced unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_supplier_order_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('paid', 'deposit_paid')
     AND (OLD IS NULL OR OLD.status NOT IN ('paid', 'deposit_paid')) THEN
    PERFORM enqueue_pipeline_event(
      'order.payment_confirmed',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',  NEW.supplier_id,
        'grandTotal',  NEW.total_amount,
        'currency',    NEW.currency,
        'orderNumber', NEW.order_number
      )
    );
  END IF;

  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM enqueue_pipeline_event(
      'order.supplier_notified',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',        NEW.supplier_id,
        'estimatedShipDate', NEW.estimated_ship_date
      )
    );
  END IF;

  IF NEW.status = 'ready_to_ship' AND (OLD IS NULL OR OLD.status != 'ready_to_ship') THEN
    PERFORM enqueue_pipeline_event(
      'order.supplier_shipped',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object(
        'supplierId',     NEW.supplier_id,
        'shippingMethod', NEW.shipping_method,
        'tradeTerm',      NEW.trade_term,
        'shipToCountry',  NEW.ship_to_country
      )
    );
  END IF;

  IF NEW.status = 'delivered' AND (OLD IS NULL OR OLD.status != 'delivered') THEN
    PERFORM enqueue_pipeline_event(
      'settlement.triggered',
      NEW.purchase_order_id, NEW.id, NULL,
      jsonb_build_object('supplierId', NEW.supplier_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
