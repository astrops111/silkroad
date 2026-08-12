// Rewrites HODAF product descriptions in plain English — the spec/usage/
// shelf-life fields pulled straight from the vendor spreadsheet (seed-hodaf.mjs)
// carried raw Chinese packaging terms (e.g. "12對/盒", "依包裝所示", "730天").
// Also drops the "reference image folder" provenance line now that real
// photos live in product_images (fetch-hodaf-images.mjs).
//
// Run: node --env-file=.env scripts/translate-hodaf-descriptions.mjs

import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = join(__dirname, "..", "sheet_image_updates", "original", "new", "vendor list for Annie .xlsx");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const UNIT_EN = { "盒": "box", "瓶": "bottle", "袋": "bag", "貼": "patch", "板": "tray", "對": "pair", "粒": "piece", "版": "tray" };
const PLURAL_IRREGULAR = { box: "boxes", patch: "patches" };
function pluralize(word, count) {
  if (count === 1) return word;
  return PLURAL_IRREGULAR[word] ?? `${word}s`;
}

// "36貼/板，4板/盒" -> "36 patches/tray, 4 trays/box"
function translateSpec(spec) {
  if (!spec) return null;
  if (/^[一-鿿]+$/.test(spec.trim())) {
    // bare unit with no count, e.g. "袋"
    const unit = UNIT_EN[spec.trim()];
    return unit ? `Sold per ${unit}` : spec;
  }
  const segments = spec.split(/[，,]/).map((s) => s.trim()).filter(Boolean);
  const translated = segments.map((seg) => {
    const m = seg.match(/^(\d+)([一-鿿]+?)\/([一-鿿]+)$/);
    if (!m) return seg;
    const [, countStr, itemZh, containerZh] = m;
    const count = parseInt(countStr, 10);
    const itemEn = UNIT_EN[itemZh] ?? itemZh;
    const containerEn = UNIT_EN[containerZh] ?? containerZh;
    return `${count} ${pluralize(itemEn, count)}/${containerEn}`;
  });
  return translated.join(", ");
}

// "150g/盒" -> "150g per box"
function translateWeight(weight) {
  if (!weight) return null;
  const m = weight.match(/^([\d.]+)(g|ml|kg)\/([一-鿿]+)$/i);
  if (!m) return weight;
  const [, value, unit, containerZh] = m;
  const containerEn = UNIT_EN[containerZh] ?? containerZh;
  return `${value}${unit} per ${containerEn}`;
}

function translateUsage(usage) {
  if (!usage) return null;
  if (usage.trim() === "依包裝所示") return "As directed on packaging";
  return usage;
}

// "730天" -> "730 days"
function translateShelfLife(shelfLife) {
  if (!shelfLife) return null;
  const m = shelfLife.match(/^(\d+)\s*天$/);
  return m ? `${m[1]} days` : shelfLife;
}

// "36貼/板，4板/盒" -> 144
function parsePiecesPerBox(specStr) {
  if (!specStr) return null;
  const segments = specStr.split(/[，,]/);
  let total = 1, found = false;
  for (const seg of segments) {
    const m = seg.match(/^(\d+)/);
    if (m) { total *= parseInt(m[1], 10); found = true; }
  }
  return found ? total : null;
}

function buildDescription(row) {
  const specEn = translateSpec(row.spec);
  const piecesPerBox = parsePiecesPerBox(row.spec);
  return [
    row.nameEn,
    "",
    `Brand: HODAF`,
    `Origin: China`,
    specEn ? `Packaging: ${specEn}${piecesPerBox ? ` (${piecesPerBox} pcs/box)` : ""}` : null,
    row.weight ? `Weight: ${translateWeight(row.weight)}` : null,
    row.usage ? `Usage: ${translateUsage(row.usage)}` : null,
    row.shelfLife ? `Shelf life: ${translateShelfLife(row.shelfLife)}` : null,
    "Trade term: EXW",
  ].filter((l) => l !== null).join("\n");
}

function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = { vendor: "D", nameEn: "L", spec: "AK", weight: "AM", usage: "AN", shelfLife: "AQ" };
  const rows = [];
  for (let r = 4; r <= 31; r++) {
    const get = (col) => { const cell = sheet[col + r]; return cell ? cell.v : null; };
    if (get(cols.vendor) !== "HODAF") continue;
    const row = {};
    for (const [k, col] of Object.entries(cols)) row[k] = get(col);
    row.slug = slugify(row.nameEn);
    rows.push(row);
  }
  return rows;
}

const rows = loadRows();
console.log(`[xlsx] ${rows.length} HODAF rows\n`);

let updated = 0, failed = 0;
for (const row of rows) {
  const description = buildDescription(row);
  const { error } = await admin.from("products").update({ description }).eq("slug", row.slug);
  if (error) { failed++; console.error(`  ✗ ${row.nameEn}: ${error.message}`); continue; }
  updated++;
  console.log(`  ✓ ${row.nameEn}`);
}
console.log(`\nDone — ${updated} updated, ${failed} failed.`);
