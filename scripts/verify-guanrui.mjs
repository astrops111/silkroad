// Quick verification: confirm the 3 seeded products belong to GUANRUI
// and have image rows attached.
//
// Run: node --env-file=.env scripts/verify-guanrui.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: company } = await admin
  .from("companies")
  .select("id, name, slug, type, verification_status")
  .eq("slug", "guanrui")
  .single();

console.log("GUANRUI company:", company);

const { data: products } = await admin
  .from("products")
  .select(
    "id, name, supplier_id, category_id, moderation_status, is_active, base_price, currency, origin_country, trade_term, product_images (id, url, is_primary, sort_order)"
  )
  .eq("supplier_id", company.id);

console.log(`\nProducts owned by GUANRUI: ${products?.length ?? 0}`);
for (const p of products ?? []) {
  console.log(`\n  · ${p.name}`);
  console.log(`    id:            ${p.id}`);
  console.log(`    supplier_id:   ${p.supplier_id}  ${p.supplier_id === company.id ? "✓" : "✗ MISMATCH"}`);
  console.log(`    category_id:   ${p.category_id}`);
  console.log(`    status:        moderation=${p.moderation_status}  active=${p.is_active}`);
  console.log(`    price:         ${p.base_price / 100} ${p.currency}`);
  console.log(`    origin:        ${p.origin_country}  trade=${p.trade_term}`);
  console.log(`    images:        ${p.product_images?.length ?? 0}`);
  for (const img of p.product_images ?? []) {
    console.log(`      - [${img.is_primary ? "PRIMARY" : "      "}] ${img.url}`);
  }
}
