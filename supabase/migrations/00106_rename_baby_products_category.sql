-- ============================================================
-- 00106_rename_baby_products_category.sql
--
-- "Baby Products" -> "Baby & Kids", matching the categorization work
-- in 00105 which found the category actually spans skincare, bath,
-- hair, sun, oral care, and kids beauty/accessories, not just
-- diapers/formula. name_local aligns with the "母婴用品" term already
-- used elsewhere in the UI (messages/zh.json) for this category.
-- Slug ("baby-products") is unchanged — only the display name.
-- ============================================================

UPDATE categories
SET name = 'Baby & Kids', name_local = '母婴用品'
WHERE id = 'a0000000-0000-0000-0000-000000000006';
