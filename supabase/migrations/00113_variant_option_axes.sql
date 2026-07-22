-- 00113: structured variant option axes for consolidated (multi-variant) products.
-- Lets a single product expose two independent variant dimensions (e.g. size + shade)
-- so the storefront can render one control per axis (dropdown when options > 10).
-- Additive + nullable: existing single-axis variants (name only) are unaffected.

alter table public.product_variants
  add column if not exists option_size  text,
  add column if not exists option_shade text;

comment on column public.product_variants.option_size  is 'Variant axis 1: size/format, e.g. "Full (4.5g)", "Mini (1.9g)". Null for legacy single-axis variants.';
comment on column public.product_variants.option_shade is 'Variant axis 2: shade/colour, e.g. "#101 Joyful". Null for legacy single-axis variants.';

-- merged_into_product_id already exists on public.products (FK -> products.id);
-- used by the storefront to 301-redirect consolidated child listings to their canonical parent.
