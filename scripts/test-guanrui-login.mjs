// Simulate owner@guanrui.jp login and call the supplier dashboard API
// the same way the browser would — exposes 500s/hangs on server.
//
// Run: node --env-file=.env scripts/test-guanrui-login.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const anon = createClient(URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Signing in as owner@guanrui.jp…");
const { data: authData, error: authErr } = await anon.auth.signInWithPassword({
  email: "owner@guanrui.jp",
  password: "password123",
});
if (authErr) {
  console.error("auth failed:", authErr.message);
  process.exit(1);
}
console.log("  ✓ auth user:", authData.user.id);

// Now query as the signed-in user (RLS applies)
console.log("\nuser_profiles row visible via RLS:");
const { data: profile, error: profErr } = await anon
  .from("user_profiles")
  .select("id, email, full_name, auth_id")
  .eq("auth_id", authData.user.id)
  .maybeSingle();
console.log("  ", profErr ? `ERR: ${profErr.message}` : profile);

if (!profile) process.exit(1);

console.log("\ncompany_members with companies join:");
const { data: members, error: memErr } = await anon
  .from("company_members")
  .select("id, role, is_primary, company_id, companies (id, name, type, country_code, verification_status)")
  .eq("user_id", profile.id);
console.log("  ", memErr ? `ERR: ${memErr.message}` : JSON.stringify(members, null, 2));

console.log("\ncompany_members with limit(1).single() — what the API uses:");
const { data: m1, error: m1Err } = await anon
  .from("company_members")
  .select("company_id, companies ( name, country_code, verification_status )")
  .eq("user_id", profile.id)
  .limit(1)
  .single();
console.log("  ", m1Err ? `ERR: ${m1Err.message}` : JSON.stringify(m1, null, 2));

console.log("\nSample supplier KPI queries:");
for (const label of ["active products", "recent orders", "notifications"]) {
  const q =
    label === "active products"
      ? anon.from("products").select("id", { count: "exact", head: true }).eq("supplier_id", m1?.company_id).eq("moderation_status", "approved").eq("is_active", true)
      : label === "recent orders"
        ? anon.from("supplier_orders").select("id", { count: "exact", head: true }).eq("supplier_id", m1?.company_id)
        : anon.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_read", false);
  const { count, error } = await q;
  console.log(`  ${label}: ${error ? `ERR: ${error.message}` : count}`);
}

await anon.auth.signOut();
console.log("\nDone.");
