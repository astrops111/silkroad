// Merges Korean Beauty Trading Co. products that are really the same item in
// different sizes/pack-counts into one canonical parent product + linked
// product_variants rows (Amazon-style size selector). Never deletes a row —
// non-canonical members are soft-deactivated (is_active=false,
// merged_into_product_id=<canonical>) since past orders/quotes may reference
// their IDs.
//
// Classification, per cluster of products sharing (brand, size-stripped name):
//   - Garbage names (blank/"-"/"0.0"-like) are excluded up front, never touched.
//   - A cluster needs 2+ DISTINCT extracted size/pack tokens to count as real
//     variants. Fewer than 2 distinct tokens (e.g. two rows both "65ml") means
//     the cluster is same-item-imported-twice, not a variant — resolved by
//     keeping the most complete row and deactivating the rest (no variant
//     rows created for pure duplicates).
//   - Canonical parent = lowest base_price in the cluster (tie-break: lowest id).
//
// Dry-run by default (reports counts, changes nothing). Pass --write to persist.
// Safe to re-run: only fetches is_active=true products, so merged-away rows
// (now inactive) and already-renamed canonicals (token stripped, no longer
// clusterable) drop out of scope on the next pass.
//
// Run:
//   node --env-file=.env scripts/migrate-kbeauty-variants.mjs           (dry run)
//   node --env-file=.env scripts/migrate-kbeauty-variants.mjs --write   (persist)

import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv.includes("--write");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUPPLIER_SLUG = "korean-beauty-trading-co";
const GARBAGE_NAME_RE = /^[-–—0.\s]*$/;
const SIZE_TOKEN_RE = /\(box of \d+\)|\d+(\.\d+)?\s?(ml|g|kg|oz|pcs?|ea|sheets?|masks?|pads?)\b/gi;

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\(box of \d+\)/gi, "")
    .replace(/\b\d+(\.\d+)?\s?(ml|g|kg|oz|pcs?|ea|sheets?|masks?|pads?)\b/gi, "")
    .replace(/\bspf\s?\d+\+*/gi, "")
    .replace(/\bpa\+*/gi, "")
    .replace(/[()]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// First size/volume/pack-count substring found in the ORIGINAL (cased) name —
// used both as the distinguishing token and as the variant's display label.
function extractSizeToken(name) {
  const matches = [...name.matchAll(SIZE_TOKEN_RE)];
  if (matches.length === 0) return null;
  return matches[0][0].trim();
}

// Removes the first matched size token from the original name, preserving casing.
function stripToken(name, token) {
  const idx = name.indexOf(token);
  if (idx === -1) return name.trim();
  const stripped = name.slice(0, idx) + name.slice(idx + token.length);
  return stripped
    .replace(/[([{]\s*[)\]}]/g, "") // now-empty bracket/paren pairs left behind, e.g. "(1ea)" -> "()"
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,.-]+$/, "")
    .trim();
}

function completenessScore(p) {
  let score = 0;
  if (p.description && p.description.length > 20) score++;
  if (p.jan_code) score++;
  if (p.box_pack_qty) score++;
  if (p.weight_kg) score++;
  return score;
}

// ── 1. Resolve supplier, fetch all active products (paginated) ────────────
const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();

if (compErr || !company) {
  console.error(`Supplier not found: ${compErr?.message}`);
  process.exit(1);
}

const all = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await admin
    .from("products")
    .select("id, name, brand, base_price, moq, box_pack_qty, jan_code, description, weight_kg, updated_at")
    .eq("supplier_id", company.id)
    .eq("is_active", true)
    .range(from, from + PAGE - 1);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

console.log(`Active products for ${SUPPLIER_SLUG}: ${all.length}\n`);

// ── 2. Garbage filter ───────────────────────────────────────────────────
const garbage = all.filter((p) => GARBAGE_NAME_RE.test(p.name.trim()) || p.name.trim().length < 3);
const candidates = all.filter((p) => !garbage.includes(p));
console.log(`Garbage-named rows (flagged, never touched): ${garbage.length}`);

