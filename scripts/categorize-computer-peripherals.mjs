// Split the 131 Logitech products sitting in the generic Consumer Electronics
// > Computer Peripherals bucket into the new leaf subcategories added by
// 00115_computer_peripherals_expansion.sql (mice, keyboards, webcams, ...),
// and tag each product with its "Use" (Gaming / Business / Education /
// Streaming / Home) — the new use_case label kind from the same migration.
//
// Category assignment: keyword rules, first match wins (order matters — e.g.
// "combo" must resolve before the generic mouse/keyboard rules).
// Use-case tagging: independent boolean rules, a product can get 0+ tags;
// falls back to "Home / Personal" when nothing more specific matched.
//
// Dry run (default): prints the full classification report, writes nothing.
// Run:      node --env-file=.env scripts/categorize-computer-peripherals.mjs
// Apply:    node --env-file=.env scripts/categorize-computer-peripherals.mjs --apply

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APPLY = process.argv.includes("--apply");
const SOURCE_CATEGORY_ID = "3f9827ab-adcc-42a0-a0ca-4867916de07b"; // Consumer Electronics > Computer Peripherals

const CATEGORY_RULES = [
  ["peripherals-combos", /\bcombo\b/i],
  ["peripherals-mousepads", /mouse\s*pad/i],
  ["peripherals-presenters", /\bpresenter\b/i],
  ["peripherals-gaming-controllers", /racing\s*wheel|driving\s*force|\bshifter\b/i],
  ["peripherals-webcams", /\bwebcam\b/i],
  ["peripherals-headsets", /\bheadset\b|\bearphones?\b/i],
  ["peripherals-speakers", /\bspeakers?\b/i],
  // Logitech's premium lines don't say "mouse"/"keyboard" in the name
  // (e.g. "MX Master 3S for Business", "MX Keys Mini for Business").
  ["peripherals-mice", /\bmx\s*master\b/i],
  ["peripherals-keyboards", /\bmx\s*keys\b/i],
  ["peripherals-keyboards", /\bkeyboard\b/i],
  ["peripherals-mice", /\bmouse\b|\btrackball\b/i],
];

const USE_CASE_RULES = [
  ["gaming", /\bgaming\b|racing\s*wheel|driving\s*force|\bshifter\b/i],
  ["business-office", /for\s*business\b/i],
  ["education", /\beducation\b/i],
  ["streaming-content-creation", /\bstreaming\b/i],
];

function classifyCategory(name) {
  for (const [slug, re] of CATEGORY_RULES) {
    if (re.test(name)) return slug;
  }
  return null;
}

function classifyUseCases(name) {
  const tags = USE_CASE_RULES.filter(([, re]) => re.test(name)).map(([slug]) => slug);
  if (tags.length === 0) tags.push("home-personal");
  return tags;
}

