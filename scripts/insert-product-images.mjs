// Inserts product image rows found by the Drive-catalog photo-sourcing workflow.
// Each product gets exactly one primary image row (sort_order 0, is_primary true).
// Skips any product_id that already has an image (idempotent / safe to re-run).
//
// Usage: node --env-file=.env scripts/insert-product-images.mjs '<json array of {product_id, url, alt_text}>'

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const payload = process.argv[2];
if (!payload) {
  console.error('Usage: node insert-product-images.mjs \'[{"product_id":"...","url":"https://...","alt_text":"..."}]\'');
  process.exit(1);
}

let items;
try {
  items = JSON.parse(payload);
} catch (e) {
  console.error(`Invalid JSON argument: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(items) || items.length === 0) {
  console.error("No items to insert.");
  process.exit(1);
}

const productIds = items.map((i) => i.product_id);
const { data: existing } = await admin
  .from("product_images")
  .select("product_id")
  .in("product_id", productIds);
const alreadyHasImage = new Set((existing || []).map((r) => r.product_id));

const rows = items
  .filter((i) => i.product_id && i.url && !alreadyHasImage.has(i.product_id))
  .map((i) => ({
    product_id: i.product_id,
    url: i.url,
    alt_text: i.alt_text || null,
    sort_order: 0,
    is_primary: true,
  }));

if (rows.length === 0) {
  console.log("Nothing to insert (all already have images or payload was empty after filtering).");
  process.exit(0);
}

const { error } = await admin.from("product_images").insert(rows);
if (error) {
  console.error(`Insert failed: ${error.message}`);
  process.exit(1);
}

console.log(`Inserted ${rows.length} image row(s).`);
