// Apply migration 00109_product_pooling_info.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-108.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-109.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00109_product_pooling_info.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00109_product_pooling_info.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

// Verify the view exists and returns pooled products (if any are grouped yet).
const { rows: v } = await client.query(
  `SELECT viewname FROM pg_views WHERE viewname = 'products_pooling_info'`
);
console.log(`view products_pooling_info: ${v.length ? "✓ present" : "✗ missing"}`);

try {
  const { rows } = await client.query(
    `SELECT pooling_group_type, COUNT(*)::int AS products
       FROM products_pooling_info
      GROUP BY 1 ORDER BY 2 DESC`
  );
  if (rows.length === 0) {
    console.log("no products are assigned to an active shipping group yet (view is empty — expected until groups are assigned)");
  } else {
    for (const r of rows) console.log(`  ${r.pooling_group_type}: ${r.products} products`);
  }
} catch (err) {
  console.log(`  ✗ sample query failed: ${err.message}`);
}

await client.end();
console.log("\nDone.");
