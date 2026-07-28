-- ============================================================
-- Fix checkout: supplier_orders INSERT policy broke order placement
--
-- Migration 00075 (H15) replaced supplier_orders_admin_insert with
-- supplier_orders_supplier_insert, whose EXISTS subquery selects from
-- supplier_orders itself. Evaluating that subquery re-enters the
-- table's own RLS policies -> Postgres error 42P17 ("infinite
-- recursion detected in policy for relation \"supplier_orders\"")
-- on EVERY non-admin insert. Since 2026-07-25 every buyer checkout
-- (POST /api/orders) fails at the supplier-order leg, leaving
-- purchase orders with zero supplier orders.
--
-- It also encoded the wrong actor: supplier orders are created by the
-- BUYER at checkout (or by admins / service role), never by suppliers,
-- so the supplier-membership arm both failed the real flow and
-- guarded nothing the app actually does.
--
-- New policy:
--   * admins: unrestricted
--   * buyers: may insert rows only for purchase orders they own
--     (checked via purchase_orders, whose policies do not reference
--     supplier_orders -> no recursion)
--   * suppliers: no direct INSERT (H15's rogue-supplier hole stays
--     closed; service-role writes bypass RLS as before)
-- ============================================================

DROP POLICY IF EXISTS supplier_orders_supplier_insert ON supplier_orders;
DROP POLICY IF EXISTS supplier_orders_admin_insert ON supplier_orders;
DROP POLICY IF EXISTS supplier_orders_insert ON supplier_orders;

CREATE POLICY supplier_orders_insert ON supplier_orders
  FOR INSERT WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
        AND (po.buyer_user_id = get_user_profile_id()
             OR po.buyer_company_id = ANY(get_user_companies()))
    )
  );
