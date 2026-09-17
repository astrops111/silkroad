// Apply migration 00140_rfq_shipping_confirmations.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-139.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-140.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const FILE = "00140_rfq_shipping_confirmations.sql";
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", FILE), "utf8");

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log(`\nApplying ${FILE} …`);
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows: cols } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'rfq_shipping_confirmations'
  ORDER BY ordinal_position
`);
console.log(`\nrfq_shipping_confirmations — ${cols.length} columns:`);
console.log(cols.map((c) => `  ${c.column_name} (${c.data_type})`).join("\n"));

const { rows: pol } = await client.query(`
  SELECT policyname FROM pg_policies WHERE tablename = 'rfq_shipping_confirmations'
`);
console.log("\nRLS policies:", pol.map((p) => p.policyname).join(", ") || "(none)");

await client.end();
console.log("\nDone.");
