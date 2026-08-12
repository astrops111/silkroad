// Re-positions HODAF's catalogue as OEM/private-label stock: the supplier stays
// HODAF, but buyers order unbranded goods under their own label, so
//   brand         -> "OEM"
//   name          -> "[OEM] <name>"  (platform's [Brand] convention, see bracket-brand-name.mjs)
//   moq           -> 2000 pieces per item (an OEM production run, not a box)
//   box_pack_qty  -> null, so the storefront prices and orders per PIECE instead of
//                    per box (product-detail-client.tsx / marketplace/page.tsx both
//                    switch to box display only when box_pack_qty > 1). base_price is
//                    already per-piece from fix-hodaf-box-pricing.mjs and is untouched.
//   description   -> "Brand: OEM" plus the OEM fee lines; the description's
//                    "Label: value" lines render as Specifications on the product page.
//
// The box packing itself is not lost — it stays on the description's "Packaging:" line.
//
// Idempotent: re-running leaves already-converted rows unchanged.
//
// Run: node --env-file=.env scripts/set-hodaf-oem.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const SUPPLIER_SLUG = "hodaf";
const BRAND = "OEM";
const PREFIX = `[${BRAND}] `;
const MOQ = 2000;

// Rendered as Specifications rows on the product page (description "Label: value"
// lines are parsed into specs). Kept in sync with OEM_TERMS in product-detail-client.tsx.
const FEE_LINES = [
  `MOQ: ${MOQ.toLocaleString("en-US")} pieces per item`,
  "One-time label account setup fee: USD 500",
  "Design & product fee: Extra, quoted per project",
];
const FEE_LABELS = FEE_LINES.map((l) => l.slice(0, l.indexOf(":")).toLowerCase());

function prefixName(name) {
  if (!name) return name;
  return name.startsWith(PREFIX) ? name : PREFIX + name;
}

// "Brand: HODAF" -> "Brand: OEM"; drops any previously-appended fee lines and
// re-appends the current ones, so repeat runs converge on the same text.
function rewriteDescription(description) {
  const kept = (description ?? "")
    .split("\n")
    .map((line) => (/^brand\s*[:：]/i.test(line.trim()) ? `Brand: ${BRAND}` : line))
    .filter((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return true;
      return !FEE_LABELS.includes(line.slice(0, colon).trim().toLowerCase());
    });

  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  return [...kept, "", ...FEE_LINES].join("\n");
}

const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id, name")
  .eq("slug", SUPPLIER_SLUG)
  .single();
if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found.`);
  process.exit(1);
}
console.log(`Supplier: ${company.name} (${company.id}) — stays the supplier; only the brand becomes ${BRAND}.\n`);

const { data: products, error: fetchErr } = await admin
  .from("products")
  .select("id, name, name_local, brand, moq, box_pack_qty, base_price, description")
  .eq("supplier_id", company.id)
  .order("name");
if (fetchErr) { console.error(`Fetch failed: ${fetchErr.message}`); process.exit(1); }
if (!products?.length) { console.log("No HODAF products found."); process.exit(0); }

let updated = 0, failed = 0;
for (const p of products) {
  const patch = {
    brand: BRAND,
    name: prefixName(p.name),
    name_local: prefixName(p.name_local),
    moq: MOQ,
    box_pack_qty: null,
    description: rewriteDescription(p.description),
  };

  const { error } = await admin.from("products").update(patch).eq("id", p.id);
  if (error) { failed++; console.error(`  ✗ ${p.name}: ${error.message}`); continue; }
  updated++;
  console.log(
    `  ✓ ${patch.name} — brand ${p.brand} -> ${BRAND}, moq ${p.moq} -> ${MOQ} pcs, ` +
    `box_pack_qty ${p.box_pack_qty} -> null, $${(p.base_price / 100).toFixed(2)}/pc`
  );
}

// Product variants carry their own moq/box_pack_qty and would override the product's.
const { data: variants, error: varErr } = await admin
  .from("product_variants")
  .select("id")
  .in("product_id", products.map((p) => p.id));
if (varErr) {
  console.warn(`\n! could not check product_variants: ${varErr.message}`);
} else if (variants?.length) {
  const { error: varUpdErr } = await admin
    .from("product_variants")
    .update({ moq: MOQ, box_pack_qty: null })
    .in("id", variants.map((v) => v.id));
  if (varUpdErr) console.error(`\n✗ variant update failed: ${varUpdErr.message}`);
  else console.log(`\n  ✓ ${variants.length} variants set to moq=${MOQ}, box_pack_qty=null`);
}

console.log(`\nDone — ${updated} updated, ${failed} failed.`);
