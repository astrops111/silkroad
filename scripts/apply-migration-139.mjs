// Apply migration 00139_taiwan_air_freight_rates.sql to the live Supabase
// via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-138.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-139.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const FILE = "00139_taiwan_air_freight_rates.sql";
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

const { rows } = await client.query(`
  SELECT origin_country, shipping_method, per_kg_rate, min_chargeable_kg,
         round_up_chargeable_kg, rebox_fee_per_carton, carton_volume_cbm,
         documentation_fee, free_shipping_threshold, currency, is_active
  FROM shipping_rates
  ORDER BY origin_country NULLS LAST, shipping_method
`);
console.log("\nshipping_rates now:");
console.table(rows);

await client.end();
console.log("\nDone.");
