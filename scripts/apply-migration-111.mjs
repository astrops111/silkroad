// Apply migration 00111_shopping_assistant_logs.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-110.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-111.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00111_shopping_assistant_logs.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00111_shopping_assistant_logs.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT to_regclass('public.shopping_assistant_logs') IS NOT NULL AS ok`
);
console.log(`table shopping_assistant_logs: ${rows[0].ok ? "✓ present" : "✗ missing"}`);

await client.end();
console.log("\nDone.");
