// Write: replace "_" with a space in every product name, collapsing
// resulting repeated whitespace and trimming ends.
// Reviewed via scripts/check-underscore-product-names.mjs.
//
// Run: node --env-file=.env scripts/replace-underscore-product-names.mjs
//
// Uses DATABASE_URL (service-role Postgres) with batched multi-row
// UPDATEs, same connection pattern as scripts/bracket-brand-name.mjs.

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
    `SELECT id, name FROM products ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, offset]
  );
  data.push(...rows);
  if (rows.length < PAGE_SIZE) break;
}

const updates = [];
for (const p of data) {
  if (!p.name || !p.name.includes("_")) continue;
  const newName = p.name.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (newName !== p.name) updates.push({ id: p.id, name: newName });
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
