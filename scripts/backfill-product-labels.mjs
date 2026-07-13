// Backfill product labels for every product: seed each product's labels from
//   - its brand              (kind = 'brand')
//   - its category + ancestors (kind = 'category')  e.g. Beauty / Hair / Shampoo
//   - salient name keywords   (kind = 'keyword')
//
// Labels are a shared vocabulary (deduped by slug). Uses a direct pg connection
// (service role) so the per-row search_vector trigger can be disabled during the
// bulk join insert, then search_vector is recomputed set-based at the end.
//
// Dry run (default): prints stats + samples, writes nothing.
//   node --env-file=.env scripts/backfill-product-labels.mjs
// Apply:
//   node --env-file=.env scripts/backfill-product-labels.mjs --apply

import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("Missing DATABASE_URL in .env"); process.exit(1); }
const APPLY = process.argv.includes("--apply");

// ------------------------------------------------------------------
// Label derivation
// ------------------------------------------------------------------
function labelSlug(name) {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "with", "of", "in", "to", "by", "on",
  "set", "pack", "box", "new", "free", "size", "ver", "type", "edition",
  "series", "no", "ml", "g", "kg", "oz", "pcs", "pc", "ea", "sheet", "sheets",
  "mask", "masks", "pad", "pads", "cm", "mm", "spf", "pa", "premium",
]);

