-- ============================================================
-- 00091_seed_tariff_rates.sql — starter duty/VAT rates
--
-- Covers the 9 destination-port countries seeded in 00052 across the
-- HS chapters that map to the platform's 6 top-level categories
-- (Home, Hotels, Consumer Electronics, Beauty, Groceries, Baby).
--
-- Rates are MFN approximations drawn from the regional schedules:
--   EAC CET (KE, TZ)        — bands 0/10/25/35
--   ECOWAS CET (NG, GH, CI) — bands 0/5/10/20/35
--   SACU (ZA), Morocco (MA), Egypt (EG), Djibouti (DJ) — national
--
-- They exist so the landed-cost engine returns a defensible estimate
-- instead of a missing-tariff warning. Every row is marked in `notes`
-- for ops to verify against the official schedule before any binding
-- DDP quote. Ops edits/overrides via /admin/logistics/reference.
-- ============================================================

-- ============================================================
-- EAC CET — Kenya, Tanzania
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, c.country, v.duty_pct, c.vat_pct, c.other_fees::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (EAC CET); verify before binding DDP quotes'
FROM (VALUES
  -- Home & Hotels
  ('9403', 35.0, 'Furniture'),
  ('6302', 35.0, 'Bed/table/kitchen linen'),
  ('3924', 25.0, 'Plastic household articles'),
  ('6911', 25.0, 'Porcelain tableware'),
  ('7013', 25.0, 'Glassware'),
  ('7323', 25.0, 'Steel kitchenware'),
  ('8418', 25.0, 'Refrigerators/freezers'),
  ('8450', 25.0, 'Washing machines'),
  ('8516', 25.0, 'Small electric appliances'),
  -- Consumer Electronics
  ('8471', 0.0,  'Computers/laptops'),
  ('8517', 10.0, 'Phones/network equipment'),
  ('8518', 25.0, 'Audio equipment'),
  ('8528', 25.0, 'Monitors/TVs'),
  ('8507', 25.0, 'Batteries/accumulators'),
  -- Beauty
  ('3303', 35.0, 'Perfumes'),
  ('3304', 35.0, 'Cosmetics/skincare'),
  ('3305', 35.0, 'Hair preparations'),
  ('3307', 35.0, 'Shaving/deodorants'),
  ('3401', 25.0, 'Soap'),
  -- Groceries
  ('0902', 25.0, 'Tea'),
  ('1704', 35.0, 'Sugar confectionery'),
  ('1806', 35.0, 'Chocolate'),
  ('1902', 35.0, 'Pasta/noodles'),
  ('2103', 35.0, 'Sauces/condiments'),
  ('2106', 25.0, 'Food preparations nes'),
  -- Baby Products
  ('1901', 10.0, 'Infant food preparations'),
  ('6111', 35.0, 'Baby garments'),
  ('8715', 25.0, 'Prams/strollers'),
  ('9503', 25.0, 'Toys'),
  ('9619', 25.0, 'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
CROSS JOIN (VALUES
  ('KE', 16.0, '{"idf_pct": 2.5, "rdl_pct": 1.5}'),
  ('TZ', 18.0, '{}')
) AS c(country, vat_pct, other_fees)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;

-- ============================================================
-- ECOWAS CET — Nigeria, Ghana, Côte d'Ivoire
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, c.country, v.duty_pct, c.vat_pct, c.other_fees::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (ECOWAS CET); verify before binding DDP quotes'
FROM (VALUES
  ('9403', 20.0, 'Furniture'),
  ('6302', 35.0, 'Bed/table/kitchen linen'),
  ('3924', 20.0, 'Plastic household articles'),
  ('6911', 20.0, 'Porcelain tableware'),
  ('7013', 20.0, 'Glassware'),
  ('7323', 20.0, 'Steel kitchenware'),
  ('8418', 20.0, 'Refrigerators/freezers'),
  ('8450', 20.0, 'Washing machines'),
  ('8516', 20.0, 'Small electric appliances'),
  ('8471', 5.0,  'Computers/laptops'),
  ('8517', 10.0, 'Phones/network equipment'),
  ('8518', 20.0, 'Audio equipment'),
  ('8528', 20.0, 'Monitors/TVs'),
  ('8507', 20.0, 'Batteries/accumulators'),
  ('3303', 20.0, 'Perfumes'),
  ('3304', 20.0, 'Cosmetics/skincare'),
  ('3305', 20.0, 'Hair preparations'),
  ('3307', 20.0, 'Shaving/deodorants'),
  ('3401', 20.0, 'Soap'),
  ('0902', 20.0, 'Tea'),
  ('1704', 20.0, 'Sugar confectionery'),
  ('1806', 20.0, 'Chocolate'),
  ('1902', 20.0, 'Pasta/noodles'),
  ('2103', 20.0, 'Sauces/condiments'),
  ('2106', 10.0, 'Food preparations nes'),
  ('1901', 5.0,  'Infant food preparations'),
  ('6111', 35.0, 'Baby garments'),
  ('8715', 10.0, 'Prams/strollers'),
  ('9503', 20.0, 'Toys'),
  ('9619', 20.0, 'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
CROSS JOIN (VALUES
  ('NG', 7.5,  '{"etls_pct": 0.5, "ciss_pct": 1.0}'),
  ('GH', 15.0, '{"nhil_pct": 2.5, "getfund_pct": 2.5, "covid_levy_pct": 1.0}'),
  ('CI', 18.0, '{"statistical_pct": 1.0}')
) AS c(country, vat_pct, other_fees)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;

-- ============================================================
-- South Africa (SACU schedule, VAT 15%)
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, 'ZA', v.duty_pct, 15.0, '{}'::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (SACU); verify before binding DDP quotes'
FROM (VALUES
  ('9403', 20.0, 'Furniture'),
  ('6302', 30.0, 'Bed/table/kitchen linen'),
  ('3924', 20.0, 'Plastic household articles'),
  ('6911', 20.0, 'Porcelain tableware'),
  ('7013', 15.0, 'Glassware'),
  ('7323', 15.0, 'Steel kitchenware'),
  ('8418', 25.0, 'Refrigerators/freezers'),
  ('8450', 20.0, 'Washing machines'),
  ('8516', 15.0, 'Small electric appliances'),
  ('8471', 0.0,  'Computers/laptops'),
  ('8517', 0.0,  'Phones/network equipment'),
  ('8518', 15.0, 'Audio equipment'),
  ('8528', 25.0, 'Monitors/TVs'),
  ('8507', 10.0, 'Batteries/accumulators'),
  ('3303', 20.0, 'Perfumes'),
  ('3304', 20.0, 'Cosmetics/skincare'),
  ('3305', 20.0, 'Hair preparations'),
  ('3307', 20.0, 'Shaving/deodorants'),
  ('3401', 20.0, 'Soap'),
  ('0902', 0.0,  'Tea'),
  ('1704', 25.0, 'Sugar confectionery'),
  ('1806', 25.0, 'Chocolate'),
  ('1902', 30.0, 'Pasta/noodles'),
  ('2103', 20.0, 'Sauces/condiments'),
  ('2106', 20.0, 'Food preparations nes'),
  ('1901', 0.0,  'Infant food preparations'),
  ('6111', 45.0, 'Baby garments'),
  ('8715', 15.0, 'Prams/strollers'),
  ('9503', 0.0,  'Toys'),
  ('9619', 15.0, 'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;

-- ============================================================
-- Morocco (VAT 20%, parafiscal import tax 0.25%)
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, 'MA', v.duty_pct, 20.0, '{"parafiscal_pct": 0.25}'::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (Morocco); verify before binding DDP quotes'
FROM (VALUES
  ('9403', 25.0, 'Furniture'),
  ('6302', 40.0, 'Bed/table/kitchen linen'),
  ('3924', 25.0, 'Plastic household articles'),
  ('6911', 25.0, 'Porcelain tableware'),
  ('7013', 25.0, 'Glassware'),
  ('7323', 25.0, 'Steel kitchenware'),
  ('8418', 25.0, 'Refrigerators/freezers'),
  ('8450', 25.0, 'Washing machines'),
  ('8516', 25.0, 'Small electric appliances'),
  ('8471', 2.5,  'Computers/laptops'),
  ('8517', 2.5,  'Phones/network equipment'),
  ('8518', 17.5, 'Audio equipment'),
  ('8528', 25.0, 'Monitors/TVs'),
  ('8507', 17.5, 'Batteries/accumulators'),
  ('3303', 40.0, 'Perfumes'),
  ('3304', 40.0, 'Cosmetics/skincare'),
  ('3305', 40.0, 'Hair preparations'),
  ('3307', 40.0, 'Shaving/deodorants'),
  ('3401', 40.0, 'Soap'),
  ('0902', 25.0, 'Tea'),
  ('1704', 40.0, 'Sugar confectionery'),
  ('1806', 40.0, 'Chocolate'),
  ('1902', 40.0, 'Pasta/noodles'),
  ('2103', 40.0, 'Sauces/condiments'),
  ('2106', 25.0, 'Food preparations nes'),
  ('1901', 2.5,  'Infant food preparations'),
  ('6111', 40.0, 'Baby garments'),
  ('8715', 17.5, 'Prams/strollers'),
  ('9503', 25.0, 'Toys'),
  ('9619', 25.0, 'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;

-- ============================================================
-- Egypt (VAT 14%)
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, 'EG', v.duty_pct, 14.0, '{}'::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (Egypt); verify before binding DDP quotes'
FROM (VALUES
  ('9403', 40.0, 'Furniture'),
  ('6302', 40.0, 'Bed/table/kitchen linen'),
  ('3924', 30.0, 'Plastic household articles'),
  ('6911', 30.0, 'Porcelain tableware'),
  ('7013', 30.0, 'Glassware'),
  ('7323', 30.0, 'Steel kitchenware'),
  ('8418', 30.0, 'Refrigerators/freezers'),
  ('8450', 30.0, 'Washing machines'),
  ('8516', 30.0, 'Small electric appliances'),
  ('8471', 0.0,  'Computers/laptops'),
  ('8517', 10.0, 'Phones/network equipment'),
  ('8518', 30.0, 'Audio equipment'),
  ('8528', 40.0, 'Monitors/TVs'),
  ('8507', 20.0, 'Batteries/accumulators'),
  ('3303', 40.0, 'Perfumes'),
  ('3304', 40.0, 'Cosmetics/skincare'),
  ('3305', 40.0, 'Hair preparations'),
  ('3307', 40.0, 'Shaving/deodorants'),
  ('3401', 30.0, 'Soap'),
  ('0902', 2.0,  'Tea'),
  ('1704', 30.0, 'Sugar confectionery'),
  ('1806', 30.0, 'Chocolate'),
  ('1902', 20.0, 'Pasta/noodles'),
  ('2103', 30.0, 'Sauces/condiments'),
  ('2106', 20.0, 'Food preparations nes'),
  ('1901', 2.0,  'Infant food preparations'),
  ('6111', 40.0, 'Baby garments'),
  ('8715', 20.0, 'Prams/strollers'),
  ('9503', 30.0, 'Toys'),
  ('9619', 5.0,  'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;

-- ============================================================
-- Djibouti (TIC consumption-tax bands ~8/20/33, VAT 10%)
-- ============================================================
INSERT INTO tariff_rates
  (hs_prefix, destination_country, duty_pct, vat_pct, other_fees, source, effective_from, notes)
SELECT
  v.hs_prefix, 'DJ', v.duty_pct, 10.0, '{}'::jsonb,
  'tariff_db', DATE '2026-07-01',
  v.label || ' — seeded approximation (Djibouti TIC); verify before binding DDP quotes'
FROM (VALUES
  ('9403', 20.0, 'Furniture'),
  ('6302', 20.0, 'Bed/table/kitchen linen'),
  ('3924', 20.0, 'Plastic household articles'),
  ('6911', 20.0, 'Porcelain tableware'),
  ('7013', 20.0, 'Glassware'),
  ('7323', 20.0, 'Steel kitchenware'),
  ('8418', 20.0, 'Refrigerators/freezers'),
  ('8450', 20.0, 'Washing machines'),
  ('8516', 20.0, 'Small electric appliances'),
  ('8471', 8.0,  'Computers/laptops'),
  ('8517', 8.0,  'Phones/network equipment'),
  ('8518', 20.0, 'Audio equipment'),
  ('8528', 20.0, 'Monitors/TVs'),
  ('8507', 20.0, 'Batteries/accumulators'),
  ('3303', 33.0, 'Perfumes'),
  ('3304', 33.0, 'Cosmetics/skincare'),
  ('3305', 33.0, 'Hair preparations'),
  ('3307', 33.0, 'Shaving/deodorants'),
  ('3401', 20.0, 'Soap'),
  ('0902', 8.0,  'Tea'),
  ('1704', 20.0, 'Sugar confectionery'),
  ('1806', 20.0, 'Chocolate'),
  ('1902', 20.0, 'Pasta/noodles'),
  ('2103', 20.0, 'Sauces/condiments'),
  ('2106', 20.0, 'Food preparations nes'),
  ('1901', 8.0,  'Infant food preparations'),
  ('6111', 20.0, 'Baby garments'),
  ('8715', 20.0, 'Prams/strollers'),
  ('9503', 20.0, 'Toys'),
  ('9619', 20.0, 'Diapers/sanitary')
) AS v(hs_prefix, duty_pct, label)
ON CONFLICT (hs_prefix, destination_country, effective_from) DO NOTHING;
