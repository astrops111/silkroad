// Updates base_price (and jan_code) for ANUA products seeded by seed-kbeauty-products.mjs.
// CSV col F (index 5) is the USD price; stored as BIGINT cents in the DB.
// Matches products by slug, computed with the same logic as the seed script.
//
// Run: node --env-file=.env scripts/update-anua-prices.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "sheet_image_updates", "ANUA_updated.csv");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CSV parser (matches seed script exactly) ──────────────────────────────────
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

// ── Slug logic (identical to seed script) ─────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));

// Row 1 (index 1) is the header: col B = "Product name (English)"
// ANUA has english in col 1 (same detectColumnOrder logic as seed script)
const ENGLISH_COL = 1;

// Data rows start at index 2 (row 3 in spreadsheet)
const updates = [];

for (const row of rows.slice(2)) {
  const barcode = (row[0] || "").replace(/\s/g, "");
  const englishName = (row[ENGLISH_COL] || "").trim();
  const priceRaw = (row[5] || "").trim();

  if (!englishName || !priceRaw || isNaN(Number(priceRaw))) continue;

  const priceUSD = Number(priceRaw);
  const basePriceCents = Math.round(priceUSD * 100);

  const barcodeTag = barcode.slice(-8);
  if (!barcodeTag) {
    console.warn(`  ⚠ no barcode for "${englishName}" — skipping`);
    continue;
  }

  const slug = `${slugify(englishName)}-${barcodeTag}`;

  updates.push({ slug, basePriceCents, barcode, englishName });
}

console.log(`Parsed ${updates.length} ANUA products from CSV\n`);

let ok = 0;
let notFound = 0;
let failed = 0;

for (const { slug, basePriceCents, barcode, englishName } of updates) {
  const { data, error } = await admin
    .from("products")
    .update({ base_price: basePriceCents, jan_code: barcode })
    .eq("slug", slug)
    .select("id, slug");

  if (error) {
    console.error(`  ✗ ${slug}: ${error.message}`);
    failed++;
  } else if (!data || data.length === 0) {
    console.warn(`  ? not found: ${slug}`);
    notFound++;
  } else {
    console.log(`  ✓ $${(basePriceCents / 100).toFixed(2)}  ${englishName}`);
    ok++;
  }
}

console.log(`\nDone — ${ok} updated, ${notFound} not found, ${failed} errors.`);
if (notFound > 0) {
  console.log("  (Not-found products may not have been seeded yet — run seed-kbeauty-products.mjs first)");
}
