// Updates base_price (and jan_code) for all K-beauty products from sheet_image_updates/ CSVs.
// Detects the price column automatically: it is the first column after the English name
// column whose data values are consistently decimal floats in the range 0.5–500.
// Matches products by slug (barcode-based). Falls back to exact name match when barcode
// is absent from a row.
//
// Run: node --env-file=.env scripts/update-all-prices.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET_DIR = join(__dirname, "..", "sheet_image_updates");

const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(DB_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BRAND_FILES = {
  REJURAN:        "REJURAN_updated.csv",
  medicube:       "medicube_updated.csv",
  "Dr.Jart":      "Dr.Jart_updated.csv",
  Centellian24:   "Centellian24_updated.csv",
  Laneige:        "Laneige_updated.csv",
  COSRX:          "COSRX_updated.csv",
  VT:             "VT_updated.csv",
  BeautyOfJoseon: "BeautyOfJoseon_updated.csv",
  ANUA:           "ANUA_updated.csv",
};

// ── CSV parser ─────────────────────────────────────────────────────────────────
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

// Slug logic must match seed-kbeauty-products.mjs exactly
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Scan header row (row index 1) for the column that mentions "english"
function detectEnglishCol(headerRow) {
  for (let i = 0; i < headerRow.length; i++) {
    if ((headerRow[i] || "").toLowerCase().includes("english")) return i;
  }
  return 2; // safe fallback for most brands
}

// Find the price column: first col after englishCol whose data rows consistently
// contain decimal floats in the 0.5–500 USD range. MOQ values are always integers,
// so requiring a "." in the raw string reliably discriminates price from MOQ.
function detectPriceCol(rows, englishCol) {
  const dataRows = rows
    .slice(2)
    .filter((r) => (r[0] || "").replace(/\s/g, "").length > 0 || (r[englishCol] || "").length > 0)
    .slice(0, 12);

  for (let col = englishCol + 1; col < englishCol + 14; col++) {
    let decimalCount = 0;
    let total = 0;
    for (const row of dataRows) {
      const raw = (row[col] || "").trim();
      if (!raw || raw === "-" || raw === "0" || raw === "○" || raw === "x") continue;
      const clean = raw.replace(/[₩$,\s]/g, "");
      if (!/^\d/.test(clean)) continue; // must start with digit
      total++;
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0.5 && num < 500 && clean.includes(".")) {
        decimalCount++;
      }
    }
    if (total >= 3 && decimalCount / total >= 0.7) return col;
  }
  return -1;
}

// ── Main ───────────────────────────────────────────────────────────────────────
let grandOk = 0;
let grandNotFound = 0;
let grandSkipped = 0;
let grandFailed = 0;

for (const [brand, filename] of Object.entries(BRAND_FILES)) {
  const rows = parseCSV(readFileSync(join(SHEET_DIR, filename), "utf-8"));
  const englishCol = detectEnglishCol(rows[1] || []);
  const priceCol = detectPriceCol(rows, englishCol);

  if (priceCol === -1) {
    console.warn(`\n[${brand}] ⚠  Could not auto-detect price column — skipping`);
    continue;
  }

  console.log(`\n[${brand}]  english→col${englishCol}  price→col${priceCol}`);

  let ok = 0, notFound = 0, skipped = 0, failed = 0;

  for (const row of rows.slice(2)) {
    const barcode     = (row[0] || "").replace(/\s/g, "");
    const englishName = (row[englishCol] || "").trim();
    const priceRaw    = (row[priceCol]   || "").trim().replace(/[,\s]/g, "");

    if (!englishName) continue;

    const priceUSD = parseFloat(priceRaw);
    if (!priceRaw || isNaN(priceUSD) || priceUSD <= 0) {
      skipped++;
      continue;
    }

    const basePriceCents = Math.round(priceUSD * 100);
    const dbUpdate = { base_price: basePriceCents };
    if (barcode) dbUpdate.jan_code = barcode;

    let matched = false;

    // Primary: match by deterministic slug (last 8 digits of barcode)
    if (barcode) {
      const barcodeTag = barcode.slice(-8);
      const slug = `${slugify(englishName)}-${barcodeTag}`;

      const { data, error } = await admin
        .from("products")
        .update(dbUpdate)
        .eq("slug", slug)
        .select("id");

      if (error) {
        console.error(`  ✗ [slug] ${slug}: ${error.message}`);
        failed++;
        continue;
      }
      if (data && data.length > 0) {
        matched = true;
        ok++;
      }
    }

    // Fallback: exact name match (handles rows without barcodes)
    if (!matched) {
      const { data, error } = await admin
        .from("products")
        .update(dbUpdate)
        .eq("name", englishName)
        .select("id");

      if (error) {
        console.error(`  ✗ [name] "${englishName}": ${error.message}`);
        failed++;
      } else if (!data || data.length === 0) {
        console.warn(`  ? not found: ${englishName}`);
        notFound++;
      } else {
        ok += data.length;
      }
    }
  }

  console.log(`  → ${ok} updated, ${notFound} not found, ${skipped} skipped (no price), ${failed} errors`);
  grandOk        += ok;
  grandNotFound  += notFound;
  grandSkipped   += skipped;
  grandFailed    += failed;
}

console.log("\n═══════════════════════════════════════════════════════");
console.log(`Grand total: ${grandOk} updated, ${grandNotFound} not found, ${grandSkipped} skipped, ${grandFailed} errors`);
if (grandNotFound > 0) {
  console.log("  (Not-found products may not have been seeded yet — run seed-kbeauty-products.mjs first)");
}
