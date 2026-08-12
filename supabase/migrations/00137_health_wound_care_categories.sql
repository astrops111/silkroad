-- ============================================================
-- 00137_health_wound_care_categories.sql
--
-- AMS Bioteq (Taiwan) brings the platform's first medical-adjacent
-- products (SIPSIP foam wound dressings, sterile wound gel, skin
-- barrier / adhesive remover sprays). Nothing in the existing tree
-- fits them, so add a Health top-level with a Wound Care leaf —
-- same pattern as 00115_computer_peripherals_expansion.sql.
-- ============================================================

INSERT INTO categories (id, parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000007', NULL, 'Health & Medical', '健康护理', 'health', 0, 'health', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (parent_id, name, name_local, slug, level, path, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000007', 'Wound Care', '伤口护理', 'health-wound-care', 1, 'health/health-wound-care', 1)
ON CONFLICT (slug) DO NOTHING;
