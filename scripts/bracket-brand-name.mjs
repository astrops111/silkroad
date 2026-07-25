// Write: apply the [Brand]-prefix transform reviewed in
// scripts/dry-run-bracket-brand.mjs to every matched product. Same
// extraction/matching logic, now with the update executed:
//   1. Leading "[X]" where X already normalizes to brand -> skip.
//   2. Leading "[X]" where X is NOT the brand -> prepend "[Brand] ".
//   3. Plain-text brand prefix (exact case-insensitive, or normalized
//      match tolerating punctuation/spacing) -> wrap it: "[Brand] " + rest.
//   4. Otherwise (no bracket, no plain-text prefix, including names with
//      a bracket only mid/end) -> prepend "[Brand] " to the whole name.
// Products with no brand value are skipped.
//
// Run: node --env-file=.env scripts/bracket-brand-name.mjs
//
// Uses DATABASE_URL (service-role Postgres) with batched multi-row
// UPDATEs, same connection pattern as scripts/apply-migration-116.mjs,
// since 15k+ individual Supabase-client round trips would be too slow.

import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

const data = [];
const PAGE_SIZE = 1000;
for (let offset = 0; ; offset += PAGE_SIZE) {
  const { rows } = await client.query(
    `SELECT id, name, brand FROM products ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, offset]
  );
  data.push(...rows);
  if (rows.length < PAGE_SIZE) break;
}

const norm = (s) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, "") : "");

function findNormalizedBoundary(name, normBrand) {
  let consumed = "";
  for (let i = 0; i < name.length; i++) {
    const ch = name[i].toLowerCase();
    if (/[a-z0-9]/.test(ch)) consumed += ch;
    if (consumed === normBrand) return i + 1;
    if (consumed.length > normBrand.length) return -1;
  }
  return -1;
}

const updates = [];

for (const p of data) {
  if (!p.name) continue;
  const brand = p.brand?.trim();
  if (!brand) continue;

  const normBrand = norm(brand);
  const leadingBracket = p.name.match(/^\s*\[([^\]]*)\]/);

  if (leadingBracket) {
    if (norm(leadingBracket[1]) === normBrand) continue; // already correct
    updates.push({ id: p.id, name: `[${brand}] ${p.name}` });
    continue;
  }

  const trimmedName = p.name.trim();
  if (trimmedName.toLowerCase().startsWith(brand.toLowerCase())) {
    const rest = trimmedName.slice(brand.length).trim();
    updates.push({ id: p.id, name: rest ? `[${brand}] ${rest}` : `[${brand}]` });
    continue;
  }

  const boundary = findNormalizedBoundary(trimmedName, normBrand);
  if (boundary > 0) {
    const rest = trimmedName.slice(boundary).trim();
    updates.push({ id: p.id, name: rest ? `[${brand}] ${rest}` : `[${brand}]` });
    continue;
  }

  updates.push({ id: p.id, name: `[${brand}] ${p.name}` });
}

console.log(`Applying ${updates.length} product name updates…`);

const BATCH_SIZE = 500;
let success = 0;
for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const batch = updates.slice(i, i + BATCH_SIZE);
  const values = batch.map((u, idx) => `($${idx * 2 + 1}::uuid, $${idx * 2 + 2}::text)`).join(", ");
  const params = batch.flatMap((u) => [u.id, u.name]);
  await client.query(
    `UPDATE products AS p SET name = v.name FROM (VALUES ${values}) AS v(id, name) WHERE p.id = v.id`,
    params
  );
  success += batch.length;
  console.log(`  ...${success}/${updates.length} done`);
}

await client.end();
console.log(`\nDone. Updated: ${success}`);
