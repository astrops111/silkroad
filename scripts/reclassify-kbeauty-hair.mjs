// Reclassify Korean-beauty hair products that are scattered across facial /
// makeup / body categories into the correct Beauty > Hair subcategory.
//
// Scope & rules (agreed with product owner 2026-07):
//   - Only korean-beauty-trading-co, active products.
//   - Detects hair items by name, then sub-classifies into:
//       hair-shampoo / hair-conditioner / hair-dye / hair-removal /
//       hair-accessories / beauty-hair (parent, for serums/oils/masks/
//       styling/scalp treatments with no dedicated leaf).
//   - Hairline / root cushion & shadow makeup -> hair-dye (temporary root color).
//   - LEAVES the Baby/Kids taxonomy untouched (baby shampoo, kids hair ties
//     stay under baby-products/*).
//   - category_ids (authoritative array) is kept in sync with category_id.
//
// Dry run (default): prints the move plan, writes nothing.
//   node --env-file=.env scripts/reclassify-kbeauty-hair.mjs
// Apply (writes a rollback backup first, then updates):
//   node --env-file=.env scripts/reclassify-kbeauty-hair.mjs --apply

import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APPLY = process.argv.includes("--apply");
const SUPPLIER_SLUG = "korean-beauty-trading-co";
const BACKUP_PATH = process.argv.find((a) => a.startsWith("--backup="))?.split("=")[1]
  ?? "reclassify-kbeauty-hair.backup.json";

function normalize(name) {
  return (name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ");
}

// Is this product hair-related at all?
function isHair(n) {
  return /\bhair\b|\bscalp\b|\bshampoo\b|\bconditioner\b|\bpomade\b|\bscrunchie\b|\bdepilat/i.test(n);
}

// Resolve the target Beauty>Hair subcategory slug. Order matters (first match wins).
function hairTarget(name) {
  const n = normalize(name);
  if (!isHair(n)) return null;
  if (/\bhair\s*removal\b|\bdepilat/i.test(n)) return "hair-removal";
  // Root / hairline coverage makeup -> temporary hair color (owner decision).
  if (/\bhair\s*cushion\b|\bhair\s*shadow\b|\bhair\s*shading\b|\bhairline\b|\bhair\s*line\b/i.test(n)) return "hair-dye";
  if (/\bhair\s*(dye|colou?r|bleach)\b/i.test(n)) return "hair-dye";
  // Accessories (brush/comb/tie/...) checked before shampoo so "Shampoo Brush" lands here.
  if (/\b(brush|comb)\b|\bhair\s*(tie|clip|band|pin|roller|curler|dryer|iron)\b|\bscrunchie\b/i.test(n)) return "hair-accessories";
  if (/\bshampoo\b/i.test(n)) return "hair-shampoo";
  if (/\bconditioner\b|\bhair\s*rinse\b/i.test(n)) return "hair-conditioner";
  return "beauty-hair"; // serum / oil / essence / mask / pack / treatment / tonic / mist / perfume / styling / scalp / pomade
}

const { data: company, error: compErr } = await admin
  .from("companies").select("id").eq("slug", SUPPLIER_SLUG).single();
if (compErr || !company) { console.error(`Supplier not found: ${compErr?.message}`); process.exit(1); }

const { data: cats, error: catErr } = await admin.from("categories").select("id, slug, name, path");
if (catErr) { console.error(catErr.message); process.exit(1); }
const idToCat = new Map(cats.map((c) => [c.id, c]));
const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

for (const slug of ["hair-shampoo", "hair-conditioner", "hair-dye", "hair-removal", "hair-accessories", "beauty-hair"]) {
  if (!slugToId.get(slug)) { console.error(`Missing target category slug: ${slug}`); process.exit(1); }
}

// Fetch all active products for the supplier.
const all = [];
let from = 0;
const PAGE = 1000;
for (;;) {
  const { data, error } = await admin
    .from("products")
    .select("id, name, category_id, category_ids")
    .eq("supplier_id", company.id)
    .eq("is_active", true)
    .order("id")
    .range(from, from + PAGE - 1);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

// A product is in the Baby/Kids tree if its current category path is under baby-products.
function inBabyTree(categoryId) {
  const c = idToCat.get(categoryId);
  return !!(c && c.path && c.path.split("/")[0] === "baby-products");
}

const moves = [];   // products that need a category change
let skippedBaby = 0;
let alreadyCorrect = 0;

for (const p of all) {
  const targetSlug = hairTarget(p.name);
  if (!targetSlug) continue;
  if (inBabyTree(p.category_id)) { skippedBaby++; continue; }
  const targetId = slugToId.get(targetSlug);
  if (p.category_id === targetId) { alreadyCorrect++; continue; }
  moves.push({ ...p, targetSlug, targetId });
}

// Report
const byTarget = new Map();
const byFrom = new Map();
for (const m of moves) {
  byTarget.set(m.targetSlug, (byTarget.get(m.targetSlug) ?? 0) + 1);
  const fromSlug = idToCat.get(m.category_id)?.slug ?? "<none>";
  byFrom.set(fromSlug, (byFrom.get(fromSlug) ?? 0) + 1);
}
console.log(`Supplier: ${SUPPLIER_SLUG} — ${all.length} active products\n`);
console.log(`Hair products to move: ${moves.length}`);
console.log(`Already correctly under Beauty>Hair: ${alreadyCorrect}`);
console.log(`Left in Baby/Kids taxonomy (untouched): ${skippedBaby}\n`);

console.log("=== Moving FROM (current category) ===");
for (const [k, n] of [...byFrom.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
console.log("\n=== Moving INTO (target Hair subcategory) ===");
for (const [k, n] of [...byTarget.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);

console.log("\n=== Sample of 30 moves ===");
console.log(moves.slice(0, 30).map((m) =>
  `  ${(idToCat.get(m.category_id)?.slug ?? "<none>").padEnd(22)} -> ${m.targetSlug.padEnd(17)} | ${m.name}`
).join("\n"));

if (!APPLY) {
  console.log(`\nDry run only — no writes. Re-run with --apply to write (a rollback backup is saved first).`);
  process.exit(0);
}

// --- APPLY ---
// 1) Rollback backup of exactly the rows we will touch.
const backup = moves.map((m) => ({ id: m.id, category_id: m.category_id, category_ids: m.category_ids }));
writeFileSync(BACKUP_PATH, JSON.stringify({ supplier: SUPPLIER_SLUG, when: new Date().toISOString(), rows: backup }, null, 2));
console.log(`\nBackup of ${backup.length} rows written to ${BACKUP_PATH}`);

// 2) Apply updates one row at a time (category_ids is per-row: swap old primary for new).
console.log("Applying updates...");
let ok = 0, fail = 0;
const now = new Date().toISOString();
for (const m of moves) {
  const oldIds = Array.isArray(m.category_ids) ? m.category_ids : [];
  const newIds = [m.targetId, ...oldIds.filter((x) => x !== m.category_id && x !== m.targetId)];
  const { error } = await admin
    .from("products")
    .update({ category_id: m.targetId, category_ids: newIds, updated_at: now })
    .eq("id", m.id);
  if (error) { fail++; if (fail <= 5) console.error(`  FAIL ${m.id}: ${error.message}`); }
  else { ok++; if (ok % 50 === 0) console.log(`  ...${ok}/${moves.length}`); }
}
console.log(`\nDone. Updated ${ok}, failed ${fail}. Rollback file: ${BACKUP_PATH}`);
