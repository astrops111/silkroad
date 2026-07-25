// Dry-run (read-only): for every product whose name starts with a
// "(...)" qualifier, compute the proposed new name (qualifier moved to
// the end) and the value that would be written to the new products.notes
// column. Prints the full proposed change set plus any anomalies
// (e.g. name is *only* the parenthetical, so there's nothing to move it
// in front of) so they can be reviewed before any write happens.
//
// Run: node --env-file=.env scripts/dry-run-move-parenthetical-to-notes.mjs

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

const changes = [];
const anomalies = [];

for (const p of data) {
  if (!p.name) continue;
  const match = p.name.match(LEADING_PAREN);
  if (!match) continue;

  const qualifier = match[1].trim();
  const rest = p.name.slice(match[0].length).trim();

  if (!qualifier) {
    anomalies.push({ id: p.id, name: p.name, reason: "empty parenthetical" });
    continue;
  }
  if (!rest) {
    anomalies.push({ id: p.id, name: p.name, reason: "name is only the parenthetical — nothing to move it after" });
    continue;
  }

  changes.push({
    id: p.id,
    oldName: p.name,
    newName: `${rest} (${qualifier})`,
    notes: qualifier,
  });
}

console.log(`Total products scanned: ${data.length}`);
console.log(`Proposed changes: ${changes.length}`);
console.log(`Anomalies (skipped, need manual review): ${anomalies.length}`);

console.log("\n--- Anomalies ---");
for (const a of anomalies) {
  console.log(`  id=${a.id} name="${a.name}" reason="${a.reason}"`);
}

console.log("\n--- Sample of proposed changes (first 40) ---");
for (const c of changes.slice(0, 40)) {
  console.log(`  id=${c.id}`);
  console.log(`    old:   "${c.oldName}"`);
  console.log(`    new:   "${c.newName}"`);
  console.log(`    notes: "${c.notes}"`);
}

// Frequency breakdown of the extracted qualifiers, to sanity-check nothing
// weird is being extracted.
const freq = new Map();
for (const c of changes) {
  const key = c.notes.toLowerCase();
  freq.set(key, (freq.get(key) || 0) + 1);
}
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
console.log("\n--- Qualifier frequency ---");
for (const [q, count] of sorted) {
  console.log(`  ${count.toString().padStart(4)}  "${q}"`);
}
