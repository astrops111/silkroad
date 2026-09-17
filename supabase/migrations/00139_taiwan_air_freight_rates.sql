-- ============================================================
-- 00139_taiwan_air_freight_rates.sql
-- Origin-aware shipping rates + the Taiwan air-freight rate card.
--
-- WHY: shipping_rates (00009) is keyed only by shipping_method, so every
-- origin shared one rate. Taiwan air freight is priced differently from
-- China sea freight, so the rate lookup needs an origin dimension.
-- Rows with origin_country IS NULL stay the global default; a row with
-- origin_country = 'TW' wins for Taiwan-origin suppliers.
--
-- Three ancillary charges also had nowhere to live:
--   min_chargeable_kg     — carrier minimum billable weight (air freight)
--   rebox_fee_per_carton  — consolidation repack, charged per carton
--   carton_volume_cbm     — carton size the repack count is derived from
--   documentation_fee     — flat customs-declaration charge per shipment
--
-- SOURCE (buyer-facing USD sell rates set by ops; the underlying supplier
-- cost is the JEFAE202608003 quotation, TPE→Kigali general warehouse,
-- 2026-08-06, quoted in TWD):
--   air freight   MIN 100 KG on every carrier tier
--   repack carton 60x50x40 cm  → 0.12 CBM per carton
--   documentation 報單費, charged per shipment (每票)
--   chargeable wt max(actual, L*W*H/6000), rounded UP to whole kg
-- ============================================================

ALTER TABLE shipping_rates
  ADD COLUMN IF NOT EXISTS origin_country          CHAR(2),
  ADD COLUMN IF NOT EXISTS min_chargeable_kg       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_up_chargeable_kg  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebox_fee_per_carton    BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carton_volume_cbm       NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS documentation_fee       BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes                   TEXT;

-- rebox_fee_per_carton is meaningless without a carton size to divide by
ALTER TABLE shipping_rates
  DROP CONSTRAINT IF EXISTS shipping_rates_rebox_needs_carton;
ALTER TABLE shipping_rates
  ADD CONSTRAINT shipping_rates_rebox_needs_carton
  CHECK (
    COALESCE(rebox_fee_per_carton, 0) = 0
    OR (carton_volume_cbm IS NOT NULL AND carton_volume_cbm > 0)
  );

-- Engine lookup path: (origin, method) most-specific first, then the
-- origin_country IS NULL global default.
CREATE INDEX IF NOT EXISTS idx_shipping_rates_origin_method
  ON shipping_rates(origin_country, shipping_method)
  WHERE is_active = true;

-- One active rate per (origin, method). Partial unique indexes are used
-- rather than a table constraint because origin_country is nullable and
-- two NULL origins would not collide under a plain UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_rates_origin_method
  ON shipping_rates(origin_country, shipping_method)
  WHERE is_active = true AND origin_country IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_rates_global_method
  ON shipping_rates(shipping_method)
  WHERE is_active = true AND origin_country IS NULL;

-- ============================================================
-- Taiwan air freight rate card (USD, minor units / cents)
--   USD 15.00 per chargeable kg, minimum 100 chargeable kg
--   USD  3.00 per 60x50x40 cm repack carton
--   USD 100.00 documentation fee per shipment
-- free_shipping_threshold is deliberately NULL: freight on this lane is
-- never waived, and a non-null value would zero the whole charge.
-- ============================================================
INSERT INTO shipping_rates (
  origin_country,
  shipping_method,
  base_rate,
  per_kg_rate,
  per_cbm_rate,
  min_charge,
  min_chargeable_kg,
  round_up_chargeable_kg,
  rebox_fee_per_carton,
  carton_volume_cbm,
  documentation_fee,
  free_shipping_threshold,
  currency,
  estimated_days_min,
  estimated_days_max,
  is_active,
  notes
)
SELECT
  'TW',
  'platform_express'::shipping_method,
  0,          -- no flat base; the documentation fee is the fixed component
  1500,       -- USD 15.00 / chargeable kg
  0,
  0,          -- floor comes from min_chargeable_kg, not a flat min_charge,
              -- so the rebox + documentation fees still add on top of it
  100.00,     -- carrier MIN 100 KG
  true,       -- chargeable weight rounds up to a whole kg
  300,        -- USD 3.00 per repack carton
  0.1200,     -- 60 x 50 x 40 cm = 0.12 CBM
  10000,      -- USD 100.00 per shipment
  NULL,
  'USD',
  4,
  7,
  true,
  'Taiwan air freight. USD15/kg, min 100 chargeable kg, USD3 per 60x50x40cm '
  || 'rebox carton, USD100 documentation fee per shipment. Chargeable weight '
  || 'is max(actual, volumetric at 6000 cm3/kg) rounded up to whole kg.'
WHERE NOT EXISTS (
  SELECT 1 FROM shipping_rates
  WHERE origin_country = 'TW'
    AND shipping_method = 'platform_express'
    AND is_active = true
);
