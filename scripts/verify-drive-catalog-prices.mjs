// Read-only check: compares products.base_price / cogs in the DB against the
// JCOR Drive catalog CSVs (sheet_image_updates/original/*.csv) that
// import-drive-catalog.mjs is supposed to have applied. Reports any mismatches,
// missing products, and rows still pending moderation.
//
// Run: node --env-file=.env scripts/verify-drive-catalog-prices.mjs

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_DIR = join(__dirname, "..", "sheet_image_updates", "original");

const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(DB_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCSVLine(line) {
  const fields = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
    else current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text) {
  return text.split("\n").filter((l) => l.length > 0).map((l) => l.replace(/\r$/, "")).map(parseCSVLine);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// 1. Load every brand CSV (same logic as import-drive-catalog.mjs)
const files = readdirSync(CSV_DIR).filter((f) => f.endsWith("_original.csv"));
const seenSlugs = new Set();
const sheetRows = new Map(); // slug -> { brand, priceCents, pcsPerBox, koreanName, barcode }

for (const file of files) {
  const brand = file.replace(/_original\.csv$/, "");
  const text = readFileSync(join(CSV_DIR, file), "utf-8").replace(/^﻿/, "");
  const csvRows = parseCSV(text).slice(1);

  for (const row of csvRows) {
    const [barcode, koreanName, englishName, volume, pcsPerBoxRaw, priceRaw] = row;
    if (!englishName || !barcode) continue;

    const price = parseFloat(priceRaw);
    if (isNaN(price) || price <= 0) continue;

    const barcodeTag = barcode.slice(-8);
    const slug = `${slugify(englishName)}-${barcodeTag}`;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    sheetRows.set(slug, {
      brand,
      englishName,
      priceCents: Math.round(price * 100),
      pcsPerBox: parseInt(pcsPerBoxRaw, 10) || 1,
      koreanName: koreanName || null,
      barcode,
    });
  }
}

console.log(`[sheet] ${sheetRows.size} unique products across ${files.length} brand files\n`);

// 2. Pull matching products from the DB in batches
const slugs = [...sheetRows.keys()];
const dbBySlug = new Map();
for (let i = 0; i < slugs.length; i += 200) {
  const batch = slugs.slice(i, i + 200);
  const { data, error } = await admin
    .from("products")
    .select("id, slug, base_price, cogs, moq, name_local, jan_code, moderation_status, is_active")
    .in("slug", batch);
  if (error) { console.error(`  lookup error: ${error.message}`); continue; }
  for (const p of data || []) dbBySlug.set(p.slug, p);
}

// 3. Compare
let matchOk = 0;
let priceMismatch = 0;
let missing = 0;
let pending = 0;
const mismatches = [];

for (const [slug, sheet] of sheetRows) {
  const db = dbBySlug.get(slug);
  if (!db) { missing++; continue; }
  if (db.moderation_status === "pending") pending++;

  if (db.base_price !== sheet.priceCents || db.cogs !== sheet.priceCents) {
    priceMismatch++;
    mismatches.push({
      slug,
      brand: sheet.brand,
      name: sheet.englishName,
      sheetPriceCents: sheet.priceCents,
      dbBasePrice: db.base_price,
      dbCogs: db.cogs,
    });
  } else {
    matchOk++;
  }
}

console.log(`[compare] ${matchOk} match, ${priceMismatch} price mismatch, ${missing} missing from DB, ${pending} still pending moderation\n`);

if (mismatches.length > 0) {
  console.log(`First ${Math.min(30, mismatches.length)} mismatches:`);
  for (const m of mismatches.slice(0, 30)) {
    console.log(
      `  ${m.brand.padEnd(20)} ${m.slug.padEnd(50)} sheet=$${(m.sheetPriceCents / 100).toFixed(2)}` +
      ` db.base_price=$${(m.dbBasePrice / 100).toFixed(2)} db.cogs=$${(m.dbCogs / 100).toFixed(2)}`
    );
  }
}
