// Apply migration 00134_trade_flows.sql to the live Supabase via
// DATABASE_URL (service-role Postgres), same pattern as apply-migration-122.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-134.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00134_trade_flows.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00134_trade_flows.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('trade_flows','trade_flow_events','trade_flow_documents')
   ORDER BY table_name`
);
console.log(
  "tables present:",
  rows.map((r) => r.table_name).join(", ") || "none"
);

await client.end();
console.log("\nDone.");
