-- ============================================================
-- 00040_resources_portal.sql — Africa → China natural resources
-- portal. Extends existing `commodities` with fields for metals,
-- minerals, timber, food, raw materials; adds a HS-code-rooted
-- resource taxonomy; adds per-category compliance gates.
-- ============================================================

-- ── Resource category taxonomy (separate from consumer `categories`) ─────────
-- Distinct from the consumer marketplace tree because HS codes, units of
-- measure, and compliance regimes are category-specific for bulk trade.
CREATE TABLE IF NOT EXISTS resource_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID REFERENCES resource_categories(id) ON DELETE RESTRICT,
  slug           TEXT UNIQUE NOT NULL,
  name_en        TEXT NOT NULL,
  name_zh        TEXT,
  name_fr        TEXT,

  -- Classification
  hs_prefix      TEXT,                 -- HS chapter/heading, e.g. '2601' iron ore
  unit_of_measure TEXT NOT NULL,       -- 'MT' | 'BDMT' | 'troy_oz' | 'kg' | 'TEU' | 'm3'
  group_code     TEXT NOT NULL,        -- 'food' | 'metals' | 'minerals' | 'raw_materials' | 'timber' | 'energy'

  -- Compliance gates (listing must satisfy flagged regimes)
  requires_kimberley    BOOLEAN DEFAULT FALSE,  -- rough diamonds
  requires_oecd_3tg     BOOLEAN DEFAULT FALSE,  -- tin, tantalum, tungsten, gold
  requires_cites        BOOLEAN DEFAULT FALSE,  -- regulated timber / wildlife
  requires_gacc         BOOLEAN DEFAULT FALSE,  -- China food import registration
  requires_phytosanitary BOOLEAN DEFAULT FALSE, -- agri plant material
  requires_assay        BOOLEAN DEFAULT FALSE,  -- metals / concentrates

  -- Spec schema (JSON Schema describing grade/assay fields for this category)
  spec_schema    JSONB,

  sort_order     INT DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_categories_parent ON resource_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_categories_group  ON resource_categories(group_code, is_active);

DROP TRIGGER IF EXISTS trg_resource_categories_updated_at ON resource_categories;
CREATE TRIGGER trg_resource_categories_updated_at
  BEFORE UPDATE ON resource_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed the taxonomy ────────────────────────────────────────────────────────
-- Top-level groups. HS prefixes indicative only.
INSERT INTO resource_categories (slug, name_en, name_zh, name_fr, hs_prefix, unit_of_measure, group_code, sort_order)
VALUES
  ('metals',        'Metals & Concentrates', '金属与精矿', 'Métaux & Concentrés', '26',   'MT',      'metals',        1),
  ('minerals',      'Industrial Minerals',   '工业矿物',   'Minéraux Industriels', '25', 'MT',      'minerals',      2),
  ('energy',        'Energy Materials',      '能源材料',   'Matières Énergétiques', '27', 'MT',     'energy',        3),
  ('timber',        'Timber & Wood',         '木材与木制品', 'Bois & Dérivés',      '44',  'm3',      'timber',        4),
  ('food',          'Food & Agri Products',  '食品与农产品', 'Alimentation & Agriculture', '', 'MT', 'food',          5),
  ('raw_materials', 'Other Raw Materials',   '其他原材料',   'Autres Matières Premières', '', 'MT',  'raw_materials', 6)
ON CONFLICT (slug) DO NOTHING;

-- Metals subcategories (with compliance gates)
WITH p AS (SELECT id FROM resource_categories WHERE slug = 'metals')
INSERT INTO resource_categories
  (parent_id, slug, name_en, name_zh, name_fr, hs_prefix, unit_of_measure, group_code,
   requires_oecd_3tg, requires_assay, sort_order)
SELECT p.id, v.slug, v.name_en, v.name_zh, v.name_fr, v.hs, v.uom, 'metals',
       v.oecd, TRUE, v.ord
