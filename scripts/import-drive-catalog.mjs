// Imports the full JCOR Drive catalog (136 brands, sheet_image_updates/original/*.csv)
// into Korean Beauty Trading Co.
//
// For each row (barcode, name_korean, name_english, volume, pcs_per_box, supply_price_usd):
//   - slug = slugify(english name) + "-" + last 8 digits of barcode
//   - if a product with that slug exists: update base_price, cogs, name_local, moq
//   - else: insert a new product with moderation_status='pending' (invisible on the
//     marketplace until an admin approves it — see src/app/marketplace/[id]/page.tsx)
//
// No markup is applied: base_price = cogs = supply_price_usd (see PLATFORM_MARKUP = 1.0).
//
// Run: node --env-file=.env scripts/import-drive-catalog.mjs

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

const SUPPLIER_SLUG = "korean-beauty-trading-co";
const BEAUTY_FACIAL_CATEGORY_ID = "a0000004-0001-0000-0000-000000000000";

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

function buildDescription(englishName, koreanName, barcode, volume, brand) {
  return [
    `${englishName}${koreanName ? ` (${koreanName})` : ""}`,
    "",
    `Brand: ${brand}`,
    `Origin: South Korea`,
    volume ? `Volume / size: ${volume}` : null,
    barcode ? `Barcode: ${barcode}` : null,
    "",
    "KFDA-registered. Ships EXW Incheon.",
  ].filter((l) => l !== null).join("\n");
}

// 1. Resolve supplier
const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();

if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found — run seed-korean-beauty.mjs first.`);
  process.exit(1);
}
const supplierId = company.id;
console.log(`[supplier] ${SUPPLIER_SLUG} -> ${supplierId}`);

// 2. Load every brand CSV
const files = readdirSync(CSV_DIR).filter((f) => f.endsWith("_original.csv"));
console.log(`[csv] ${files.length} brand files found\n`);

const seenSlugs = new Set();
const rows = []; // { slug, brand, englishName, koreanName, barcode, volume, pcsPerBox, priceCents }

for (const file of files) {
  const brand = file.replace(/_original\.csv$/, "");
  const text = readFileSync(join(CSV_DIR, file), "utf-8").replace(/^﻿/, "");
  const csvRows = parseCSV(text).slice(1); // skip header

  let brandCount = 0;
  for (const row of csvRows) {
    const [barcode, koreanName, englishName, volume, pcsPerBoxRaw, priceRaw] = row;
    if (!englishName || !barcode) continue;

    const price = parseFloat(priceRaw);
    if (isNaN(price) || price <= 0) continue;

    const barcodeTag = barcode.slice(-8);
    const slug = `${slugify(englishName)}-${barcodeTag}`;
    if (seenSlugs.has(slug)) continue; // dedupe within/across brand files
    seenSlugs.add(slug);

    const pcsPerBox = parseInt(pcsPerBoxRaw, 10) || 1;

    rows.push({
      slug,
      brand,
      englishName,
      koreanName: koreanName || null,
      barcode,
      volume: volume || null,
      pcsPerBox,
      priceCents: Math.round(price * 100),
    });
    brandCount++;
  }
  console.log(`  ${brand.padEnd(24)} ${brandCount} rows`);
}

console.log(`\n[build] ${rows.length} unique products across ${files.length} brands\n`);

// 3. Find which slugs already exist (update path) vs need insert
const existingBySlug = new Map(); // slug -> id
for (let i = 0; i < rows.length; i += 200) {
  const batch = rows.slice(i, i + 200).map((r) => r.slug);
  const { data: existing, error } = await admin
    .from("products")
    .select("id, slug")
    .in("slug", batch);
  if (error) { console.error(`  lookup error: ${error.message}`); continue; }
  for (const p of existing || []) existingBySlug.set(p.slug, p.id);
}

const toUpdate = rows.filter((r) => existingBySlug.has(r.slug));
const toInsert = rows.filter((r) => !existingBySlug.has(r.slug));
console.log(`[plan] ${toUpdate.length} updates, ${toInsert.length} inserts\n`);

// 4. Updates — refresh cogs/base_price/name_local/moq for existing SKUs
let updated = 0, updateFailed = 0;
for (const r of toUpdate) {
  const id = existingBySlug.get(r.slug);
  const { error } = await admin
    .from("products")
    .update({
      cogs: r.priceCents,
      base_price: r.priceCents,
      name_local: r.koreanName,
      moq: r.pcsPerBox,
      jan_code: r.barcode,
    })
    .eq("id", id);
  if (error) { updateFailed++; console.error(`  ✗ update ${r.slug}: ${error.message}`); }
  else updated++;
}
console.log(`[update] ${updated} ok, ${updateFailed} failed\n`);

// 5. Inserts — new products, pending moderation, no images yet
const BATCH = 100;
let inserted = 0, insertFailed = 0;
for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH);
  const payload = batch.map((r) => ({
    supplier_id: supplierId,
    category_id: BEAUTY_FACIAL_CATEGORY_ID,
    name: r.englishName,
    name_local: r.koreanName,
    slug: r.slug,
    description: buildDescription(r.englishName, r.koreanName, r.barcode, r.volume, r.brand),
    base_price: r.priceCents,
    cogs: r.priceCents,
    currency: "USD",
    moq: r.pcsPerBox,
    lead_time_days: 14,
    trade_term: "exw",
    hs_code: "3304.99",
    origin_country: "KR",
    jan_code: r.barcode,
    brand: r.brand,
    moderation_status: "pending",
    is_active: true,
    sample_available: true,
    sample_moq: 1,
  }));

  const { error } = await admin.from("products").insert(payload);
  if (error) { insertFailed += batch.length; console.error(`\n  ✗ insert batch ${i}: ${error.message}`); }
  else inserted += batch.length;
  process.stdout.write(`\r  insert progress: ${inserted + insertFailed}/${toInsert.length}`);
}

console.log(
  `\n\nDone — ${updated} updated, ${inserted} inserted (pending review), ` +
  `${updateFailed + insertFailed} failed.`
);
