// Backfills product_images for products that have zero images, using
// sheet_image_updates/img_missing.csv (columns: barcode, name_english,
// name_korean, url) matched against products.name by exact (case-
// normalized) match. There is no barcode column on products, so name is
// the only reliable join key. Skips any product that already has an
// image row (idempotent / safe to re-run), matching the existing
// insert-product-images.mjs convention (one primary image per product).
//
// Dry run (default): prints the match report, writes nothing.
// Run:      node --env-file=.env scripts/backfill-missing-images.mjs
// Apply:    node --env-file=.env scripts/backfill-missing-images.mjs --apply

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

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
const CSV_PATH = "sheet_image_updates/img_missing.csv";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = [];
  for (const line of lines.slice(1)) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

async function fetchAllProducts() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await admin
      .from("products")
      .select("id, name")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchProductIdsWithImages() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await admin
      .from("product_images")
      .select("product_id")
      .order("product_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return new Set(all.map((r) => r.product_id));
}

async function main() {
  const csvText = readFileSync(CSV_PATH, "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(csvText);
  // name_english (case-normalized) -> url; first occurrence wins on duplicates.
  const nameToUrl = new Map();
  for (const [, nameEnglish, , url] of rows) {
    const key = (nameEnglish ?? "").trim().toLowerCase();
    const cleanUrl = (url ?? "").trim();
    if (!key || !cleanUrl) continue;
    if (!nameToUrl.has(key)) nameToUrl.set(key, cleanUrl);
  }
  console.log(`CSV rows: ${rows.length}, distinct usable name->url entries: ${nameToUrl.size}`);

  const [products, productsWithImages] = await Promise.all([
    fetchAllProducts(),
    fetchProductIdsWithImages(),
  ]);
  console.log(`Total products: ${products.length}, already have an image: ${productsWithImages.size}`);

  const toInsert = [];
  for (const p of products) {
    if (productsWithImages.has(p.id)) continue;
    const key = (p.name ?? "").trim().toLowerCase();
    const url = nameToUrl.get(key);
    if (!url) continue;
    toInsert.push({
      product_id: p.id,
      url,
      alt_text: p.name,
      sort_order: 0,
      is_primary: true,
    });
  }

  console.log(`\nProducts to backfill an image for: ${toInsert.length}`);
  console.log("Sample:");
  console.log(toInsert.slice(0, 5).map((r) => `  ${r.alt_text} -> ${r.url}`).join("\n"));

  if (!APPLY) {
    console.log("\nDry run only — no writes made. Re-run with --apply to insert image rows.");
    return;
  }

  console.log("\nInserting in batches of 500...");
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const { error } = await admin.from("product_images").insert(chunk);
    if (error) {
      console.error(`  FAILED batch [${i}-${i + chunk.length}]: ${error.message}`);
    } else {
      console.log(`  inserted ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}`);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
