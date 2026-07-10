// Syncs all product fields from sheet_image_updates/ CSVs to the database.
// Covers all 9 K-beauty brands. Column positions are auto-detected per brand.
//
// Fields written per product:
//   description             ← built from name, Korean name, volume, brand, barcode, MOQ
//   cogs                    ← supply price from ANUA order sheet (ANUA only); else detected price col (USD × 100 → cents)
//   base_price              ← cogs, no markup (displayed price = actual cost)
//   box_pack_qty            ← col immediately before price col (integer-validated); moq = 10 × that (10-box minimum)
//   jan_code                ← col 0 barcode
//   name_local              ← Korean name column
//   brand                   ← brand key
//   origin_country          ← "KR"
//   trade_term              ← "fob"
//   legal_category          ← "cosmetic"
//   hs_code                 ← "3304.99"
//   shipping_mode           ← "either"
//   allow_mix_shipping      ← true
//   min_order_amount        ← 1000000 (cents = $10,000)
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

// Supply-price sheet for ANUA (separate Google Sheet with actual cost/COGS data).
// Col 0 = barcode, col 5 = Supply price_USD
const ANUA_SUPPLY_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yfbMNvuZZiEyhIxZN0j6yacmw0-3K9ck/export?format=csv";

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

// ── Slug logic — must match seed-kbeauty-products.mjs exactly ─────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Column detectors ───────────────────────────────────────────────────────────

function detectEnglishCol(headerRow) {
  for (let i = 0; i < headerRow.length; i++) {
    if ((headerRow[i] || "").toLowerCase().includes("english")) return i;
  }
  return 2;
}

function detectKoreanCol(headerRow) {
  for (let i = 0; i < headerRow.length; i++) {
    const h = (headerRow[i] || "").toLowerCase();
    if (h.includes("korean") || h.includes("korea")) return i;
  }
  return null;
}

// First col after englishCol with consistently decimal USD values
function detectPriceCol(rows, englishCol) {
  const dataRows = rows
    .slice(2)
    .filter((r) => (r[0] || "").replace(/\s/g, "").length > 0 || (r[englishCol] || "").length > 0)
    .slice(0, 12);

  for (let col = englishCol + 1; col < englishCol + 14; col++) {
    let decimalCount = 0, total = 0;
    for (const row of dataRows) {
      const raw = (row[col] || "").trim();
      if (!raw || raw === "-" || raw === "0" || raw === "○" || raw === "x") continue;
      const clean = raw.replace(/[₩$,\s]/g, "");
      if (!/^\d/.test(clean)) continue;
      total++;
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0.5 && num < 500 && clean.includes(".")) decimalCount++;
    }
    if (total >= 3 && decimalCount / total >= 0.7) return col;
  }
  return -1;
}

// Column immediately before priceCol — valid only if it holds plain positive integers
function detectMoqCol(rows, priceCol) {
  const candidate = priceCol - 1;
  if (candidate < 1) return null;

  const dataRows = rows
    .slice(2)
    .filter((r) => (r[0] || "").replace(/\s/g, "").length > 0)
    .slice(0, 12);

  let intCount = 0, total = 0;
  for (const row of dataRows) {
    const raw = (row[candidate] || "").replace(/[,\s]/g, "");
    if (!raw || raw === "-") continue;
    total++;
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num < 10000 && String(Math.round(num)) === raw) intCount++;
  }

  return total >= 2 && intCount / total >= 0.75 ? candidate : null;
}

// Volume col: one before moqCol, but only when moqCol >= 4
// (if moqCol is 3 the name cols occupy 1-2 and there's no separate volume col)
function detectVolumeCol(moqCol) {
  return moqCol != null && moqCol >= 4 ? moqCol - 1 : null;
}