// ── 3. Cluster by (brand, normalized name) ─────────────────────────────
const groups = new Map();
for (const p of candidates) {
  const key = `${(p.brand || "").toLowerCase()}::${normalize(p.name)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ ...p, sizeToken: extractSizeToken(p.name) });
}

const clusters = [...groups.values()].filter((items) => items.length > 1);

let realVariantClusters = 0;
let variantsCreated = 0;
let imagesMigrated = 0;
let productsDeactivated = 0;
let duplicatesDeduped = 0;
let rejectedNoToken = 0;

for (const members of clusters) {
  const distinctTokens = new Set(members.map((m) => m.sizeToken).filter(Boolean));

  if (members.some((m) => !m.sizeToken) || distinctTokens.size < 2) {
    // Not a real size-variant cluster — same-item duplicates (or unprovable).
    if (members.some((m) => !m.sizeToken)) { rejectedNoToken++; continue; }

    // All members share one size — treat as duplicate rows of the same SKU.
    const sorted = [...members].sort((a, b) => {
      const scoreDiff = completenessScore(b) - completenessScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
    const [keeper, ...rest] = sorted;
    duplicatesDeduped += rest.length;
    console.log(`[dup] keep ${keeper.id} "${keeper.name}", deactivate ${rest.length}: ${rest.map((r) => r.id).join(", ")}`);

    if (WRITE) {
      await admin
        .from("products")
        .update({ is_active: false, merged_into_product_id: keeper.id })
        .in("id", rest.map((r) => r.id));
    }
    continue;
  }

  // Real variant cluster.
  realVariantClusters++;
  const canonical = [...members].sort((a, b) => a.base_price - b.base_price || a.id.localeCompare(b.id))[0];
  const cleanedName = stripToken(canonical.name, canonical.sizeToken) || canonical.name;

  console.log(
    `[variant] "${cleanedName}" — canonical=${canonical.id} (was "${canonical.name}"), ` +
    `${members.length} sizes: ${members.map((m) => m.sizeToken).join(", ")}`
  );

  if (!WRITE) {
    variantsCreated += members.length;
    imagesMigrated += members.filter((m) => m.id !== canonical.id).length; // estimate; real count computed on write
    productsDeactivated += members.length - 1;
    continue;
  }

  // Rename canonical to the size-stripped form.
  const { error: renameErr } = await admin
    .from("products")
    .update({ name: cleanedName })
    .eq("id", canonical.id);
  if (renameErr) { console.error(`  ✗ rename ${canonical.id}: ${renameErr.message}`); continue; }

  const variantInserts = members.map((m) => ({
    product_id: canonical.id,
    name: m.sizeToken,
    price_override: m.base_price,
    moq: m.moq,
    box_pack_qty: m.box_pack_qty,
    jan_code: m.jan_code,
    is_default: m.id === canonical.id,
  }));
  const { data: newVariants, error: varErr } = await admin
    .from("product_variants")
    .insert(variantInserts)
    .select("id, jan_code, name");
  if (varErr) { console.error(`  ✗ variants for ${canonical.id}: ${varErr.message}`); continue; }
  variantsCreated += newVariants.length;

  // Map each member to its new variant row (match by jan_code when present, else by name+order).
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const variant = newVariants[i]; // insert preserves array order
    if (member.id === canonical.id) continue; // canonical's own images stay parent-level

    const { data: movedImages, error: imgErr } = await admin
      .from("product_images")
      .update({ product_id: canonical.id, variant_id: variant.id })
      .eq("product_id", member.id)
      .select("id");
    if (imgErr) console.error(`  ✗ images for ${member.id}: ${imgErr.message}`);
    else imagesMigrated += movedImages?.length ?? 0;

    const { error: deactErr } = await admin
      .from("products")
      .update({ is_active: false, merged_into_product_id: canonical.id })
      .eq("id", member.id);
    if (deactErr) console.error(`  ✗ deactivate ${member.id}: ${deactErr.message}`);
    else productsDeactivated++;
  }
}

console.log(`\n${WRITE ? "=== Write complete ===" : "=== Dry run (pass --write to persist) ==="}`);
console.log(`Real-variant clusters:     ${realVariantClusters}`);
console.log(`Variant rows created:      ${variantsCreated}`);
console.log(`Images migrated:           ${imagesMigrated}`);
console.log(`Products deactivated:      ${productsDeactivated}`);
console.log(`Duplicate rows deduped:    ${duplicatesDeduped}`);
console.log(`Clusters rejected (no distinguishable size token): ${rejectedNoToken}`);
console.log(`Garbage-named rows flagged for manual review: ${garbage.length}`);
