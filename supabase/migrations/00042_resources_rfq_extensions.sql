-- ============================================================
-- 00042_resources_rfq_extensions.sql — Bulk-trade fields on RFQs
-- and quotations so the resources portal can use the existing
-- RFQ engine for commodity trades (NUMERIC tonnage, UoM, Incoterm,
-- ports, category linkage).
-- ============================================================

-- ── RFQs ─────────────────────────────────────────────────────────────────────
ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS resource_category_id UUID REFERENCES resource_categories(id),
  ADD COLUMN IF NOT EXISTS commodity_id         UUID REFERENCES commodities(id),
  ADD COLUMN IF NOT EXISTS quantity_numeric     NUMERIC(14,3),  -- e.g. 25000.000 MT
  ADD COLUMN IF NOT EXISTS unit_of_measure      TEXT,           -- MT | BDMT | m3 | troy_oz | kg | TEU
  ADD COLUMN IF NOT EXISTS port_of_loading      TEXT,           -- UN/LOCODE
  ADD COLUMN IF NOT EXISTS port_of_discharge    TEXT,
  ADD COLUMN IF NOT EXISTS shipment_window_start DATE,
  ADD COLUMN IF NOT EXISTS shipment_window_end   DATE,
  ADD COLUMN IF NOT EXISTS payment_instrument   TEXT CHECK (
    payment_instrument IS NULL OR payment_instrument IN ('lc_at_sight','lc_usance','tt_advance','tt_against_docs')
  );

CREATE INDEX IF NOT EXISTS idx_rfqs_resource_category ON rfqs(resource_category_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_commodity         ON rfqs(commodity_id);

-- ── Quotations ───────────────────────────────────────────────────────────────
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS quantity_numeric     NUMERIC(14,3),
  ADD COLUMN IF NOT EXISTS unit_of_measure      TEXT,
  ADD COLUMN IF NOT EXISTS unit_price_usd       NUMERIC(14,4),  -- price per UoM in USD
  ADD COLUMN IF NOT EXISTS port_of_loading      TEXT,
  ADD COLUMN IF NOT EXISTS port_of_discharge    TEXT,
  ADD COLUMN IF NOT EXISTS shipment_window_start DATE,
  ADD COLUMN IF NOT EXISTS shipment_window_end   DATE,
  ADD COLUMN IF NOT EXISTS payment_instrument   TEXT CHECK (
    payment_instrument IS NULL OR payment_instrument IN ('lc_at_sight','lc_usance','tt_advance','tt_against_docs')
  ),
  ADD COLUMN IF NOT EXISTS inspection_agency    TEXT;           -- 'SGS' | 'BV' | 'Intertek' | 'CCIC'
