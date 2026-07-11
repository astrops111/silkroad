// One-off: sets lead_time_days=75 and min_order_amount=$10,000 (1,000,000 cents)
// for every product with origin_country = 'KR'.
//
// Run: node --env-file=.env scripts/set-kr-lead-time-moa.mjs

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("origin_country", "KR");

console.log(`KR products found: ${total}`);

const { error, count: updated } = await admin
  .from("products")
  .update({ lead_time_days: 75, min_order_amount: 1000000 }, { count: "exact" })
  .eq("origin_country", "KR");

if (error) {
  console.error(`Update failed: ${error.message}`);
  process.exit(1);
}

console.log(`Updated ${updated} KR products: lead_time_days=75, min_order_amount=1000000 (cents, $10,000)`);
