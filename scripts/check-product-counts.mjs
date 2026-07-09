// Diagnostic: why does the marketplace show 592 products instead of 700+?
// Run: node --env-file=.env scripts/check-product-counts.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count: total } = await admin
  .from("products")
  .select("*", { count: "exact", head: true });
console.log(`Total rows in products table: ${total}`);

const { count: approvedActive } = await admin
  .from("products")
  .select("*", { count: "exact", head: true })
  .eq("moderation_status", "approved")
  .eq("is_active", true);
console.log(`moderation_status=approved AND is_active=true (marketplace-visible): ${approvedActive}`);

for (const status of ["approved", "pending", "rejected", "draft"]) {
  const { count } = await admin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("moderation_status", status);
  console.log(`  moderation_status=${status}: ${count}`);
}

const { count: inactive } = await admin
  .from("products")
  .select("*", { count: "exact", head: true })
  .eq("is_active", false);
console.log(`is_active=false: ${inactive}`);

const { count: approvedInactive } = await admin
  .from("products")
  .select("*", { count: "exact", head: true })
  .eq("moderation_status", "approved")
  .eq("is_active", false);
console.log(`moderation_status=approved AND is_active=false (approved but hidden): ${approvedInactive}`);