async function main() {
  const { data: cats, error: catErr } = await admin
    .from("categories")
    .select("id, slug")
    .eq("parent_id", SOURCE_CATEGORY_ID)
    .eq("level", 2);
  if (catErr) throw new Error(catErr.message);
  const categoryIdBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  for (const [slug] of CATEGORY_RULES) {
    if (!categoryIdBySlug[slug]) throw new Error(`Category slug not found: ${slug} — did migration 00115 apply?`);
  }

  const { data: labels, error: labelErr } = await admin
    .from("labels")
    .select("id, slug")
    .eq("kind", "use_case");
  if (labelErr) throw new Error(labelErr.message);
  const labelIdBySlug = Object.fromEntries(labels.map((l) => [l.slug, l.id]));
  for (const [slug] of USE_CASE_RULES) {
    if (!labelIdBySlug[slug]) throw new Error(`use_case label not found: ${slug} — did migration 00115 apply?`);
  }
  if (!labelIdBySlug["home-personal"]) throw new Error("use_case label not found: home-personal");

  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id, name")
    .eq("category_id", SOURCE_CATEGORY_ID)
    .is("merged_into_product_id", null);
  if (prodErr) throw new Error(prodErr.message);
  console.log(`Fetched ${products.length} products currently in Computer Peripherals.\n`);

  const categoryBuckets = new Map(); // slug -> product ids
  const unmatchedCategory = [];
  const useCasePairs = []; // { productId, slug }
  const useCaseCounts = {};

  for (const p of products) {
    const catSlug = classifyCategory(p.name);
    if (catSlug) {
      if (!categoryBuckets.has(catSlug)) categoryBuckets.set(catSlug, []);
      categoryBuckets.get(catSlug).push(p.id);
    } else {
      unmatchedCategory.push(p);
    }

    for (const useSlug of classifyUseCases(p.name)) {
      useCasePairs.push({ productId: p.id, slug: useSlug });
      useCaseCounts[useSlug] = (useCaseCounts[useSlug] ?? 0) + 1;
    }
  }

  console.log("=== Category classification ===");
  for (const [slug, ids] of [...categoryBuckets.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${slug.padEnd(32)} ${ids.length}`);
  }
  console.log(`  ${"UNMATCHED (left as-is)".padEnd(32)} ${unmatchedCategory.length}`);
  console.log(`  ${"TOTAL".padEnd(32)} ${products.length}\n`);
  if (unmatchedCategory.length > 0) {
    console.log("Unmatched product names:");
    console.log(unmatchedCategory.map((p) => `  - ${p.name}`).join("\n"));
    console.log("");
  }

  console.log("=== Use-case tagging ===");
  for (const [slug, count] of Object.entries(useCaseCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug.padEnd(32)} ${count}`);
  }
  console.log(`  product→use-case pairs: ${useCasePairs.length} (avg ${(useCasePairs.length / products.length).toFixed(2)}/product)\n`);

  if (!APPLY) {
    console.log("Dry run only — no writes made. Re-run with --apply to write category_id + product_labels.");
    return;
  }

  console.log("Applying category_id updates...");
  const BATCH = 500;
  for (const [slug, ids] of categoryBuckets.entries()) {
    const categoryId = categoryIdBySlug[slug];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      const { error } = await admin
        .from("products")
        .update({ category_id: categoryId, updated_at: new Date().toISOString() })
        .in("id", chunk);
      if (error) console.error(`  FAILED batch for ${slug}: ${error.message}`);
      else console.log(`  ${slug}: updated ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
    }
  }

  // product_labels needs a direct pg connection so the search_vector trigger
  // can be disabled during the bulk insert (same pattern as
  // backfill-product-labels.mjs), then recomputed set-based at the end.
  const DB_URL = process.env.DATABASE_URL;
  if (!DB_URL) throw new Error("Missing DATABASE_URL in .env — needed for product_labels bulk insert.");
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("\nApplying use-case product_labels...");
  await client.query("ALTER TABLE product_labels DISABLE TRIGGER trg_product_labels_search");
  let inserted = 0;
  for (let i = 0; i < useCasePairs.length; i += BATCH) {
    const chunk = useCasePairs.slice(i, i + BATCH);
    const values = [];
    const params = [];
    chunk.forEach(({ productId, slug }, j) => {
      const b = j * 2;
      values.push(`($${b + 1}, $${b + 2})`);
      params.push(productId, labelIdBySlug[slug]);
    });
    await client.query(
      `INSERT INTO product_labels (product_id, label_id) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`,
      params
    );
    inserted += chunk.length;
  }
  await client.query("ALTER TABLE product_labels ENABLE TRIGGER trg_product_labels_search");
  console.log(`  product_labels inserted: ${inserted}`);

  console.log("  recomputing search_vector for affected products...");
  const productIds = [...new Set(useCasePairs.map((p) => p.productId))];
  await client.query(
    `UPDATE products p SET search_vector =
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
    WHERE p.id = ANY($1)`,
    [productIds]
  );

  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
