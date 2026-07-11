-- ============================================================
-- 00098_quotation_landed_cost.sql — Logistics at quotation time
-- + product ↔ deal statistics.
--
-- 6a: supplier quote submission triggers a landed-cost estimate
--     (supplier price + freight + duties) stored on the quotation
--     so buyers compare TOTAL landed cost before awarding.
-- 6c: rfq_items.product_id closes the product join across all
--     three item tables → product_deal_stats view.
-- ============================================================

-- rfq_items previously dropped the cart's productId — keep it so
-- product weights/HS codes are joinable for landed cost + stats.
ALTER TABLE rfq_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_items_product ON rfq_items (product_id)
  WHERE product_id IS NOT NULL;

-- Landed-cost estimate snapshot on the quotation
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS landed_cost_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS landed_cost_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS landed_cost_status text NOT NULL DEFAULT 'none'
    CHECK (landed_cost_status IN ('none', 'estimated', 'pending_data', 'ops_quoted'));

-- Bridge ops freight quotes back to the quotation/RFQ that spawned them
ALTER TABLE ops_freight_quotes
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ops_freight_quotes_quotation
  ON ops_freight_quotes (quotation_id)
  WHERE quotation_id IS NOT NULL;

-- ------------------------------------------------------------
-- product_deal_stats — per-product demand rollup (RFQ → quote →
-- order), consumed by the admin product demand panel and the
-- AI recommender's co-demand signals.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW product_deal_stats AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  COUNT(DISTINCT ri.rfq_id) AS rfq_count,
  COUNT(DISTINCT qi.quotation_id) AS quoted_count,
  COUNT(DISTINCT soi.supplier_order_id) AS ordered_count,
  COALESCE(SUM(soi.quantity), 0) AS units_ordered,
  COALESCE(SUM(soi.subtotal), 0) AS revenue_minor,
  MAX(ri.created_at) AS last_rfq_at,
  MAX(soi.created_at) AS last_order_at
FROM products p
LEFT JOIN rfq_items ri ON ri.product_id = p.id
LEFT JOIN quotation_items qi ON qi.product_id = p.id
LEFT JOIN supplier_order_items soi ON soi.product_id = p.id
GROUP BY p.id, p.name;
