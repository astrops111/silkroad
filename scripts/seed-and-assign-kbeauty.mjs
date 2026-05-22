// Seeds all products from all_image_url_mapping.csv that are missing from the DB,
// then assigns every CSV product (new + existing) to the Korean Beauty shipping group.
//
// Run: node --env-file=.env scripts/seed-and-assign-kbeauty.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "sheet_image_updates", "all_image_url_mapping.csv");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CSV parser (handles quoted fields with embedded newlines/commas) ───────────
function parseCSV(text) {
  const rows = [];
  let field = "";
  let inQuotes = false;
  let row = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = "";
      } else if (ch === '\n') {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else if (ch === '\r') {
        // skip CR
      } else {
        field += ch;
      }
    }
    i++;
  }

  // last field/row
  if (field || row.length > 0) {
    row.push(field);
    if (row.some(f => f !== "")) rows.push(row);
  }

  return rows;
}

// ── Parse CSV ─────────────────────────────────────────────────────────────────
// Header: sheet,source_row,product_name,img1_url,img2_url,img3_url
const raw = readFileSync(CSV_PATH, "utf-8");
const allRows = parseCSV(raw);
const dataRows = allRows.slice(1); // skip header

// Normalise product name: collapse internal newlines and extra whitespace
const csvProducts = [];
const seenNames = new Set();
for (const cols of dataRows) {
  const sheet = (cols[0] || "").trim();
  const name = (cols[2] || "").replace(/[\r\n]+/g, " ").trim().replace(/\s+/g, " ");
  const img1 = (cols[3] || "").trim();
  const img2 = (cols[4] || "").trim();
  const img3 = (cols[5] || "").trim();
  if (!name || !sheet) continue;
  if (seenNames.has(name.toLowerCase())) continue;
  seenNames.add(name.toLowerCase());
  csvProducts.push({ sheet, name, img1, img2, img3 });
}

console.log(`CSV: ${csvProducts.length} unique products parsed\n`);

// ── Resolve Korean Beauty shipping group ──────────────────────────────────────
const GROUP_NAME = "Korean Beauty";
const GROUP_CODE = "KR-BEAUTY";

let { data: grp } = await admin.from("product_shipping_groups").select("id, name").ilike("name", GROUP_NAME).maybeSingle();
if (!grp) {
  const { data: byCode } = await admin.from("product_shipping_groups").select("id, name").ilike("code", GROUP_CODE).maybeSingle();
  grp = byCode;
}
if (!grp) {
  const { data: created, error } = await admin.from("product_shipping_groups").insert({
    name: GROUP_NAME, code: GROUP_CODE, group_type: "country",
    description: "K-Beauty products from South Korea", country_code: "KR", is_active: true,
  }).select("id, name").single();
  if (error) { console.error("Failed to create shipping group:", error.message); process.exit(1); }
  grp = created;
  console.log(`Created shipping group "${GROUP_NAME}" — ${grp.id}\n`);
} else {
  console.log(`Shipping group: "${grp.name}" — ${grp.id}\n`);
}

const GROUP_ID = grp.id;

// ── Fetch all DB products ─────────────────────────────────────────────────────
const allDbProducts = [];
let offset = 0;
while (true) {
  const { data, error } = await admin.from("products").select("id, name").range(offset, offset + 999);
  if (error) { console.error("Fetch error:", error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  allDbProducts.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}

const nameToId = new Map();
for (const p of allDbProducts) {
  nameToId.set(p.name.trim().toLowerCase(), p.id);
}

console.log(`DB: ${allDbProducts.length} existing products\n`);

// ── Identify missing products ─────────────────────────────────────────────────
const toSeed = csvProducts.filter(p => !nameToId.has(p.name.toLowerCase()));
const alreadyInDb = csvProducts.filter(p => nameToId.has(p.name.toLowerCase()));

console.log(`Already in DB: ${alreadyInDb.length}`);
console.log(`To seed:       ${toSeed.length}\n`);

// ── Seed missing products ─────────────────────────────────────────────────────
const SUPPLIER_ID = "9b3c67fe-7c97-4a1e-8746-5da8221cd978"; // KR-Beauty supplier
const CATEGORY_ID = "a0000004-0001-0000-0000-000000000000"; // Beauty category

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

// Pre-load existing slugs to avoid collisions
const usedSlugs = new Set();
const { data: existingSlugs } = await admin.from("products").select("slug");
for (const p of existingSlugs || []) usedSlugs.add(p.slug);

let seeded = 0;
let seedErrors = 0;

for (const p of toSeed) {
  let slug = toSlug(p.name);
  let attempt = 0;
  while (usedSlugs.has(slug)) {
    attempt++;
    slug = toSlug(p.name) + "-" + attempt;
  }
  usedSlugs.add(slug);

  const brand = p.sheet.replace(/['"]/g, "").trim();

  const { data: inserted, error } = await admin.from("products").insert({
    name: p.name,
    slug,
    brand,
    supplier_id: SUPPLIER_ID,
    category_id: CATEGORY_ID,
    base_price: 0,
    currency: "USD",
    origin_country: "KR",
    is_active: true,
    shipping_group_id: GROUP_ID,
  }).select("id").single();

  if (error) {
    console.error(`  ✗ "${p.name}": ${error.message}`);
    seedErrors++;
    continue;
  }

  seeded++;
  nameToId.set(p.name.toLowerCase(), inserted.id);

  // Insert images
  const images = [p.img1, p.img2, p.img3].filter(Boolean);
  if (images.length > 0) {
    const imgRows = images.map((url, idx) => ({
      product_id: inserted.id,
      url,
      alt_text: p.name,
      sort_order: idx,
      is_primary: idx === 0,
    }));
    const { error: imgErr } = await admin.from("product_images").insert(imgRows);
    if (imgErr) console.warn(`  ⚠ images for "${p.name}": ${imgErr.message}`);
  }
}

console.log(`Seeded: ${seeded} new products (${seedErrors} errors)\n`);

// ── Assign ALL CSV products to the shipping group ─────────────────────────────
const allIds = csvProducts.map(p => nameToId.get(p.name.toLowerCase())).filter(Boolean);
console.log(`Assigning ${allIds.length} products to "${GROUP_NAME}"...`);

const BATCH = 500;
let ok = 0;
let failed = 0;

for (let i = 0; i < allIds.length; i += BATCH) {
  const chunk = allIds.slice(i, i + BATCH);
  const { error } = await admin.from("products").update({
    shipping_group_id: GROUP_ID,
    updated_at: new Date().toISOString(),
  }).in("id", chunk);

  if (error) {
    console.error(`  ✗ batch ${i}–${i + chunk.length - 1}: ${error.message}`);
    failed += chunk.length;
  } else {
    ok += chunk.length;
    process.stdout.write(`  ✓ ${ok}/${allIds.length}\r`);
  }
}

console.log(`\nDone — ${ok} products assigned to "${GROUP_NAME}", ${failed} errors.`);
console.log(`Summary: ${seeded} new products seeded, ${seedErrors} seed errors.`);
