-- Add COGS (cost of goods sold, in cents) and brand fields to products.
-- COGS is supplier-internal pricing data and is not exposed on public buyer pages.
-- Brand is displayed publicly (does not reveal supplier identity).

alter table products
  add column if not exists cogs bigint,
  add column if not exists brand text;

comment on column products.cogs is 'Cost of goods sold in minor currency units (cents). Supplier-internal, never exposed on public buyer pages.';
comment on column products.brand is 'Product brand name (e.g. Acme). Shown publicly; distinct from supplier identity.';
