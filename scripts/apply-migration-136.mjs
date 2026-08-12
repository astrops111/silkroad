// Apply migration 00136_guest_rfqs.sql to the live Supabase via
// DATABASE_URL (service-role Postgres), same pattern as apply-migration-135.mjs.
//
// Run: node --env-file=.env scripts/apply-migration-136.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00136_guest_rfqs.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

console.log("\nApplying 00136_guest_rfqs.sql …");
try {
  await client.query(sql);
  console.log("  ✓ migration applied");
} catch (err) {
  console.error("  ✗", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
    WHERE table_name = 'rfqs'
      AND column_name IN ('buyer_user_id','guest_name','guest_email','guest_phone','guest_company')
    ORDER BY column_name`
);
console.table(rows);

const { rows: constraint } = await client.query(
  `SELECT conname FROM pg_constraint WHERE conname = 'rfqs_buyer_identity_check'`
);
console.log("identity check constraint:", constraint[0]?.conname ?? "MISSING");

await client.end();
console.log("\nDone.");
