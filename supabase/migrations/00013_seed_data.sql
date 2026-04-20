-- ============================================================
-- 00013_seed_data.sql — Seed data for BUY B2B Platform
-- ============================================================

-- ============================================================
-- 1. Countries
-- ============================================================

INSERT INTO countries (country_code, name, dialing_code, currency_code, default_locale, market_region, address_format, mobile_money_providers, e_invoice_system, e_invoice_mandatory) VALUES

-- West Africa
('GH', 'Ghana', '+233', 'GHS', 'en', 'africa_west', 'africa_landmark',
 ARRAY['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'], NULL, false),

('NG', 'Nigeria', '+234', 'NGN', 'en', 'africa_west', 'africa_landmark',
 ARRAY['OPay', 'PalmPay', 'MTN MoMo'], NULL, false),

('SN', 'Senegal', '+221', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Orange Money', 'Wave', 'Free Money'], NULL, false),

('CI', 'Ivory Coast', '+225', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Orange Money', 'MTN MoMo', 'Wave', 'Moov Money'], NULL, false),

('ML', 'Mali', '+223', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Orange Money', 'Moov Money'], NULL, false),

('BF', 'Burkina Faso', '+226', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Orange Money', 'Moov Money'], NULL, false),

('GN', 'Guinea', '+224', 'GNF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Orange Money', 'MTN MoMo'], NULL, false),

('BJ', 'Benin', '+229', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['MTN MoMo', 'Moov Money'], NULL, false),

('TG', 'Togo', '+228', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Flooz (Moov)', 'T-Money'], NULL, false),

('NE', 'Niger', '+227', 'XOF', 'fr', 'africa_west', 'africa_landmark',
 ARRAY['Airtel Money', 'Orange Money'], NULL, false),

-- East Africa
('KE', 'Kenya', '+254', 'KES', 'en', 'africa_east', 'africa_landmark',
 ARRAY['M-Pesa', 'Airtel Money', 'T-Kash'], 'ETIMS', true),

('UG', 'Uganda', '+256', 'UGX', 'en', 'africa_east', 'africa_landmark',
 ARRAY['MTN MoMo', 'Airtel Money'], 'EFRIS', true),

('TZ', 'Tanzania', '+255', 'TZS', 'en', 'africa_east', 'africa_landmark',
 ARRAY['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halotel'], NULL, false),

('RW', 'Rwanda', '+250', 'RWF', 'en', 'africa_east', 'africa_landmark',
 ARRAY['MTN MoMo', 'Airtel Money'], 'EBM', true),

('ET', 'Ethiopia', '+251', 'ETB', 'en', 'africa_east', 'africa_landmark',
 ARRAY['Telebirr', 'CBE Birr', 'M-Birr'], NULL, false),

('MG', 'Madagascar', '+261', 'MGA', 'fr', 'africa_east', 'africa_landmark',
 ARRAY['MVola', 'Orange Money', 'Airtel Money'], NULL, false),

-- Southern Africa
('ZA', 'South Africa', '+27', 'ZAR', 'en', 'africa_south', 'international',
 ARRAY[]::TEXT[], NULL, false),

('ZM', 'Zambia', '+260', 'ZMW', 'en', 'africa_south', 'africa_landmark',
 ARRAY['MTN MoMo', 'Airtel Money', 'Zoona'], NULL, false),

('ZW', 'Zimbabwe', '+263', 'USD', 'en', 'africa_south', 'africa_landmark',
 ARRAY['EcoCash', 'OneMoney', 'Telecash'], NULL, false),

('MW', 'Malawi', '+265', 'MWK', 'en', 'africa_south', 'africa_landmark',
 ARRAY['Airtel Money', 'TNM Mpamba'], NULL, false),

('BW', 'Botswana', '+267', 'BWP', 'en', 'africa_south', 'international',
 ARRAY['Orange Money', 'MyZaka'], NULL, false),

('NA', 'Namibia', '+264', 'NAD', 'en', 'africa_south', 'international',
 ARRAY['MTC MoMo'], NULL, false),

('MZ', 'Mozambique', '+258', 'MZN', 'pt', 'africa_south', 'africa_landmark',
 ARRAY['M-Pesa', 'e-Mola'], NULL, false),

('AO', 'Angola', '+244', 'AOA', 'pt', 'africa_south', 'africa_landmark',
 ARRAY['Unitel Money'], NULL, false),

-- Central Africa
('CM', 'Cameroon', '+237', 'XAF', 'fr', 'africa_central', 'africa_landmark',
 ARRAY['Orange Money', 'MTN MoMo', 'Express Union'], NULL, false),

('CD', 'DRC', '+243', 'CDF', 'fr', 'africa_central', 'africa_landmark',
 ARRAY['M-Pesa', 'Orange Money', 'Airtel Money'], NULL, false),

-- North Africa
('EG', 'Egypt', '+20', 'EGP', 'ar', 'africa_north', 'international',
 ARRAY['Vodafone Cash', 'Etisalat Cash', 'Orange Cash', 'WE Pay'], 'ETA', true),

('MA', 'Morocco', '+212', 'MAD', 'ar', 'africa_north', 'international',
 ARRAY['Inwi Money', 'Orange Money'], NULL, false),

-- China
('CN', 'China', '+86', 'CNY', 'zh-CN', 'cn', 'cn_province',
 ARRAY[]::TEXT[], NULL, false),

('TW', 'Taiwan', '+886', 'TWD', 'zh-TW', 'cn', 'cn_province',
 ARRAY[]::TEXT[], NULL, false),

-- Global
('US', 'United States', '+1', 'USD', 'en', 'global', 'international',
 ARRAY[]::TEXT[], NULL, false),

('GB', 'United Kingdom', '+44', 'GBP', 'en', 'global', 'international',
 ARRAY[]::TEXT[], NULL, false)

ON CONFLICT (country_code) DO NOTHING;


-- ============================================================
-- 2. Tax rates
-- ============================================================

INSERT INTO tax_rates (country_code, rate, tax_name, tax_type, category, description, effective_from, is_active) VALUES

-- West Africa
('GH', 0.1500, 'VAT', 'taxable', 'vat', 'Ghana Standard VAT 15%', '2023-01-01', true),
('GH', 0.0250, 'NHIL', 'taxable', 'levy', 'National Health Insurance Levy 2.5%', '2023-01-01', true),
('GH', 0.0250, 'GETFL', 'taxable', 'levy', 'GETFund Levy 2.5%', '2023-01-01', true),
('GH', 0.0100, 'COVID-19 HRL', 'taxable', 'levy', 'COVID-19 Health Recovery Levy 1%', '2023-01-01', true),
('GH', 0.0100, 'Emissions Levy', 'taxable', 'levy', 'Emissions Levy 1%', '2023-01-01', true),
('NG', 0.0750, 'VAT', 'taxable', 'vat', 'Nigeria Standard VAT 7.5%', '2020-02-01', true),
('SN', 0.1800, 'TVA', 'taxable', 'vat', 'Senegal Standard TVA 18%', '2020-01-01', true),
('CI', 0.1800, 'TVA', 'taxable', 'vat', 'Ivory Coast Standard TVA 18%', '2020-01-01', true),
('ML', 0.1800, 'TVA', 'taxable', 'vat', 'Mali Standard TVA 18%', '2020-01-01', true),
('BF', 0.1800, 'TVA', 'taxable', 'vat', 'Burkina Faso Standard TVA 18%', '2020-01-01', true),
('GN', 0.1800, 'TVA', 'taxable', 'vat', 'Guinea Standard TVA 18%', '2020-01-01', true),
('BJ', 0.1800, 'TVA', 'taxable', 'vat', 'Benin Standard TVA 18%', '2020-01-01', true),
('TG', 0.1800, 'TVA', 'taxable', 'vat', 'Togo Standard TVA 18%', '2020-01-01', true),
('NE', 0.1900, 'TVA', 'taxable', 'vat', 'Niger Standard TVA 19%', '2020-01-01', true),

-- East Africa
('KE', 0.1600, 'VAT', 'taxable', 'vat', 'Kenya Standard VAT 16%', '2020-01-01', true),
('UG', 0.1800, 'VAT', 'taxable', 'vat', 'Uganda Standard VAT 18%', '2020-01-01', true),
('TZ', 0.1800, 'VAT', 'taxable', 'vat', 'Tanzania Standard VAT 18%', '2020-01-01', true),
('RW', 0.1800, 'VAT', 'taxable', 'vat', 'Rwanda Standard VAT 18%', '2020-01-01', true),
('ET', 0.1500, 'VAT', 'taxable', 'vat', 'Ethiopia Standard VAT 15%', '2020-01-01', true),
('MG', 0.2000, 'TVA', 'taxable', 'vat', 'Madagascar Standard TVA 20%', '2020-01-01', true),

-- Southern Africa
('ZA', 0.1500, 'VAT', 'taxable', 'vat', 'South Africa Standard VAT 15%', '2018-04-01', true),
('ZM', 0.1600, 'VAT', 'taxable', 'vat', 'Zambia Standard VAT 16%', '2020-01-01', true),
('ZW', 0.1500, 'VAT', 'taxable', 'vat', 'Zimbabwe Standard VAT 15%', '2020-01-01', true),
('MW', 0.1650, 'VAT', 'taxable', 'vat', 'Malawi Standard VAT 16.5%', '2020-01-01', true),
('BW', 0.1400, 'VAT', 'taxable', 'vat', 'Botswana Standard VAT 14%', '2022-08-01', true),
('NA', 0.1500, 'VAT', 'taxable', 'vat', 'Namibia Standard VAT 15%', '2020-01-01', true),
('MZ', 0.1600, 'IVA', 'taxable', 'vat', 'Mozambique Standard IVA 16%', '2023-01-01', true),
('AO', 0.1400, 'IVA', 'taxable', 'vat', 'Angola Standard IVA 14%', '2019-10-01', true),

-- Central Africa
('CM', 0.1925, 'TVA', 'taxable', 'vat', 'Cameroon Standard TVA 19.25% (17.5% + 10% communal surtax)', '2020-01-01', true),
('CM', 0.0175, 'Communal Surtax', 'taxable', 'surtax', 'Cameroon Communal Additional Council Tax', '2020-01-01', true),
('CD', 0.1600, 'TVA', 'taxable', 'vat', 'DRC Standard TVA 16%', '2020-01-01', true),

-- North Africa
('EG', 0.1400, 'VAT', 'taxable', 'vat', 'Egypt Standard VAT 14%', '2017-07-01', true),
('MA', 0.2000, 'TVA', 'taxable', 'vat', 'Morocco Standard TVA 20%', '2020-01-01', true),

-- China
('CN', 0.1300, 'VAT', 'taxable', 'vat', 'China Standard VAT 13%', '2019-04-01', true),
('TW', 0.0500, 'VAT', 'taxable', 'vat', 'Taiwan Standard VAT 5%', '2020-01-01', true),

-- Global
('US', 0.0000, 'Sales Tax', 'mixed', 'vat', 'US has no federal VAT; state-level sales tax varies', '2020-01-01', true),
('GB', 0.2000, 'VAT', 'taxable', 'vat', 'UK Standard VAT 20%', '2011-01-04', true)

ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. Exchange rates (USD-based, approximate April 2026)
-- ============================================================

INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES

-- African currencies
('USD', 'GHS', 16.50000000, 'seed'),
('USD', 'NGN', 1580.00000000, 'seed'),
('USD', 'KES', 129.00000000, 'seed'),
('USD', 'UGX', 3750.00000000, 'seed'),
('USD', 'TZS', 2680.00000000, 'seed'),
('USD', 'RWF', 1380.00000000, 'seed'),
('USD', 'ETB', 130.00000000, 'seed'),
('USD', 'ZAR', 18.50000000, 'seed'),
('USD', 'XAF', 610.00000000, 'seed'),
('USD', 'XOF', 610.00000000, 'seed'),
('USD', 'CDF', 2850.00000000, 'seed'),
('USD', 'MZN', 63.80000000, 'seed'),
('USD', 'ZMW', 27.50000000, 'seed'),
('USD', 'MWK', 1750.00000000, 'seed'),
('USD', 'EGP', 50.50000000, 'seed'),
('USD', 'MAD', 9.80000000, 'seed'),
('USD', 'GNF', 8600.00000000, 'seed'),
('USD', 'AOA', 920.00000000, 'seed'),
('USD', 'BWP', 13.70000000, 'seed'),
('USD', 'NAD', 18.50000000, 'seed'),
('USD', 'MGA', 4600.00000000, 'seed'),

-- Asian currencies
('USD', 'CNY', 7.24000000, 'seed'),
('USD', 'TWD', 32.50000000, 'seed'),

-- Global currencies
('USD', 'GBP', 0.79000000, 'seed'),
('USD', 'USD', 1.00000000, 'seed')

ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();


-- ============================================================
-- 4. Platform company record
-- ============================================================

INSERT INTO companies (
  name, slug, type, country_code, market_region,
  default_currency, verification_status, is_active,
  description
) VALUES (
  'SilkRoad Africa Platform',
  'platform',
  'logistics',
  'GH',
  'africa_west',
  'USD',
  'verified',
  true,
  'Platform operator company for SilkRoad Africa B2B marketplace'
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 5. Default commission rules (5% per region)
-- ============================================================

INSERT INTO commission_rules (rate, min_fee, currency, market_region, is_active, priority) VALUES
  (0.0500, 0, 'USD', 'africa_west',    true, 0),
  (0.0500, 0, 'USD', 'africa_east',    true, 0),
  (0.0500, 0, 'USD', 'africa_south',   true, 0),
  (0.0500, 0, 'USD', 'africa_central', true, 0),
  (0.0500, 0, 'USD', 'africa_north',   true, 0),
  (0.0500, 0, 'USD', 'cn',             true, 0),
  (0.0500, 0, 'USD', 'global',         true, 0)
ON CONFLICT DO NOTHING;
