// One-off: sets trade_term='exw' (was 'fob') for every product with origin_country = 'KR'.
// Also fixes the "Ships FOB Incheon." wording in descriptions, if present.
//
// Run: node --env-file=.env scripts/set-kbeauty-exw.mjs

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("origin_country", "KR");

console.log(`KR products found: ${total}`);

const { error, count: updated } = await admin
  .from("products")
  .update({ trade_term: "exw" }, { count: "exact" })
  .eq("origin_country", "KR");

if (error) {
  console.error(`Update failed: ${error.message}`);
  process.exit(1);
}

console.log(`Updated ${updated} KR products: trade_term=exw`);

// Fix description wording for anything still saying "FOB Incheon".
// Looped because the default query page size (1000) may not cover every match in one pass.
let descFixed = 0;
while (true) {
  const { data: withFobText, error: selErr } = await admin
    .from("products")
    .select("id, description")
    .eq("origin_country", "KR")
    .ilike("description", "%FOB Incheon%")
    .limit(1000);

  if (selErr) {
    console.error(`Description lookup failed: ${selErr.message}`);
    process.exit(1);
  }

  if (!withFobText || withFobText.length === 0) break;
  console.log(`Products with "FOB Incheon" in description (this pass): ${withFobText.length}`);

  const CONCURRENCY = 25;
  for (let i = 0; i < withFobText.length; i += CONCURRENCY) {
    const chunk = withFobText.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((p) =>
        admin
          .from("products")
          .update({ description: p.description.replace(/FOB Incheon/g, "EXW Incheon") })
          .eq("id", p.id)
      )
    );
    for (const { error: updErr } of results) {
      if (updErr) console.error(`  ✗ update failed: ${updErr.message}`);
      else descFixed++;
    }
    process.stdout.write(`\r  fixed: ${descFixed}`);
  }
  console.log("");
}

console.log(`Fixed description wording on ${descFixed} products total.`);
