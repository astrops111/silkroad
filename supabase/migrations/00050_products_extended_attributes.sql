-- Extended product attributes sourced from the supplier onboarding sheet.
-- All fields are optional; UI hides them when null/empty.

alter table products
  add column if not exists jan_code text,
  add column if not exists shelf_life_days integer,
  add column if not exists box_pack_qty integer,
  add column if not exists shipping_mode text,          -- 'air' | 'sea' | 'either' | null
  add column if not exists legal_category text,
  add column if not exists skin_hair_type text,
  add column if not exists target_audience text,
  add column if not exists scent text,
  add column if not exists texture text,
  add column if not exists usage_instructions text,
  add column if not exists storage_instructions text,
  add column if not exists warnings text;

comment on column products.jan_code is 'JAN / EAN / UPC barcode.';
comment on column products.shelf_life_days is 'Shelf life in days (consumables).';
comment on column products.box_pack_qty is 'Units per outer carton/box.';
comment on column products.shipping_mode is 'Preferred freight mode: air, sea, or either.';
comment on column products.legal_category is 'Regulatory / legal product classification (e.g. cosmetic, food, OTC).';
comment on column products.skin_hair_type is 'Skin or hair type this product targets (beauty).';
comment on column products.target_audience is 'Target end-user demographic.';
comment on column products.scent is 'Scent / fragrance descriptor (beauty, home).';
comment on column products.texture is 'Product texture or form factor.';
comment on column products.usage_instructions is 'How to use the product.';
comment on column products.storage_instructions is 'Storage and handling instructions.';
comment on column products.warnings is 'Safety warnings / cautions.';
