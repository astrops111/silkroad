// One-off helper to apply specific Supabase migration files via DATABASE_URL.
// Usage: node scripts/apply-migrations.js <migration-file> [<migration-file> ...]
// Reads DATABASE_URL from .env, runs each file as a single transaction.
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function readEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (m) {
      let val = m[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  throw new Error("DATABASE_URL not found in .env");
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node scripts/apply-migrations.js <file> [<file> ...]");
    process.exit(1);
  }

  const url = readEnv();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(file, "utf8");
      console.log(`--- applying ${file} (${sql.length} bytes) ---`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
        console.log(`    ok`);
      } catch (e) {
        await client.query("rollback");
        console.error(`    FAILED: ${e.message}`);
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
