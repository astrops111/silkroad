// Bulk-approves products imported by import-drive-catalog.mjs that are still
// sitting in moderation_status='pending', so the drive-catalog prices verified
// by verify-drive-catalog-prices.mjs actually become visible on the marketplace.
//
// Mirrors approveProduct() in src/lib/actions/admin.ts (sets moderation_status,
// moderated_at, moderated_by) and writes one admin_action_audit row per batch
// instead of per-product, since this covers thousands of rows.
//
// Run: node --env-file=.env scripts/bulk-approve-drive-catalog.mjs

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

// 1. Resolve an admin_super to attribute the approval to
const { data: adminMember, error: adminErr } = await admin
  .from("company_members")
  .select("user_id")
  .eq("role", "admin_super")
  .limit(1)
  .single();

if (adminErr || !adminMember) {
  console.error("Could not find an admin_super to attribute approvals to:", adminErr?.message);
  process.exit(1);
}
const moderatedBy = adminMember.user_id;

// 2. Resolve supplier and count pending products
const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();

if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found.`);
  process.exit(1);
}

const { count: pendingCount } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("supplier_id", company.id)
  .eq("moderation_status", "pending");

console.log(`[pending] ${pendingCount ?? 0} products awaiting approval for ${SUPPLIER_SLUG}\n`);

if (!pendingCount) {
  console.log("Nothing to approve.");
  process.exit(0);
}

// 3. Approve in batches (avoid an unbounded single UPDATE)
const nowIso = new Date().toISOString();
let approved = 0;

while (true) {
  const { data: batch, error: fetchErr } = await admin
    .from("products")
    .select("id")
    .eq("supplier_id", company.id)
    .eq("moderation_status", "pending")
    .limit(500);

  if (fetchErr) { console.error(`fetch error: ${fetchErr.message}`); process.exit(1); }
  if (!batch || batch.length === 0) break;

  const ids = batch.map((p) => p.id);
  const { error: updateErr } = await admin
    .from("products")
    .update({ moderation_status: "approved", moderated_at: nowIso, moderated_by: moderatedBy })
    .in("id", ids);

  if (updateErr) { console.error(`update error: ${updateErr.message}`); process.exit(1); }

  approved += ids.length;
  process.stdout.write(`\r  approved: ${approved}/${pendingCount}`);
}

console.log(`\n\n[audit] logging bulk approval`);
await admin.from("admin_action_audit").insert({
  admin_id: moderatedBy,
  action_type: "product_approval",
  target_entity: "product",
  target_label: `bulk approval — ${SUPPLIER_SLUG} drive catalog`,
  reason: `Bulk-approved ${approved} products imported from Drive catalog (script: bulk-approve-drive-catalog.mjs)`,
  supporting_evidence: { approved_count: approved, supplier_slug: SUPPLIER_SLUG },
});

console.log(`Done — ${approved} products approved.`);
