// Assigns all products whose names appear in all_image_url_mapping.csv
// to the "korean-beauty" shipping group.
// Creates the group if it does not exist.
//
// Run: node --env-file=.env scripts/assign-kbeauty-shipping-group.mjs

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

// ── Parse CSV ─────────────────────────────────────────────────────────────────
// Header: sheet,source_row,product_name,img1_url,img2_url,img3_url
const lines = readFileSync(CSV_PATH, "utf-8")
  .split("\n")
  .map((l) => l.replace(/\r$/, ""))
  .filter(Boolean);

const PRODUCT_NAME_COL = 2; // zero-indexed

const csvNames = new Set();
for (const line of lines.slice(1)) {
  const fields = line.split(",");
  const name = (fields[PRODUCT_NAME_COL] || "").trim().replace(/^"|"$/g, "");
  if (name) csvNames.add(name);
}

console.log(`CSV: ${csvNames.size} unique product names across ${lines.length - 1} rows\n`);

// ── Get or create the korean-beauty shipping group ────────────────────────────
const GROUP_NAME = "Korean Beauty";
const GROUP_CODE = "KR-BEAUTY";

let { data: existingGroup } = await admin
  .from("product_shipping_groups")
  .select("id, name, code")
  .ilike("name", GROUP_NAME)
  .maybeSingle();

if (!existingGroup) {
  const { data: byCode } = await admin
    .from("product_shipping_groups")
    .select("id, name, code")
    .ilike("code", GROUP_CODE)
    .maybeSingle();
  existingGroup = byCode;
}

let groupId;
if (existingGroup) {
  groupId = existingGroup.id;
  console.log(`Found shipping group: "${existingGroup.name}" (${existingGroup.code ?? "no code"}) — ${groupId}\n`);
} else {
  const { data: created, error: createErr } = await admin
    .from("product_shipping_groups")
    .insert({
      name: GROUP_NAME,
      code: GROUP_CODE,
      group_type: "country",
      description: "K-Beauty products from South Korea",
      country_code: "KR",
      is_active: true,
    })
    .select("id")
    .single();

  if (createErr) {
    console.error("Failed to create shipping group:", createErr.message);
    process.exit(1);
  }
  groupId = created.id;
  console.log(`Created shipping group "${GROUP_NAME}" — ${groupId}\n`);
}

// ── Fetch all products and match by name ──────────────────────────────────────
const PAGE = 1000;
let offset = 0;
const allProducts = [];

while (true) {
  const { data, error } = await admin
    .from("products")
    .select("id, name")
    .range(offset, offset + PAGE - 1);
  if (error) { console.error("Failed to fetch products:", error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  allProducts.push(...data);
  if (data.length < PAGE) break;
  offset += PAGE;
}

console.log(`Fetched ${allProducts.length} products from DB\n`);

// Build map: lowercase name → [ids]
const nameMap = new Map();
for (const p of allProducts) {
  const key = p.name.trim().toLowerCase();
  if (!nameMap.has(key)) nameMap.set(key, []);
  nameMap.get(key).push(p.id);
}

// Match CSV names against DB products
const matchedIds = [];
const notFound = [];

for (const csvName of csvNames) {
  const key = csvName.toLowerCase();
  const ids = nameMap.get(key);
  if (ids && ids.length > 0) {
    matchedIds.push(...ids);
  } else {
    notFound.push(csvName);
  }
}

console.log(`Matched: ${matchedIds.length} products`);
if (notFound.length > 0) {
  console.log(`Not found in DB (${notFound.length}):`);
  for (const n of notFound.slice(0, 20)) console.log(`  ? ${n}`);
  if (notFound.length > 20) console.log(`  ... and ${notFound.length - 20} more`);
}
console.log();

if (matchedIds.length === 0) {
  console.log("Nothing to update.");
  process.exit(0);
}

// ── Batch update ──────────────────────────────────────────────────────────────
const BATCH = 500;
let ok = 0;
let failed = 0;

for (let i = 0; i < matchedIds.length; i += BATCH) {
  const chunk = matchedIds.slice(i, i + BATCH);
  const { error } = await admin
    .from("products")
    .update({ shipping_group_id: groupId, updated_at: new Date().toISOString() })
    .in("id", chunk);

  if (error) {
    console.error(`  ✗ batch ${i}–${i + chunk.length - 1}: ${error.message}`);
    failed += chunk.length;
  } else {
    ok += chunk.length;
    process.stdout.write(`  ✓ updated ${ok}/${matchedIds.length}\r`);
  }
}

console.log(`\nDone — ${ok} products assigned to "${GROUP_NAME}", ${failed} errors, ${notFound.length} names not found in DB.`);
