// Apply migration 00110_pooling_info_group_identity.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as apply-migration-109.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-110.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00110_pooling_info_group_identity.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00110_pooling_info_group_identity.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

// Verify the new columns are queryable.
try {
  const { rows } = await client.query(
    `SELECT group_country_code, group_name, group_id, COUNT(*)::int AS products
       FROM products_pooling_info
      GROUP BY 1, 2, 3 ORDER BY 4 DESC`
  );
  console.table(rows);
} catch (err) {
  console.log(`  ✗ verify query failed: ${err.message}`);
}

await client.end();
console.log("\nDone.");
