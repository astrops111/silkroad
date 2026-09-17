-- ============================================================
-- 00142_lock_down_partition_rls_and_deal_stats.sql
--
-- Two Supabase linter ERRORs turned out to be live, exploitable
-- issues, not false positives — confirmed directly against prod.
--
-- 1. rls_disabled_in_public — the quarterly partitions of
--    purchase_orders/supplier_orders/b2b_invoices/b2b_shipments
--    (00005/00007/00009) never had RLS enabled on the partition
--    tables themselves. The RLS + policies from 00012 only apply
--    when Postgres reaches a partition through its parent;
--    PostgREST exposes every table in the public schema
--    individually, so e.g. GET /rest/v1/purchase_orders_2026q3
--    bypassed every policy on the parent entirely. Confirmed live:
--    anon held full SELECT/INSERT/UPDATE/DELETE on all 12
--    partitions. Access through the parent (every real code path —
--    grep confirms nothing queries the _2026qN names directly)
--    already used the parent's policies and is unaffected by this
--    change. Enabling RLS on each partition with no policies of
--    its own makes direct access to the partition default-deny
--    for anon/authenticated — closing the bypass route — while
--    service_role/postgres (BYPASSRLS) are untouched either way.
--
-- 2. security_definer_view — product_deal_stats (00098) was never
--    given the explicit lockdown that products_with_origin (00090)
--    and products_pooling_info (00109) got. Confirmed live: anon
--    held SELECT, so an unauthenticated request to
--    /rest/v1/product_deal_stats leaked every product's revenue,
--    order counts and RFQ counts. Its only real callers (the admin
--    demand route and the supplier products page) already use the
--    service-role client, so revoking anon/authenticated changes
--    nothing for them. products_with_origin and
--    products_pooling_info are left as-is — they're intentionally
--    security definer and only ever expose derived,
--    non-identifying fields (see 00090/00109).
-- ============================================================

ALTER TABLE purchase_orders_2026q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders_2026q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders_2026q4 ENABLE ROW LEVEL SECURITY;

ALTER TABLE supplier_orders_2026q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders_2026q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders_2026q4 ENABLE ROW LEVEL SECURITY;

ALTER TABLE b2b_invoices_2026q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoices_2026q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoices_2026q4 ENABLE ROW LEVEL SECURITY;

ALTER TABLE b2b_shipments_2026q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_shipments_2026q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_shipments_2026q4 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON product_deal_stats FROM anon, authenticated;
