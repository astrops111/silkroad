// Refreshes every HODAF listing from the updated vendor sheet
// ("vendor list for Annie (1).xlsx"), keeping the OEM positioning.
//
// The sheet now quotes per BOX and states the MOQ per box (col O, "2000盒"),
// so the box is the sellable unit:
//   cogs        = sheet COGS (col S), per box, in cents
//   base_price  = COGS * 1.17, per box, in cents  <- 17% markup, HODAF only
//   moq         = 2000 (boxes/bags, per col O)
//   sales_unit  = "Box" | "Bag" — base_price prices ONE of these outright
//   box_pack_qty= null — nothing is multiplied, so the quoted box price is
//                 exact. (Storing it per piece would round $1.404/box of 144
//                 patches down to 1c/pc = $1.44, misquoting the listing.)
//
// Everything buyer-facing is written in English: the sheet's Chinese packaging,
// usage, shelf-life, carton and legal-category values are translated here, and
// the OEM setup fees are re-appended. Descriptions use "Label: value" lines,
// which the product page parses into its Specifications tab.
//
// Matches existing rows by slug, so product_images (scraped from Drive) survive.
// Idempotent: re-running rewrites the same values.
//
// Run: node --env-file=.env scripts/update-hodaf-from-sheet.mjs

import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = join(
  __dirname,
  "..",
  "sheet_image_updates",
  "original",
  "new",
  "vendor list for Annie (1).xlsx"
);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const SUPPLIER_SLUG = "hodaf";
const BRAND = "OEM";
const PREFIX = `[${BRAND}] `;
const MARKUP = 1.17; // HODAF-only listing markup; PLATFORM_MARKUP stays 1.0
const MOQ = 2000;
const LEAD_TIME_DAYS = 75;

// Mirrors OEM_TERMS in src/app/marketplace/[...slug]/product-detail-client.tsx.
const FEE_LINES = [
  "One-time label account setup fee: USD 500",
  "Design & product fee: Extra, quoted per project",
];

// ── Chinese → English ───────────────────────────────────────────────────
const UNIT_EN = { 盒: "box", 瓶: "bottle", 袋: "bag", 貼: "patch", 板: "tray", 對: "pair", 粒: "piece", 版: "tray", 箱: "carton", 片: "sheet" };
const PLURAL_IRREGULAR = { box: "boxes", patch: "patches" };
const pluralize = (word, count) =>
  count === 1 ? word : PLURAL_IRREGULAR[word] ?? `${word}s`;

// "36貼/板，4板/盒" -> "36 patches/tray, 4 trays/box"
function translateSpec(spec) {
  if (!spec) return null;
  const text = String(spec).trim();
  if (/^[一-鿿]+$/.test(text)) {
    const unit = UNIT_EN[text];
    return unit ? `Sold per ${unit}` : text;
  }
  return text
    .split(/[，,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const m = seg.match(/^(\d+)([一-鿿]+?)\/([一-鿿]+)$/);
      if (!m) return seg;
      const [, countStr, itemZh, containerZh] = m;
      const count = parseInt(countStr, 10);
      return `${count} ${pluralize(UNIT_EN[itemZh] ?? itemZh, count)}/${UNIT_EN[containerZh] ?? containerZh}`;
    })
    .join(", ");
}

// "150g/盒" -> "150g per box"
function translateWeight(weight) {
  if (!weight) return null;
  const m = String(weight).match(/^([\d.]+)\s*(g|ml|kg)\/([一-鿿]+)$/i);
  if (!m) return String(weight);
  const [, value, unit, containerZh] = m;
  return `${value}${unit} per ${UNIT_EN[containerZh] ?? containerZh}`;
}

// "59盒/箱" -> "59 boxes per carton"
function translateCartonPack(cartonPack) {
  if (!cartonPack) return null;
  const m = String(cartonPack).match(/^(\d+)([一-鿿]+)\/([一-鿿]+)$/);
  if (!m) return String(cartonPack);
  const [, countStr, itemZh, containerZh] = m;
  const count = parseInt(countStr, 10);
  return `${count} ${pluralize(UNIT_EN[itemZh] ?? itemZh, count)} per ${UNIT_EN[containerZh] ?? containerZh}`;
}