// ── Description builder ────────────────────────────────────────────────────────
function buildDescription({ englishName, koreanName, volume, barcode, brand, moqQty }) {
  const lines = [
    englishName,
    koreanName || null,
    "",
    `Brand: ${brand}`,
    `Origin: South Korea`,
    volume          ? `Volume / Size: ${volume}`                    : null,
    moqQty          ? `Min. Order Qty: ${moqQty} pcs per carton`   : null,
    barcode         ? `Barcode / JAN: ${barcode}`                   : null,
    "",
    "KFDA-registered cosmetic. Ships FOB Incheon.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

// ── Load ANUA supply prices (actual COGS from purchase-order sheet) ───────────
const anuaSupplyPrices = new Map(); // barcode → cents
try {
  console.log("[supply-prices] fetching ANUA supply price sheet…");
  const res = await fetch(ANUA_SUPPLY_SHEET_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  for (const row of parseCSV(text).slice(1)) {
    const barcode     = (row[0] || "").replace(/\s/g, "");
    const supplyPrice = parseFloat((row[5] || "").replace(/[,\s]/g, ""));
    if (barcode && !isNaN(supplyPrice) && supplyPrice > 0) {
      anuaSupplyPrices.set(barcode, Math.round(supplyPrice * 100));
    }
  }
  console.log(`[supply-prices] loaded ${anuaSupplyPrices.size} ANUA COGS entries\n`);
} catch (e) {
  console.warn(`[supply-prices] could not fetch ANUA supply prices (${e.message}) — cogs will equal base_price\n`);
}

// ── Main loop ──────────────────────────────────────────────────────────────────
let grandOk = 0, grandNotFound = 0, grandSkipped = 0, grandFailed = 0;

for (const [brand, filename] of Object.entries(BRAND_FILES)) {
  let rows;
  try {
    rows = parseCSV(readFileSync(join(SHEET_DIR, filename), "utf-8"));
  } catch (e) {
    console.error(`\n[${brand}] ✗ Cannot read ${filename}: ${e.message}`);
    continue;
  }

  const headerRow  = rows[1] || [];
  const englishCol = detectEnglishCol(headerRow);
  const koreanCol  = detectKoreanCol(headerRow);
  const priceCol   = detectPriceCol(rows, englishCol);
  const moqCol     = detectMoqCol(rows, priceCol);
  const volumeCol  = detectVolumeCol(moqCol);

  if (priceCol === -1) {
    console.warn(`\n[${brand}] ⚠  Could not auto-detect price column — skipping`);
    continue;
  }

  console.log(
    `\n[${brand}]  english→col${englishCol}  korean→col${koreanCol ?? "none"}` +
    `  volume→col${volumeCol ?? "none"}  moq→col${moqCol ?? "none"}  price→col${priceCol}`
  );

  let ok = 0, notFound = 0, skipped = 0, failed = 0;

  for (const row of rows.slice(2)) {
    const barcode     = (row[0] || "").replace(/\s/g, "");
    const englishName = (row[englishCol] || "").trim();
    const koreanName  = koreanCol  != null ? (row[koreanCol]  || "").replace(/\s*\n\s*/g, " ").trim() : "";
    const volume      = volumeCol  != null ? (row[volumeCol]  || "").trim() : "";
    const priceRaw    = (row[priceCol] || "").trim().replace(/[,\s]/g, "");
    const moqRaw      = moqCol     != null ? (row[moqCol]     || "").replace(/[,\s]/g, "") : "";

    if (!englishName) continue;

    const priceUSD = parseFloat(priceRaw);
    if (!priceRaw || isNaN(priceUSD) || priceUSD <= 0) { skipped++; continue; }

    const sheetPriceCents = Math.round(priceUSD * 100);
    const moqQty          = moqRaw ? (parseInt(moqRaw, 10) || null) : null;

    // Use actual supply price for ANUA COGS; fall back to the sheet price for other brands
    const cogsCents =
      brand === "ANUA" && barcode && anuaSupplyPrices.has(barcode)
        ? anuaSupplyPrices.get(barcode)
        : sheetPriceCents;

    // Displayed base_price = cost, no markup — CSV/sheet price passes through as-is
    const basePriceCents = cogsCents;

    const description = buildDescription({ englishName, koreanName, volume, barcode, brand, moqQty });

    const dbUpdate = {
      description,
      base_price:         basePriceCents,
      cogs:               cogsCents,
      brand,
      origin_country:     "KR",
      trade_term:         "fob",
      legal_category:     "cosmetic",
      hs_code:            "3304.99",
      shipping_mode:      "either",
      allow_mix_shipping: true,
      min_order_amount:   1000000,
    };

    if (barcode)    dbUpdate.jan_code     = barcode;
    if (koreanName) dbUpdate.name_local   = koreanName;
    dbUpdate.moq = moqQty ? moqQty * 10 : 10;
    if (moqQty)     dbUpdate.box_pack_qty = moqQty;

    let matched = false;

    // Primary: slug = slugify(englishName) + last-8-of-barcode
    if (barcode) {
      const slug = `${slugify(englishName)}-${barcode.slice(-8)}`;
      const { data, error } = await admin
        .from("products")
        .update(dbUpdate)
        .eq("slug", slug)
        .select("id");

      if (error) { console.error(`  ✗ [slug] ${slug}: ${error.message}`); failed++; continue; }
      if (data && data.length > 0) matched = true;
    }

    // Fallback: exact English name
    if (!matched) {
      const { data, error } = await admin
        .from("products")
        .update(dbUpdate)
        .eq("name", englishName)
        .select("id");

      if (error) { console.error(`  ✗ [name] "${englishName}": ${error.message}`); failed++; continue; }
      if (!data || data.length === 0) { console.warn(`  ? not found: ${englishName}`); notFound++; continue; }
      matched = true;
    }

    if (matched) ok++;
  }

  const notes = [];
  if (moqCol  == null) notes.push("no MOQ col");
  if (volumeCol == null) notes.push("no volume col — embedded in name");
  const noteStr = notes.length ? `  (${notes.join(", ")})` : "";
  console.log(`  → ${ok} updated, ${notFound} not found, ${skipped} skipped, ${failed} errors${noteStr}`);

  grandOk       += ok;
  grandNotFound += notFound;
  grandSkipped  += skipped;
  grandFailed   += failed;
}

console.log("\n═══════════════════════════════════════════════════════");
console.log(`Grand total: ${grandOk} updated, ${grandNotFound} not found, ${grandSkipped} skipped, ${grandFailed} errors`);
if (grandNotFound > 0) {
  console.log("  Tip: run seed-kbeauty-products.mjs first to seed missing products.");
}
