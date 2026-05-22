// Seeds all K-beauty products from sheet_image_updates/ into Korean Beauty Trading Co.
// Sources: brand CSVs for product metadata + all_image_url_mapping.csv for images.
// Idempotent: skips products whose slug already exists.
//
// Run: node --env-file=.env scripts/seed-kbeauty-products.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET_DIR = join(__dirname, "..", "sheet_image_updates");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUPPLIER_SLUG = "korean-beauty-trading-co";
const BEAUTY_FACIAL_CATEGORY_ID = "a0000004-0001-0000-0000-000000000000";

// Brand name → CSV filename
const BRAND_FILES = {
  REJURAN: "REJURAN_updated.csv",
  medicube: "medicube_updated.csv",
  "Dr.Jart": "Dr.Jart_updated.csv",
  Centellian24: "Centellian24_updated.csv",
  Laneige: "Laneige_updated.csv",
  COSRX: "COSRX_updated.csv",
  VT: "VT_updated.csv",
  BeautyOfJoseon: "BeautyOfJoseon_updated.csv",
  ANUA: "ANUA_updated.csv",
};

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text) {
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .map(parseCSVLine);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Some brands put English in col B, Korean in col C (ANUA); most are reversed.
// Detect by reading the column-header row (CSV row index 1).
function detectColumnOrder(headerRow) {
  const b = (headerRow[1] || "").toLowerCase();
  if (b.includes("english")) return { englishCol: 1, koreanCol: 2 };
  return { englishCol: 2, koreanCol: 1 };
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
    "KFDA-registered. Ships FOB Incheon.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`Seeding K-beauty products into: ${URL}\n`);

// 1. Resolve Korean Beauty Trading Co
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
console.log(`[supplier] ${SUPPLIER_SLUG} → ${supplierId}\n`);

// 2. Load all brand CSVs into memory
const brandData = {};
for (const [brand, filename] of Object.entries(BRAND_FILES)) {
  const rows = parseCSV(readFileSync(join(SHEET_DIR, filename), "utf-8"));
  const { englishCol, koreanCol } = detectColumnOrder(rows[1] || []);
  brandData[brand] = { rows, englishCol, koreanCol };
  console.log(
    `  loaded ${brand.padEnd(14)} ${(rows.length - 2).toString().padStart(3)} data rows  ` +
    `(english→col${englishCol}, korean→col${koreanCol})`
  );
}

// 3. Parse image mapping (header at row 0; data starts at row 1)
// Columns: sheet, source_row, product_name, img1_url, img2_url, img3_url
const mappingRows = parseCSV(
  readFileSync(join(SHEET_DIR, "all_image_url_mapping.csv"), "utf-8")
).slice(1);
console.log(`\n[mapping] ${mappingRows.length} rows in all_image_url_mapping.csv`);

// 4. Build deduplicated product list
//    Dedup key = barcode (or "sheet::englishName" when barcode is absent)
const seenKeys = new Set();
const products = [];

for (const row of mappingRows) {
  const [sheet, source_row_str, , img1_url, img2_url, img3_url] = row;
  if (!sheet) continue;

  const brand = brandData[sheet];
  if (!brand) { console.warn(`  ⚠ Unknown sheet "${sheet}" — skipping`); continue; }

  const rowIndex = parseInt(source_row_str, 10) - 1; // mapping source_row is 1-indexed
  const dataRow = brand.rows[rowIndex];
  if (!dataRow) continue;

  const barcode = (dataRow[0] || "").replace(/\s/g, "");
  const englishName = (dataRow[brand.englishCol] || "").trim();
  const koreanName = (dataRow[brand.koreanCol] || "").trim();
  const volume = (dataRow[3] || "").trim();
  const pcsPerBox = parseInt(dataRow[4], 10) || 1;

  if (!englishName) continue;

  const dedupeKey = barcode || `${sheet}::${englishName}`;
  if (seenKeys.has(dedupeKey)) continue;
  seenKeys.add(dedupeKey);

  const images = [img1_url, img2_url, img3_url].filter(
    (u) => u && (u.startsWith("http://") || u.startsWith("https://"))
  );

  const barcodeTag = barcode.slice(-8) || Math.random().toString(36).slice(2, 7);
  const slug = `${slugify(englishName)}-${barcodeTag}`;

  products.push({
    supplier_id: supplierId,
    category_id: BEAUTY_FACIAL_CATEGORY_ID,
    name: englishName,
    name_local: koreanName || null,
    slug,
    description: buildDescription(englishName, koreanName, barcode, volume, sheet),
    base_price: 0,
    currency: "USD",
    moq: pcsPerBox,
    lead_time_days: 14,
    trade_term: "fob",
    hs_code: "3304.99",
    origin_country: "KR",
    moderation_status: "approved",
    sample_available: true,
    sample_moq: 1,
    _images: images,
  });
}

console.log(`\n[build] ${products.length} unique products`);

// 5. Skip slugs that already exist
const existingSlugs = new Set();
for (let i = 0; i < products.length; i += 100) {
  const slugBatch = products.slice(i, i + 100).map((p) => p.slug);
  const { data: existing } = await admin
    .from("products")
    .select("slug")
    .in("slug", slugBatch);
  (existing || []).forEach((r) => existingSlugs.add(r.slug));
}

const toInsert = products.filter((p) => !existingSlugs.has(p.slug));
console.log(
  `  ${existingSlugs.size} already seeded — inserting ${toInsert.length} new\n`
);

// 6. Batch insert products + images (50 per batch)
const BATCH = 50;
let inserted = 0;
let imagesFailed = 0;

for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH);
  const rows = batch.map(({ _images, ...p }) => p);

  const { data: created, error } = await admin
    .from("products")
    .insert(rows)
    .select("id, slug");

  if (error) {
    console.error(`\n  ✗ product batch ${i}–${i + BATCH}: ${error.message}`);
    continue;
  }

  // Insert images for this batch
  const imageRows = [];
  for (const prod of created) {
    const src = batch.find((p) => p.slug === prod.slug);
    if (!src) continue;
    src._images.forEach((url, idx) => {
      imageRows.push({
        product_id: prod.id,
        url,
        alt_text: src.name,
        sort_order: idx,
        is_primary: idx === 0,
      });
    });
  }

  if (imageRows.length > 0) {
    const { error: imgErr } = await admin.from("product_images").insert(imageRows);
    if (imgErr) { imagesFailed++; console.error(`\n  ⚠ images: ${imgErr.message}`); }
  }

  inserted += created.length;
  process.stdout.write(`\r  progress: ${inserted}/${toInsert.length} products`);
}

console.log(
  `\n\nDone — ${inserted} products inserted` +
  (imagesFailed > 0 ? `, ${imagesFailed} image batch(es) failed` : ", all images OK") +
  "."
);
