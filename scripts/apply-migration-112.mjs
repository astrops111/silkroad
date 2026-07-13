// Apply migration 00112_assistant_usage_costs.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-111.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-112.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00112_assistant_usage_costs.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00112_assistant_usage_costs.sql …");
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
    WHERE table_name = 'shopping_assistant_logs'
      AND column_name IN ('model','input_tokens','output_tokens','cost_usd')`
);
console.log(`usage columns present: ${rows.length}/4`);
const { rows: v } = await client.query(
  `SELECT viewname FROM pg_views WHERE viewname = 'shopping_assistant_daily_costs'`
);
console.log(`view shopping_assistant_daily_costs: ${v.length ? "✓ present" : "✗ missing"}`);

await client.end();
console.log("\nDone.");
