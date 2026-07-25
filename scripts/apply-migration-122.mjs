// Apply migration 00122_product_notes_column.sql to the live
// Supabase via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-116.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-122.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00122_product_notes_column.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00122_product_notes_column.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'notes'`
);
console.log("products.notes column present:", rows.length > 0);

await client.end();
console.log("\nDone.");
