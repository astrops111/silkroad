-- ============================================================
-- 00002_companies.sql — Multi-tenant company & user foundation
-- ============================================================

-- Extend auth.users with platform profile
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_locale TEXT DEFAULT 'en',
  preferred_currency CHAR(3) DEFAULT 'USD',
  country_code CHAR(2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_profiles_auth ON user_profiles(auth_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_country ON user_profiles(country_code);

-- Companies (both buyer orgs and suppliers)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_local TEXT,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buyer_org', 'supplier', 'logistics')),

  -- Tax identification
  tax_id TEXT,
  tax_id_type TEXT, -- gh_tin, ke_pin, ng_tin, za_vat, cn_uscc, tw_unified, generic
  tax_id_verified BOOLEAN DEFAULT false,

  -- Location
  country_code CHAR(2) NOT NULL,
  city TEXT,
  state_province TEXT,
  address TEXT,

  -- Business info
  default_currency CHAR(3) DEFAULT 'USD',
  market_region market_region NOT NULL,
  industry TEXT,
  employee_count_range TEXT,
  established_year INT,
  website TEXT,
  description TEXT,
  logo_url TEXT,

  -- Verification
  verification_status verification_status DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES user_profiles(id),

  -- Settings
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_country ON companies(country_code);
CREATE INDEX idx_companies_tax_id ON companies(tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX idx_companies_verification ON companies(verification_status);
CREATE INDEX idx_companies_market_region ON companies(market_region);

-- Company members (user <-> company association with roles)
CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role platform_role NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES user_profiles(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_role ON company_members(role);
