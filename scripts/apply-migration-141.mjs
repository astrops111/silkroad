// Apply migration 00141_listing_perf_indexes_and_facet_rpcs.sql to the live
// Supabase via DATABASE_URL (service-role Postgres), same pattern as
// apply-migration-140.mjs. Then smoke-tests every new RPC and prints
// EXPLAIN for the default marketplace listing so the new partial index is
// visibly in use.
//
// Run: node --env-file=.env scripts/apply-migration-141.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const FILE = "00141_listing_perf_indexes_and_facet_rpcs.sql";
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

const time = async (label, fn) => {
  const t0 = performance.now();
  const out = await fn();
  console.log(`  ${label}: ${(performance.now() - t0).toFixed(0)} ms`);
  return out;
};

console.log("\nIndexes created:");
const { rows: idx } = await client.query(`
  SELECT indexname, tablename FROM pg_indexes
  WHERE indexname IN (
    'idx_products_live_name','idx_products_live_lower_name','idx_products_live_price',
    'idx_products_live_created','idx_products_live_category_name','idx_products_brand',
    'idx_products_origin_country','idx_products_supplier_active','idx_products_name_trgm',
    'idx_companies_name_trgm','idx_po_buyer_user_created','idx_po_order_number_trgm',
    'idx_trade_flows_updated_at','idx_companies_type_created',
    'idx_reviews_supplier_visible_created','idx_product_labels_product'
  ) ORDER BY tablename, indexname
`);
console.log(idx.map((r) => `  ${r.tablename}.${r.indexname}`).join("\n"));

console.log("\nRPC smoke tests:");
const cat = await time("marketplace_facet_counts(category)", () =>
  client.query(`SELECT * FROM marketplace_facet_counts('category')`)
);
console.log(`    → ${cat.rows.length} categories, ${cat.rows.reduce((s, r) => s + Number(r.n), 0)} products`);

const brand = await time("marketplace_facet_counts(brand)", () =>
  client.query(`SELECT * FROM marketplace_facet_counts('brand')`)
);
console.log(`    → ${brand.rows.length} brands`);

const country = await time("marketplace_facet_counts(country)", () =>
  client.query(`SELECT * FROM marketplace_facet_counts('country')`)
);
console.log(`    → ${country.rows.map((r) => `${r.key}=${r.n}`).join(", ")}`);

const uc = await time("marketplace_facet_counts(use_case)", () =>
  client.query(`SELECT * FROM marketplace_facet_counts('use_case')`)
);
console.log(`    → ${uc.rows.length} use-case labels`);

const scoped = await time("marketplace_facet_counts(brand, KR)", () =>
  client.query(`SELECT * FROM marketplace_facet_counts('brand', NULL, ARRAY['KR'])`)
);
console.log(`    → ${scoped.rows.length} brands from KR`);

const pool = await time("marketplace_pooling_facets()", () =>
  client.query(`SELECT * FROM marketplace_pooling_facets()`)
);
console.log(`    → ${pool.rows.length} active groups`);

const ids = await time("search_product_ids(name sort, page 1)", () =>
  client.query(`SELECT * FROM search_product_ids(p_sort => 'name', p_limit => 50)`)
);
console.log(`    → ${ids.rows.length} ids, total ${ids.rows[0]?.total_count ?? 0}`);

const ucSearch = await time("search_product_ids(use_case=gaming)", () =>
  client.query(`SELECT * FROM search_product_ids(p_use_case_slugs => ARRAY['gaming'], p_limit => 5)`)
);
console.log(`    → ${ucSearch.rows.length} ids, total ${ucSearch.rows[0]?.total_count ?? 0}`);

const spc = await time("supplier_product_counts(top 5 suppliers)", () =>
  client.query(`
    SELECT * FROM supplier_product_counts(
      (SELECT array_agg(id) FROM (SELECT id FROM companies WHERE type='supplier' LIMIT 5) s)
    )`)
);
console.log(`    → ${spc.rows.length} rows`);

const rs = await time("supplier_review_stats(any supplier)", () =>
  client.query(`
    SELECT * FROM supplier_review_stats(
      (SELECT supplier_company_id FROM reviews LIMIT 1)
    )`)
);
console.log(`    → ${JSON.stringify(rs.rows[0])}`);

console.log("\nEXPLAIN — default marketplace listing (approved+active, ORDER BY name, LIMIT 50):");
const { rows: plan } = await client.query(`
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT id FROM products
  WHERE moderation_status = 'approved' AND is_active = true
  ORDER BY name ASC LIMIT 50 OFFSET 0
`);
console.log(plan.map((r) => "  " + r["QUERY PLAN"]).join("\n"));

console.log("\nEXPLAIN — ilike name search:");
const { rows: plan2 } = await client.query(`
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT id FROM products
  WHERE moderation_status = 'approved' AND is_active = true AND name ILIKE '%serum%'
  ORDER BY name ASC LIMIT 50
`);
console.log(plan2.map((r) => "  " + r["QUERY PLAN"]).join("\n"));

await client.end();
console.log("\nDone.");
