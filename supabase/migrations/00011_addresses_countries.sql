-- ============================================================
-- 00011_addresses_countries.sql — Addresses, countries, exchange rates
-- ============================================================

-- Addresses (user & company delivery/billing addresses)
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  company_id UUID REFERENCES companies(id),
  label TEXT,
  recipient_name TEXT NOT NULL,
  phone TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  postal_code TEXT,
  country_code CHAR(2) NOT NULL,
  zone_id UUID REFERENCES logistics_zones(id),
  gps_coordinates JSONB,
  landmark TEXT,
  address_format address_format DEFAULT 'international',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_company ON addresses(company_id);
CREATE INDEX idx_addresses_country ON addresses(country_code);


-- ============================================================
-- Countries (platform-supported countries & tax/locale config)
-- ============================================================
CREATE TABLE countries (
  country_code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  name_local TEXT,
  dialing_code TEXT,
  currency_code CHAR(3) NOT NULL,
  default_locale TEXT DEFAULT 'en',
  tax_id_format TEXT,
  tax_id_label TEXT,
  tax_id_regex TEXT,
  address_format address_format DEFAULT 'international',
  mobile_money_providers TEXT[] DEFAULT '{}',
  e_invoice_system TEXT,
  e_invoice_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  market_region market_region NOT NULL
);


-- ============================================================
-- Exchange rates (currency conversion)
-- ============================================================
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  source TEXT DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

CREATE INDEX idx_exchange_rates_from ON exchange_rates(from_currency);
CREATE INDEX idx_exchange_rates_to ON exchange_rates(to_currency);
CREATE INDEX idx_exchange_rates_updated ON exchange_rates(updated_at);
