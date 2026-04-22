// Apply migration 00047_supplier_applications.sql to the live Supabase
// via DATABASE_URL (service-role Postgres). Idempotent.
//
// Run: node --env-file=.env scripts/apply-migration-47.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00047_supplier_applications.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00047_supplier_applications.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'supplier_applications'
   ORDER BY ordinal_position`
);
console.log(`\nsupplier_applications columns (${rows.length}):`);
for (const c of rows) console.log(`  - ${c.column_name}`);

await client.end();
console.log("\nDone.");
