// Read-only analysis: finds Korean Beauty Trading Co. products that look like the
// same underlying item sold in different variations (volume/size, pack count, etc).
// Groups by (brand, normalized name with size/pack/volume tokens stripped).
// Does NOT modify any data — reporting only.
//
// Run: node --env-file=.env scripts/analyze-kbeauty-variants.mjs

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUPPLIER_SLUG = "korean-beauty-trading-co";

const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();

if (compErr || !company) {
  console.error(`Supplier not found: ${compErr?.message}`);
  process.exit(1);
}

// Paginate through all products for this supplier
const all = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await admin
    .from("products")
    .select("id, name, brand, base_price, jan_code, box_pack_qty, moq, slug")
    .eq("supplier_id", company.id)
    .range(from, from + PAGE - 1);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

console.log(`Total products for ${SUPPLIER_SLUG}: ${all.length}\n`);

// Strip size/volume/pack tokens to get a "base name" for grouping.
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\(box of \d+\)/gi, "")
    .replace(/\b\d+(\.\d+)?\s?(ml|g|kg|oz|pcs?|ea|sheets?|masks?|pads?)\b/gi, "")
    .replace(/\bspf\s?\d+\+*/gi, "")
    .replace(/\bpa\+*/gi, "")
    .replace(/[()]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const groups = new Map(); // key: brand::normalizedName -> products[]
for (const p of all) {
  const key = `${(p.brand || "").toLowerCase()}::${normalize(p.name)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}

const clusters = [...groups.entries()].filter(([, items]) => items.length > 1);
clusters.sort((a, b) => b[1].length - a[1].length);

console.log(`Groups with 2+ products (likely variants): ${clusters.length}`);
const totalInClusters = clusters.reduce((sum, [, items]) => sum + items.length, 0);
console.log(`Total products covered by these clusters: ${totalInClusters}\n`);

console.log("=== Top 40 clusters ===\n");
for (const [key, items] of clusters.slice(0, 40)) {
  const [brand] = key.split("::");
  console.log(`[${brand || "no-brand"}] ${items.length} variants:`);
  for (const p of items) {
    console.log(`   - ${p.name}  | price=${(p.base_price / 100).toFixed(2)} | box_pack_qty=${p.box_pack_qty} | moq=${p.moq} | jan=${p.jan_code} | slug=${p.slug}`);
  }
  console.log("");
}
