// Apply migration 00101_product_variants_expansion.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same as apply-migration-47.mjs.
// Deliberately bypasses `supabase db push` — migrations 00093-00100 are
// pending-but-not-yet-pushed for unrelated reasons; this applies only 00101.
//
// Run: node --env-file=.env scripts/apply-migration-101.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00101_product_variants_expansion.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00101_product_variants_expansion.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const checks = [
  ["product_variants", ["jan_code", "moq", "box_pack_qty", "is_default"]],
  ["product_images", ["variant_id"]],
  ["rfq_items", ["variant_id"]],
  ["products", ["merged_into_product_id"]],
];

for (const [table, expectedCols] of checks) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  const have = new Set(rows.map((r) => r.column_name));
  const missing = expectedCols.filter((c) => !have.has(c));
  console.log(
    `${table}: ${missing.length === 0 ? "✓ all columns present" : `✗ missing ${missing.join(", ")}`}`
  );
}

await client.end();
console.log("\nDone.");
