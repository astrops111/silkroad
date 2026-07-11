// Backfills products.box_pack_qty for Korean Beauty Trading Co products that
// don't have it set yet, so buyers can purchase by box (see product-detail
// page / cart page box-based quantity selector).
//
// Safe because import-drive-catalog.mjs set moq = pcs_per_box for every one
// of these rows (a 1-box minimum order), so box_pack_qty = moq is exact for
// this supplier. moq itself is left untouched.
//
// Run: node --env-file=.env scripts/backfill-kbeauty-box-pack-qty.mjs

import { createClient } from "@supabase/supabase-js";

const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(DB_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUPPLIER_SLUG = "korean-beauty-trading-co";

const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();

if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found.`);
  process.exit(1);
}

const { count: toBackfillCount } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("supplier_id", company.id)
  .is("box_pack_qty", null);

console.log(`[pending] ${toBackfillCount ?? 0} products need box_pack_qty backfilled\n`);

if (!toBackfillCount) {
  console.log("Nothing to backfill.");
  process.exit(0);
}

let updated = 0, failed = 0;

while (true) {
  const { data: batch, error: fetchErr } = await admin
    .from("products")
    .select("id, moq")
    .eq("supplier_id", company.id)
    .is("box_pack_qty", null)
    .limit(500);

  if (fetchErr) { console.error(`fetch error: ${fetchErr.message}`); process.exit(1); }
  if (!batch || batch.length === 0) break;

  for (const p of batch) {
    const { error } = await admin
      .from("products")
      .update({ box_pack_qty: p.moq })
      .eq("id", p.id);
    if (error) { failed++; console.error(`  ✗ ${p.id}: ${error.message}`); }
    else updated++;
  }
  process.stdout.write(`\r  backfilled: ${updated}/${toBackfillCount} (${failed} failed)`);
}

console.log(`\n\nDone — ${updated} updated, ${failed} failed.`);
