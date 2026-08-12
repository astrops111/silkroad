// Apply migration 00137_health_wound_care_categories.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-136.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-137.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00137_health_wound_care_categories.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00137_health_wound_care_categories.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT id, slug, path, level, sort_order FROM categories WHERE slug IN ('health','health-wound-care') ORDER BY level`
);
console.table(rows);

await client.end();
console.log("\nDone.");