// Salient keyword tokens from a product name (lowercase, deduped, capped).
function keywords(name) {
  const tokens = (name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const t of tokens) {
    if (t.length < 3) continue;       // drop tiny tokens
    if (/^\d/.test(t)) continue;      // drop size/qty tokens (300ml, 24, ...)
    if (/^(spf|pa)\d*$/.test(t)) continue;
    if (STOP.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}

const KIND_RANK = { keyword: 1, category: 2, brand: 3 };

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("Connected.\n");

// Category ancestor chain (names) for a category id.
const { rows: cats } = await client.query("SELECT id, name, parent_id FROM categories");
const catById = new Map(cats.map((c) => [c.id, c]));
function categoryNames(categoryId) {
  const names = [];
  let cur = categoryId ? catById.get(categoryId) : null;
  const guard = new Set();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    if (cur.name) names.push(cur.name);
    cur = cur.parent_id ? catById.get(cur.parent_id) : null;
  }
  return names;
}

// All non-merged products.
const { rows: products } = await client.query(
  "SELECT id, name, brand, category_id FROM products WHERE merged_into_product_id IS NULL"
);
console.log(`Products to label: ${products.length}`);

// Build the global label vocabulary + the product→label pairs.
const labelDefs = new Map(); // slug -> { name, kind }
const pairs = [];            // { productId, slug }
function addLabel(productId, name, kind) {
  const slug = labelSlug(name);
  if (!slug) return;
  const existing = labelDefs.get(slug);
  if (!existing || KIND_RANK[kind] > KIND_RANK[existing.kind]) {
    labelDefs.set(slug, { name: name.trim(), kind });
  }
  pairs.push({ productId, slug });
}

for (const p of products) {
  if (p.brand) addLabel(p.id, p.brand, "brand");
  for (const cn of categoryNames(p.category_id)) addLabel(p.id, cn, "category");
  for (const kw of keywords(p.name)) addLabel(p.id, kw, "keyword");
}

// Dedupe pairs (a product may derive the same slug from >1 source).
const pairSet = new Set();
const uniquePairs = [];
for (const { productId, slug } of pairs) {
  const key = `${productId}::${slug}`;
  if (pairSet.has(key)) continue;
  pairSet.add(key);
  uniquePairs.push({ productId, slug });
}

const byKind = { brand: 0, category: 0, keyword: 0 };
for (const { kind } of labelDefs.values()) byKind[kind]++;

console.log(`\nUnique labels: ${labelDefs.size}  (brand ${byKind.brand}, category ${byKind.category}, keyword ${byKind.keyword})`);
console.log(`Product→label pairs: ${uniquePairs.length}`);
console.log(`Avg labels / product: ${(uniquePairs.length / products.length).toFixed(1)}`);

// Sample.
const sample = products.slice(0, 5);
console.log("\n=== Sample ===");
for (const p of sample) {
  const its = uniquePairs.filter((x) => x.productId === p.id).map((x) => labelDefs.get(x.slug));
  console.log(`  ${p.name}`);
  console.log(`     ${its.map((l) => `${l.name}[${l.kind}]`).join(", ")}`);
}

if (!APPLY) {
  console.log("\nDry run — no writes. Re-run with --apply.");
  await client.end();
  process.exit(0);
}

// ------------------------------------------------------------------
// Apply
// ------------------------------------------------------------------
console.log("\nApplying…");

// 1) Upsert labels (insert-only on slug conflict).
const defs = [...labelDefs.entries()].map(([slug, d]) => ({ slug, name: d.name, kind: d.kind }));
const LB = 1000;
for (let i = 0; i < defs.length; i += LB) {
  const chunk = defs.slice(i, i + LB);
  const values = [];
  const params = [];
  chunk.forEach((d, j) => {
    const b = j * 3;
    values.push(`($${b + 1}, $${b + 2}, $${b + 3})`);
    params.push(d.name, d.slug, d.kind);
  });
  await client.query(
    `INSERT INTO labels (name, slug, kind) VALUES ${values.join(",")} ON CONFLICT (slug) DO NOTHING`,
    params
  );
}
console.log(`  labels upserted (${defs.length} defs)`);

// Resolve slug -> id for all needed slugs.
const idBySlug = new Map();
const allSlugs = defs.map((d) => d.slug);
for (let i = 0; i < allSlugs.length; i += LB) {
  const chunk = allSlugs.slice(i, i + LB);
  const { rows } = await client.query(`SELECT id, slug FROM labels WHERE slug = ANY($1)`, [chunk]);
  for (const r of rows) idBySlug.set(r.slug, r.id);
}

// 2) Bulk insert product_labels with the search trigger disabled.
await client.query("ALTER TABLE product_labels DISABLE TRIGGER trg_product_labels_search");
let inserted = 0;
const PB = 1000;
for (let i = 0; i < uniquePairs.length; i += PB) {
  const chunk = uniquePairs.slice(i, i + PB);
  const values = [];
  const params = [];
  let j = 0;
  for (const { productId, slug } of chunk) {
    const labelId = idBySlug.get(slug);
    if (!labelId) continue;
    const b = j * 2;
    values.push(`($${b + 1}, $${b + 2})`);
    params.push(productId, labelId);
    j++;
  }
  if (values.length) {
    await client.query(
      `INSERT INTO product_labels (product_id, label_id) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`,
      params
    );
    inserted += values.length;
  }
  if ((i / PB) % 10 === 0) console.log(`  pairs ...${Math.min(i + PB, uniquePairs.length)}/${uniquePairs.length}`);
}
await client.query("ALTER TABLE product_labels ENABLE TRIGGER trg_product_labels_search");
console.log(`  product_labels inserted (${inserted})`);

// 3) Recompute search_vector for every product that now has labels (set-based).
console.log("  recomputing search_vector…");
await client.query(`
  UPDATE products p SET search_vector =
    setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p.name_local, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce((SELECT name FROM categories WHERE id = p.category_id), '')), 'C') ||
    setweight(to_tsvector('english', coalesce((SELECT name FROM companies  WHERE id = p.supplier_id), '')), 'C') ||
    setweight(to_tsvector('english', coalesce((
      SELECT string_agg(l.name, ' ')
      FROM product_labels pl JOIN labels l ON l.id = pl.label_id
      WHERE pl.product_id = p.id
    ), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(p.hs_code, '')), 'D')
  WHERE EXISTS (SELECT 1 FROM product_labels pl WHERE pl.product_id = p.id)
`);

console.log("\nDone.");
await client.end();
