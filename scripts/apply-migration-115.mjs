// Apply migration 00115_computer_peripherals_expansion.sql to the live
// Supabase via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-112.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-115.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00115_computer_peripherals_expansion.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00115_computer_peripherals_expansion.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows: cats } = await client.query(
  `SELECT slug FROM categories WHERE parent_id = '3f9827ab-adcc-42a0-a0ca-4867916de07b' AND level = 2 ORDER BY sort_order`
);
console.log(`new leaf categories: ${cats.length}/9`);
console.log(cats.map((c) => c.slug).join(", "));

const { rows: kindDef } = await client.query(
  `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'labels_kind_check'`
);
console.log(`labels_kind_check: ${kindDef[0]?.def}`);

const { rows: useLabels } = await client.query(
  `SELECT slug FROM labels WHERE kind = 'use_case' ORDER BY slug`
);
console.log(`use_case labels: ${useLabels.length}/5 — ${useLabels.map((l) => l.slug).join(", ")}`);

await client.end();
console.log("\nDone.");