FROM p, (VALUES
  ('copper-concentrate', 'Copper Concentrate', '铜精矿', 'Concentré de Cuivre', '2603', 'MT',      FALSE, 1),
  ('iron-ore',           'Iron Ore',           '铁矿石', 'Minerai de Fer',      '2601', 'MT',      FALSE, 2),
  ('bauxite',            'Bauxite',            '铝土矿', 'Bauxite',             '2606', 'MT',      FALSE, 3),
  ('manganese-ore',      'Manganese Ore',      '锰矿石', 'Minerai de Manganèse', '2602', 'MT',     FALSE, 4),
  ('chrome-ore',         'Chrome Ore',         '铬矿',   'Minerai de Chrome',    '2610', 'MT',     FALSE, 5),
  ('cobalt-hydroxide',   'Cobalt Hydroxide',   '氢氧化钴', 'Hydroxyde de Cobalt', '2605', 'MT',    FALSE, 6),
  ('lithium-concentrate','Lithium Concentrate','锂精矿', 'Concentré de Lithium', '2530', 'MT',     FALSE, 7),
  ('gold-dore',          'Gold Doré',          '金锭',   'Or Doré',              '7108', 'troy_oz', TRUE, 8),
  ('tin-concentrate',    'Tin Concentrate',    '锡精矿', 'Concentré d''Étain',   '2609', 'MT',      TRUE, 9),
  ('tantalum-ore',       'Tantalum Ore',       '钽矿石', 'Minerai de Tantale',   '2615', 'MT',      TRUE, 10),
  ('tungsten-ore',       'Tungsten Ore',       '钨矿石', 'Minerai de Tungstène', '2611', 'MT',      TRUE, 11)
) AS v(slug, name_en, name_zh, name_fr, hs, uom, oecd, ord)
ON CONFLICT (slug) DO NOTHING;

-- Diamond leaf with Kimberley gate
WITH p AS (SELECT id FROM resource_categories WHERE slug = 'minerals')
INSERT INTO resource_categories
  (parent_id, slug, name_en, name_zh, name_fr, hs_prefix, unit_of_measure, group_code, requires_kimberley, sort_order)
SELECT p.id, 'rough-diamonds', 'Rough Diamonds', '毛坯钻石', 'Diamants Bruts', '7102', 'kg', 'minerals', TRUE, 1
FROM p
ON CONFLICT (slug) DO NOTHING;

-- Timber with CITES gate
WITH p AS (SELECT id FROM resource_categories WHERE slug = 'timber')
INSERT INTO resource_categories
  (parent_id, slug, name_en, name_zh, name_fr, hs_prefix, unit_of_measure, group_code, requires_cites, sort_order)
SELECT p.id, v.slug, v.name_en, v.name_zh, v.name_fr, v.hs, 'm3', 'timber', v.cites, v.ord
FROM p, (VALUES
  ('logs-hardwood',  'Hardwood Logs',  '硬木原木', 'Grumes de Bois Dur',  '4403', TRUE,  1),
  ('logs-softwood',  'Softwood Logs',  '软木原木', 'Grumes de Bois Tendre','4403', FALSE, 2),
  ('sawn-timber',    'Sawn Timber',    '锯材',     'Bois Scié',            '4407', FALSE, 3)
) AS v(slug, name_en, name_zh, name_fr, hs, cites, ord)
ON CONFLICT (slug) DO NOTHING;

-- Food with GACC + phytosanitary gates
WITH p AS (SELECT id FROM resource_categories WHERE slug = 'food')
INSERT INTO resource_categories
  (parent_id, slug, name_en, name_zh, name_fr, hs_prefix, unit_of_measure, group_code,
   requires_gacc, requires_phytosanitary, sort_order)
SELECT p.id, v.slug, v.name_en, v.name_zh, v.name_fr, v.hs, 'MT', 'food', TRUE, TRUE, v.ord
FROM p, (VALUES
  ('cocoa-beans',   'Cocoa Beans',   '可可豆',   'Fèves de Cacao',    '1801', 1),
  ('coffee-green',  'Green Coffee',  '生咖啡豆', 'Café Vert',         '0901', 2),
  ('cashew-raw',    'Raw Cashew Nuts','生腰果',  'Noix de Cajou Brutes','0801', 3),
  ('sesame-seed',   'Sesame Seed',   '芝麻',     'Sésame',            '1207', 4),
  ('soybean',       'Soybean',       '大豆',     'Soja',              '1201', 5)
) AS v(slug, name_en, name_zh, name_fr, hs, ord)
ON CONFLICT (slug) DO NOTHING;

