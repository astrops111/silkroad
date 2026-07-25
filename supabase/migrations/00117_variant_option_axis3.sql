-- 00117: optional 3rd variant option axis, as a backup slot alongside
-- option_size/option_shade (00113) for products whose real distinguishing
-- attributes don't fit "size" or "shade" — e.g. Logitech keyboards varying by
-- color x switch-type, currently flattened into a single free-text
-- product_variants.name ("Graphite, Brown Switch") because no 3rd axis exists.
-- Additive + nullable: existing 1- and 2-axis variants are unaffected.

alter table public.product_variants
  add column if not exists option_variant3 text;

comment on column public.product_variants.option_variant3 is 'Variant axis 3 (optional): free-label axis for attributes that are not size or shade, e.g. "Brown Switch", "Material: Leather". Null unless a product genuinely needs a 3rd axis.';
