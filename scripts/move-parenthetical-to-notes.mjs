// Write: for every product whose name starts with a "(...)" qualifier,
// move that qualifier to the end of the name and copy it into the new
// products.notes column (added in migration 00122). Same extraction
// logic as the read-only dry-run in
// scripts/dry-run-move-parenthetical-to-notes.mjs, reviewed with the
// user before this was written.
//
// Two products (114e7d46-... and 99ceaf50-...) have their entire `name`
// field overwritten by an internal Korean design-revision note, with the
// real product name embedded in `description`. Those are hardcoded fixes
// confirmed with the user, not part of the generic transform.
//
// Run: node --env-file=.env scripts/move-parenthetical-to-notes.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const data = [];
const PAGE_SIZE = 1000;
for (let from = 0; ; from += PAGE_SIZE) {
  const { data: page, error } = await admin
    .from("products")
    .select("id, name")
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  data.push(...page);
  if (page.length < PAGE_SIZE) break;
}

const LEADING_PAREN = /^\s*\(([^)]*)\)\s*/;

const updates = [];

for (const p of data) {
  if (!p.name) continue;
  const match = p.name.match(LEADING_PAREN);
  if (!match) continue;

  const qualifier = match[1].trim();
  const rest = p.name.slice(match[0].length).trim();
  if (!qualifier || !rest) continue; // anomalies, handled separately below

  updates.push({
    id: p.id,
    name: `${rest} (${qualifier})`,
    notes: qualifier,
  });
}

// Confirmed anomaly fixes (real name recovered from description, revision
// note moved to notes).
updates.push({
  id: "114e7d46-ea5d-4d96-876b-15078975581b",
  name: "JM Solution V Skin Comfort Mask",
  notes: "Vitamin B3 - Design updated Feb 7, 2024",
});
updates.push({
  id: "99ceaf50-2ebe-4aab-a24a-232d5c89b532",
  name: "JM Solution V Skin Radiance Mask",
  notes: "Vitamin C - Design changed to existing on Feb 7, 2024",
});

console.log(`Applying ${updates.length} product updates…`);

let success = 0;
let failed = 0;
for (const u of updates) {
  const { error } = await admin
    .from("products")
    .update({ name: u.name, notes: u.notes })
    .eq("id", u.id);
  if (error) {
    failed++;
    console.error(`  ✗ id=${u.id}: ${error.message}`);
  } else {
    success++;
  }
}

console.log(`\nDone. Updated: ${success}, failed: ${failed}`);