const translateUsage = (usage) =>
  !usage ? null : String(usage).trim() === "依包裝所示" ? "As directed on packaging" : String(usage);

const LEGAL_CATEGORY_EN = { 化妝品: "Cosmetics", 化妆品: "Cosmetics" };
const translateLegalCategory = (c) => (c ? LEGAL_CATEGORY_EN[String(c).trim()] ?? String(c).trim() : null);

// "50*25*25" -> "50 x 25 x 25 cm"
function translateDimensions(dims) {
  if (!dims) return null;
  const parts = String(dims).split(/[*x×]/).map((p) => p.trim()).filter(Boolean);
  return parts.length === 3 ? `${parts.join(" x ")} cm` : String(dims);
}

// ── Parsing ─────────────────────────────────────────────────────────────
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// "2000盒" -> { qty: 2000, unitZh: "盒" }; the sheet uses 盒 (box) or 袋 (bag).
function parseMoqCell(cell) {
  const m = String(cell ?? "").match(/^(\d+)\s*([一-鿿]+)?$/);
  if (!m) return { qty: null, unitZh: null };
  return { qty: parseInt(m[1], 10), unitZh: m[2] ?? null };
}

// "36貼/板，4板/盒" -> 144 (product of the leading count in each segment)
function parsePiecesPerBox(spec) {
  if (!spec) return null;
  let total = 1;
  let found = false;
  for (const seg of String(spec).split(/[，,]/)) {
    const m = seg.trim().match(/^(\d+)/);
    if (m) {
      total *= parseInt(m[1], 10);
      found = true;
    }
  }
  return found ? total : null;
}

// "150g/盒" -> 0.15 kg (g and ml treated 1:1). Rounded to 2dp to match the
// products.weight_kg column, NUMERIC(10,2) — so what we compute is what lands
// in the DB. Sub-10g packs therefore store 0.00; their exact gram weight stays
// readable on the description's "Weight:" line.
function parseWeightKg(weight) {
  if (!weight) return null;
  const m = String(weight).match(/([\d.]+)\s*(g|ml|kg)/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const kg = m[2].toLowerCase() === "kg" ? value : value / 1000;
  return Math.round(kg * 100) / 100;
}

function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = {
    vendor: "D", nameEn: "L", nameZhTrad: "M", moqCell: "O", incoterm: "R",
    cogs: "S", cartonPack: "AD", shelfDays: "AE", legalCategory: "AG",
    spec: "AK", dimensions: "AL", weight: "AM", usage: "AN", shelfLife: "AQ",
  };
  const range = xlsx.utils.decode_range(sheet["!ref"]);
  const rows = [];
  for (let r = 4; r <= range.e.r + 1; r++) {
    const get = (col) => {
      const cell = sheet[col + r];
      return cell ? cell.v : null;
    };
    if (get(cols.vendor) !== "HODAF") continue;
    const row = {};
    for (const [k, col] of Object.entries(cols)) row[k] = get(col);
    if (!row.nameEn) continue;
    row.slug = slugify(row.nameEn);
    rows.push(row);
  }
  return rows;
}

