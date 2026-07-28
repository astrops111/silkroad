-- ============================================================
-- Fix checkout leg 2: supplier_order_items INSERT policy
--
-- Companion to 00131. supplier_order_items_insert (00012) only allows
-- the SUPPLIER (or admin) to insert line items, but line items are
-- written by the BUYER during checkout (POST /api/orders) right after
-- creating the supplier_orders row. With 00131 the supplier-order
-- insert now succeeds and the order then partially fails here,
-- leaving supplier orders with no items.
--
-- Extend the policy with the same buyer-ownership arm used by
-- supplier_order_items_select: the buyer who owns the parent
-- purchase order may insert items for it.
-- ============================================================

DROP POLICY IF EXISTS supplier_order_items_insert ON supplier_order_items;

CREATE POLICY supplier_order_items_insert ON supplier_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (
          so.supplier_id = ANY(get_user_companies())
          OR EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = so.purchase_order_id
              AND (po.buyer_user_id = get_user_profile_id()
                   OR po.buyer_company_id = ANY(get_user_companies()))
          )
          OR is_admin()
        )
    )
  );
