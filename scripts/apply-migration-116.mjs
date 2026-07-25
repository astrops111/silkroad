// Apply migration 00116_fix_order_status_shipped_enum.sql to the live
// Supabase via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-115.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-116.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00116_fix_order_status_shipped_enum.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00116_fix_order_status_shipped_enum.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT prosrc FROM pg_proc WHERE proname = 'notify_on_order_status_change'`
);
console.log("shipped literal still present:", rows[0]?.prosrc.includes("'shipped'"));

await client.end();
console.log("\nDone.");
