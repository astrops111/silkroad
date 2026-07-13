// Apply migration 00107_product_labels.sql to the live Supabase via
// DATABASE_URL (service-role Postgres), same pattern as apply-migration-101.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-107.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00107_product_labels.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00107_product_labels.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

// Verify structure.
const checks = [
  ["labels", ["id", "name", "slug", "kind", "created_at"]],
  ["product_labels", ["product_id", "label_id", "created_at"]],
];
for (const [table, expectedCols] of checks) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  const have = new Set(rows.map((r) => r.column_name));
  const missing = expectedCols.filter((c) => !have.has(c));
  console.log(`${table}: ${missing.length === 0 ? "✓ all columns present" : `✗ missing ${missing.join(", ")}`}`);
}

const { rows: trg } = await client.query(
  `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_product_labels_search'`
);
console.log(`trigger trg_product_labels_search: ${trg.length ? "✓ present" : "✗ missing"}`);

await client.end();
console.log("\nDone.");