-- ── Extend commodities for full resource-portal scope ────────────────────────
ALTER TABLE commodities
  ADD COLUMN IF NOT EXISTS resource_category_id UUID REFERENCES resource_categories(id),
  ADD COLUMN IF NOT EXISTS unit_of_measure      TEXT,                -- 'MT' | 'troy_oz' | 'm3' | 'kg' | 'TEU'
  ADD COLUMN IF NOT EXISTS incoterm             trade_term,          -- FOB / CIF / CFR / DAP
  ADD COLUMN IF NOT EXISTS port_of_loading      TEXT,                -- UN/LOCODE e.g. 'ZADUR'
  ADD COLUMN IF NOT EXISTS port_of_discharge    TEXT,                -- e.g. 'CNSHA'
  -- Quantities expressed in the unit_of_measure (not kg) for bulk trade
  ADD COLUMN IF NOT EXISTS available_quantity   NUMERIC(14,3),
  ADD COLUMN IF NOT EXISTS min_order_quantity   NUMERIC(14,3),
  ADD COLUMN IF NOT EXISTS price_per_unit_usd   NUMERIC(14,4),
  -- Assay / quality schema (payload validated against resource_categories.spec_schema)
  ADD COLUMN IF NOT EXISTS assay                JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assay_report_url     TEXT,
  ADD COLUMN IF NOT EXISTS inspection_agency    TEXT,                -- 'SGS' | 'BV' | 'Intertek' | 'CCIC'
  -- Compliance attestations
  ADD COLUMN IF NOT EXISTS kimberley_cert_ref   TEXT,
  ADD COLUMN IF NOT EXISTS oecd_3tg_due_diligence_ref TEXT,
  ADD COLUMN IF NOT EXISTS cites_permit_ref     TEXT,
  ADD COLUMN IF NOT EXISTS gacc_registration_ref TEXT,
  ADD COLUMN IF NOT EXISTS mine_license_ref     TEXT,
  ADD COLUMN IF NOT EXISTS export_permit_ref    TEXT;

CREATE INDEX IF NOT EXISTS idx_commodities_resource_category
  ON commodities (resource_category_id, status);
CREATE INDEX IF NOT EXISTS idx_commodities_ports
  ON commodities (port_of_loading, port_of_discharge);

-- ── Compliance-gate guard ────────────────────────────────────────────────────
-- Approval path: a listing in a category with a gate flag must carry the
-- corresponding reference before it can be marked 'approved'.
CREATE OR REPLACE FUNCTION enforce_resource_compliance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cat resource_categories%ROWTYPE;
BEGIN
  IF NEW.status <> 'approved' OR NEW.resource_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO cat FROM resource_categories WHERE id = NEW.resource_category_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF cat.requires_kimberley AND (NEW.kimberley_cert_ref IS NULL OR NEW.kimberley_cert_ref = '') THEN
    RAISE EXCEPTION 'Kimberley Process certificate reference required for %', cat.slug;
  END IF;
  IF cat.requires_oecd_3tg AND (NEW.oecd_3tg_due_diligence_ref IS NULL OR NEW.oecd_3tg_due_diligence_ref = '') THEN
    RAISE EXCEPTION 'OECD 3TG due-diligence reference required for %', cat.slug;
  END IF;
  IF cat.requires_cites AND (NEW.cites_permit_ref IS NULL OR NEW.cites_permit_ref = '') THEN
    RAISE EXCEPTION 'CITES permit reference required for %', cat.slug;
  END IF;
  IF cat.requires_gacc AND (NEW.gacc_registration_ref IS NULL OR NEW.gacc_registration_ref = '') THEN
    RAISE EXCEPTION 'GACC registration reference required for %', cat.slug;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commodities_compliance ON commodities;
CREATE TRIGGER trg_commodities_compliance
  BEFORE INSERT OR UPDATE OF status, resource_category_id,
                              kimberley_cert_ref, oecd_3tg_due_diligence_ref,
                              cites_permit_ref, gacc_registration_ref
  ON commodities
  FOR EACH ROW EXECUTE FUNCTION enforce_resource_compliance();

-- ── Public read RLS on taxonomy ──────────────────────────────────────────────
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_categories_public_read" ON resource_categories;
CREATE POLICY "resource_categories_public_read" ON resource_categories
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "resource_categories_admin_write" ON resource_categories;
CREATE POLICY "resource_categories_admin_write" ON resource_categories
  FOR ALL USING (is_admin());
