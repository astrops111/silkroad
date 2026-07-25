// Diagnostic: find products whose `name` field contains underscores
// Run: node --env-file=.env scripts/check-underscore-product-names.mjs

import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

console.log("Connecting to Postgres…");
await client.connect();
console.log("  ✓ connected");

const data = [];
const PAGE_SIZE = 1000;
for (let offset = 0; ; offset += PAGE_SIZE) {
  const { rows } = await client.query(
    `SELECT id, name FROM products ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, offset]
  );
  data.push(...rows);
  if (rows.length < PAGE_SIZE) break;
}

console.log(`Total products scanned: ${data.length}`);

const withUnderscore = data.filter((p) => p.name && p.name.includes("_"));
console.log(`\nNames containing "_": ${withUnderscore.length}`);
for (const p of withUnderscore.slice(0, 50)) {
  console.log(`  id=${p.id} name="${p.name}" -> "${p.name.replace(/_/g, " ").replace(/\s+/g, " ").trim()}"`);
}
if (withUnderscore.length > 50) {
  console.log(`  ...and ${withUnderscore.length - 50} more`);
}

await client.end();
