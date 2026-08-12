// One-time: applies a 17% markup on top of supplier cost for all Korea-origin
// listings, matching the pattern already used for HODAF
// (see scripts/update-hodaf-from-sheet.mjs — cogs stays the true supplier
// cost, base_price = cogs * MARKUP is what buyers see).
//
// Only touches rows where origin_country = 'KR' and cogs is not null.
// Products with no cogs on record (placeholders, unpriced) are skipped and
// reported — there's no cost basis to mark up.
//
// Run: node --env-file=.env scripts/apply-korea-markup.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const MARKUP = 1.17;

const { data: rows, error } = await admin
  .from("products")
  .select("id, name, cogs, base_price")
  .eq("origin_country", "KR");
if (error) throw error;

const toUpdate = rows.filter((r) => r.cogs !== null);
const skipped = rows.filter((r) => r.cogs === null);

console.log(`Found ${rows.length} KR products: ${toUpdate.length} to update, ${skipped.length} skipped (no cogs).`);

let ok = 0, failed = 0;
for (const r of toUpdate) {
  const newBasePrice = Math.round(r.cogs * MARKUP);
  const { error: updErr } = await admin
    .from("products")
    .update({ base_price: newBasePrice })
    .eq("id", r.id);
  if (updErr) {
    console.error(`  ✗ ${r.name}: ${updErr.message}`);
    failed++;
  } else {
    ok++;
  }
}

console.log(`\nDone: ${ok} updated, ${failed} failed.`);
if (skipped.length) {
  console.log(`\nSkipped (no cogs on record):`);
  for (const r of skipped) console.log(`  - ${r.name} (id=${r.id}, base_price=${r.base_price})`);
}
