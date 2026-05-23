// Updates product non-price fields from a Google Sheets order/catalog sheet.
// Fetches the sheet as CSV, auto-detects column layout, and patches matching products.
//
// Fields updated (price fields are excluded):
//   jan_code, name_local, moq, box_pack_qty, description,
//   brand, origin_country, trade_term, legal_category, hs_code,
//   shipping_mode, allow_mix_shipping, min_order_amount
//
// Run:
//   node --env-file=.env scripts/update-from-sheet.mjs \
//     --url "https://docs.google.com/spreadsheets/d/SHEET_ID/edit?gid=GID" \
//     --brand "BeautyOfJoseon"

import { createClient } from "@supabase/supabase-js";

const DB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

// ── CLI args ───────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const rawUrl = getArg("--url");
const brand  = getArg("--brand");

if (!rawUrl || !brand) {
  console.error("Usage: node scripts/update-from-sheet.mjs --url <sheet-url> --brand <BrandName>");
  process.exit(1);
}

// Convert /edit URL to /export?format=csv, preserving gid from hash or query
const gidMatch = rawUrl.match(/[#&?]gid=(\d+)/);
const gidParam  = gidMatch ? `&gid=${gidMatch[1]}` : "";
const baseUrl   = rawUrl.replace(/\/edit.*$/, "").replace(/\/export.*$/, "");
const exportUrl = `${baseUrl}/export?format=csv${gidParam}`;

// ── Fetch CSV (follow redirect) ────────────────────────────────────────────────
async function fetchCSV(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── CSV parser ─────────────────────────────────────────────────────────────────
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
  return text.split("\n").map((l) => l.replace(/\r$/, "")).map(parseCSVLine);
}

// ── Slug (must match seed-kbeauty-products.mjs exactly) ───────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Column detectors ───────────────────────────────────────────────────────────
function detectCol(headerRow, ...keywords) {
  for (let i = 0; i < headerRow.length; i++) {
    const h = (headerRow[i] || "").toLowerCase();
    if (keywords.some((kw) => h.includes(kw))) return i;
  }
  return -1;
}

// ── Description builder ────────────────────────────────────────────────────────
function buildDescription({ englishName, koreanName, volume, barcode, moqQty }) {
  return [
    englishName || koreanName,   // fall back to Korean when English is absent
    (englishName && koreanName) ? koreanName : null,
    "",
    `Brand: ${brand}`,
    `Origin: South Korea`,
    volume  ? `Volume / Size: ${volume}`                  : null,
    moqQty  ? `Min. Order Qty: ${moqQty} pcs per carton` : null,
    barcode ? `Barcode / JAN: ${barcode}`                 : null,
    "",
    "KFDA-registered cosmetic. Ships FOB Incheon.",
  ].filter((l) => l !== null).join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log(`[fetch] ${exportUrl}`);
const csvText = await fetchCSV(exportUrl).catch((e) => {
  console.error(`Failed to fetch sheet: ${e.message}`);
  process.exit(1);
});

const rows = parseCSV(csvText);

// Some sheets have a blank/totals row before the header — find the real header row.
let headerIdx = 0;
for (let i = 0; i < Math.min(rows.length, 3); i++) {
  if ((rows[i][0] || "").toLowerCase().trim() === "barcode") { headerIdx = i; break; }
}
const headerRow  = rows[headerIdx] || [];
const dataRows   = rows.slice(headerIdx + 1);

const englishCol = detectCol(headerRow, "english");
const koreanCol  = detectCol(headerRow, "korean", "korea");
const volumeCol  = detectCol(headerRow, "volume", "size");
const moqCol     = detectCol(headerRow, "pcs per", "in-box", "in box", "box qty", "moq", "pcs/box", "qty/box");

if (englishCol === -1 && koreanCol === -1) {
  console.error("Could not detect name columns. Header:", headerRow.join(" | "));
  process.exit(1);
}

console.log(
  `[cols] barcode=0  english=${englishCol}  korean=${koreanCol === -1 ? "none" : koreanCol}` +
  `  volume=${volumeCol === -1 ? "none" : volumeCol}  moq=${moqCol === -1 ? "none" : moqCol}`
);
console.log(`[brand] ${brand}\n`);

const admin = createClient(DB_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let ok = 0, notFound = 0, failed = 0;

for (const row of dataRows) {
  const barcode     = (row[0] || "").replace(/\s/g, "");
  const englishName = (row[englishCol] || "").trim();
  const koreanName  = koreanCol  !== -1 ? (row[koreanCol]  || "").replace(/\s*\n\s*/g, " ").trim() : "";
  const volume      = volumeCol  !== -1 ? (row[volumeCol]  || "").trim()                            : "";
  const moqRaw      = moqCol     !== -1 ? (row[moqCol]     || "").replace(/[,\s]/g, "")             : "";

  // Skip header-repeat rows and rows with no usable name at all
  if (englishName.toLowerCase() === "product name (english)") continue;
  if (!englishName && !koreanName && !barcode) continue;

  const moqQty = moqRaw ? (parseInt(moqRaw, 10) || null) : null;

  const dbUpdate = {
    description:        buildDescription({ englishName, koreanName, volume, barcode, moqQty }),
    brand,
    origin_country:     "KR",
    trade_term:         "fob",
    legal_category:     "cosmetic",
    hs_code:            "3304.99",
    shipping_mode:      "either",
    allow_mix_shipping: true,
    min_order_amount:   10000,
  };

  if (barcode)    dbUpdate.jan_code     = barcode;
  if (koreanName) dbUpdate.name_local   = koreanName;
  if (moqQty)     dbUpdate.moq          = moqQty;
  if (moqQty)     dbUpdate.box_pack_qty = moqQty;

  let matched = false;

  // Primary: slug match (requires both English name and barcode)
  if (barcode && englishName) {
    const slug = `${slugify(englishName)}-${barcode.slice(-8)}`;
    const { data, error } = await admin
      .from("products")
      .update(dbUpdate)
      .eq("slug", slug)
      .select("id");
    if (error) { console.error(`  ✗ [slug] ${slug}: ${error.message}`); failed++; continue; }
    if (data && data.length > 0) matched = true;
  }

  // Fallback 1: exact English name
  if (!matched && englishName) {
    const { data, error } = await admin
      .from("products")
      .update(dbUpdate)
      .eq("name", englishName)
      .select("id");
    if (error) { console.error(`  ✗ [name] "${englishName}": ${error.message}`); failed++; continue; }
    if (data && data.length > 0) matched = true;
  }

  // Fallback 2: barcode only — used when English name is absent (e.g. Dr.Jart sheets)
  if (!matched && barcode) {
    const { data, error } = await admin
      .from("products")
      .update(dbUpdate)
      .eq("jan_code", barcode)
      .select("id");
    if (error) { console.error(`  ✗ [barcode] ${barcode}: ${error.message}`); failed++; continue; }
    if (data && data.length > 0) matched = true;
  }

  if (!matched) { console.warn(`  ? not found: ${englishName || koreanName || barcode}`); notFound++; continue; }
  if (matched) { console.log(`  ✓ ${englishName || koreanName || barcode}`); ok++; }
}

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`Brand: ${brand} — ${ok} updated, ${notFound} not found, ${failed} errors`);
if (notFound > 0) console.log("  Tip: run seed-kbeauty-products.mjs first to seed missing products.");
