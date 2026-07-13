// Apply migration 00108_search_product_ids_name_sort.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-107.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-108.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00108_search_product_ids_name_sort.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00108_search_product_ids_name_sort.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

// Verify the function exists and returns rows ordered alphabetically by name.
const { rows: fn } = await client.query(
  `SELECT proname FROM pg_proc WHERE proname = 'search_product_ids'`
);
console.log(`function search_product_ids: ${fn.length ? "✓ present" : "✗ missing"}`);

try {
  const { rows } = await client.query(
    `SELECT p.name
       FROM search_product_ids(null, null, null, null, null, null, null, 'name', 5, 0) s
       JOIN products p ON p.id = s.id
       ORDER BY 1`
  );
  const names = rows.map((r) => r.name);
  console.log(`sample (first 5 by name): ${names.join(" | ") || "(no products)"}`);
} catch (err) {
  console.log(`  ✗ sample query failed: ${err.message}`);
}

await client.end();
console.log("\nDone.");