function buildDescription(row, unitNoun) {
  const piecesPerBox = parsePiecesPerBox(row.spec);
  const lines = [
    row.nameEn,
    "",
    `Brand: ${BRAND}`,
    "Origin: China",
    row.spec ? `Packaging: ${translateSpec(row.spec)}` : null,
    piecesPerBox && piecesPerBox > 1
      ? `Pieces per ${unitNoun}: ${piecesPerBox.toLocaleString("en-US")}`
      : null,
    row.cartonPack ? `Carton pack: ${translateCartonPack(row.cartonPack)}` : null,
    row.dimensions ? `Carton dimensions: ${translateDimensions(row.dimensions)}` : null,
    row.weight ? `Weight: ${translateWeight(row.weight)}` : null,
    row.usage ? `Usage: ${translateUsage(row.usage)}` : null,
    // Shelf life and legal category are stored as their own columns and already
    // render as spec rows — repeating them here would list each one twice.
    `Trade term: ${String(row.incoterm ?? "EXW").toUpperCase()}`,
    "",
    `MOQ: ${MOQ.toLocaleString("en-US")} ${pluralize(unitNoun, MOQ)} per item`,
    ...FEE_LINES,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

// ── Run ─────────────────────────────────────────────────────────────────
const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id, name")
  .eq("slug", SUPPLIER_SLUG)
  .single();
if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found.`);
  process.exit(1);
}

const rows = loadRows();
console.log(`[xlsx] ${rows.length} HODAF rows`);
console.log(`[supplier] ${company.name} (${company.id})\n`);

const { data: existing, error: fetchErr } = await admin
  .from("products")
  .select("id, slug, name")
  .eq("supplier_id", company.id);
if (fetchErr) {
  console.error(`Fetch failed: ${fetchErr.message}`);
  process.exit(1);
}
const bySlug = new Map((existing ?? []).map((p) => [p.slug, p]));
const seen = new Set();

let updated = 0, missing = 0, failed = 0;
for (const row of rows) {
  const product = bySlug.get(row.slug);
  if (!product) {
    missing++;
    console.warn(`  ! no product with slug "${row.slug}" (${row.nameEn}) — not updated`);
    continue;
  }
  seen.add(row.slug);

  const { qty: moqFromSheet, unitZh } = parseMoqCell(row.moqCell);
  const unitNoun = UNIT_EN[unitZh] ?? "box"; // 盒 -> box, 袋 -> bag
  const salesUnit = unitNoun.charAt(0).toUpperCase() + unitNoun.slice(1);
  if (moqFromSheet && moqFromSheet !== MOQ) {
    console.warn(`  ! ${row.nameEn}: sheet MOQ ${moqFromSheet} differs from ${MOQ} — using ${MOQ}`);
  }

  const cogsCents = Math.round(row.cogs * 100);
  const listingCents = Math.round(row.cogs * MARKUP * 100);

  const patch = {
    name: PREFIX + row.nameEn,
    name_local: row.nameZhTrad ? PREFIX + row.nameZhTrad : null,
    brand: BRAND,
    description: buildDescription(row, unitNoun),
    base_price: listingCents,
    cogs: cogsCents,
    currency: "USD",
    moq: MOQ,
    box_pack_qty: null,
    sales_unit: salesUnit,
    lead_time_days: LEAD_TIME_DAYS,
    trade_term: String(row.incoterm ?? "exw").toLowerCase(),
    weight_kg: parseWeightKg(row.weight),
    shelf_life_days: row.shelfDays ? parseInt(String(row.shelfDays), 10) : null,
    legal_category: translateLegalCategory(row.legalCategory),
    origin_country: "CN",
  };

  const { error } = await admin.from("products").update(patch).eq("id", product.id);
  if (error) {
    failed++;
    console.error(`  ✗ ${row.nameEn}: ${error.message}`);
    continue;
  }
  updated++;
  console.log(
    `  ✓ ${patch.name} — $${(cogsCents / 100).toFixed(2)} cogs -> ` +
    `$${(listingCents / 100).toFixed(2)}/${unitNoun} listed, MOQ ${MOQ} ${pluralize(unitNoun, MOQ)}`
  );
}

const untouched = (existing ?? []).filter((p) => !seen.has(p.slug));
if (untouched.length) {
  console.warn(`\n! ${untouched.length} HODAF product(s) are not in the sheet and were left as-is:`);
  for (const p of untouched) console.warn(`    ${p.name} (${p.slug})`);
}

console.log(`\nDone — ${updated} updated, ${missing} sheet rows unmatched, ${failed} failed.`);
