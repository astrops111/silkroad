// Find and classify baby/kids products, which are currently scattered
// across adult Beauty subcategories (Baby Products has zero products).
//
// Detection is keyword-driven (baby/kids/infant/etc.) per instruction, but
// filtered: a known dedicated kids/baby brand/line is a strong positive
// override; otherwise, known false-positive patterns are excluded first
// (adult products where "Baby Powder"/"Baby Cotton" is a fragrance note,
// or "Baby [Color]" is a makeup shade name — e.g. "Kissholic Lipstick
// Intense CR04 Baby Coral" is not a baby product).
//
// Dry run (default): prints the full classification report, writes nothing.
// Run:      node --env-file=.env scripts/categorize-baby-kids-products.mjs
// Apply:    node --env-file=.env scripts/categorize-baby-kids-products.mjs --apply

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

// Populated from the DB below (slug -> id) — new leaves from
// 00105_baby_products_subcategory_expansion.sql, plus the pre-existing
// "diapers" leaf from 00045_reseed_categories.sql.
const CATEGORY_ID = {
  "baby-oral-care": "",
  "diapers": "",
  "baby-sun-care": "",
  "kids-beauty-accessories": "",
  "baby-hair-care": "",
  "baby-laundry-household": "",
  "baby-bath-wash": "",
  "baby-skincare": "",
};

function normalize(name) {
  return (name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ");
}

// Strong positive: recognized dedicated kids/baby brand or product line —
// classify regardless of other signals.
// Matched against the normalized name — normalize() strips punctuation
// (e.g. "Kids & Baby" -> "Kids Baby"), so "and"/"&" must not appear literally.
const KID_BRAND_RE =
  /\bgoongbe\b|\batopalm\b|beyond angel|i m pinky|pinky tonky|baby mild|chicka kids|hoho nut baby|kids\s+(baby|mom)\b|uv master kids|dashu kids|centella family.*kids|beta glucan family.*kids|nard baby (facial|lotion|wash|cream|shampoo)/i;

// Known false positives: "Baby Powder/Cotton/Musk" as a fragrance note on
// an adult wash/lotion/perfume, or "Baby [Color]" as a makeup shade name.
const EXCLUDE_RE =
  /baby\s*(powder|cotton|musk)\b|baby\s*(coral|pink|peach|apple|berry|fairy|smile|bean|cor)\b|baby\s*heel|baby\s*soft\s*foot|baby\s*taptap|(lip|cheek|blush|highlighter).{0,20}\bbaby\b|\bbaby\b.{0,20}(lip|cheek|blush|highlighter|pudding pot)/i;

// Generic base trigger (checked only if not already brand-matched and not excluded).
const BABY_RE = /\bbaby\b|\bbabies\b|\bkids?\b|\binfant\b|\btoddler\b|\bnewborn\b|\bnursery\b|\bpacifier\b/i;

function isBabyKidsProduct(normalized) {
  if (KID_BRAND_RE.test(normalized)) return true;
  if (EXCLUDE_RE.test(normalized)) return false;
  return BABY_RE.test(normalized);
}

// Product-type sub-bucket, first match wins.
const TYPE_RULES = [
  ["baby-oral-care", /\btoothpaste\b|\btoothbrush\b/i],
  ["diapers", /\bdiaper\b|\bwipes?\b|hip\s*cleanser/i],
  ["baby-sun-care", /sun\s*(cream|stick|cushion)|\bspf\b|sunscreen|\buv\b/i],
  ["kids-beauty-accessories", /nail\s*(paint|sticker)|sticker\s*earring|lip\s*crayon|hair\s*tie|color\s*lip\s*balm/i],
  ["baby-hair-care", /\bshampoo\b|\bconditioner\b|detangler|hair\s*(essence|oil|serum|wax)/i],
  ["baby-laundry-household", /laundry|fabric\s*softener|\bbleach\b|dish\s*(soap|cleanser)|bottle.*cleanser/i],
  ["baby-bath-wash", /\bwash\b|\bsoap\b|\bbubble\b|cleanser|cleaner/i],
];

function classifyType(normalized) {
  for (const [slug, re] of TYPE_RULES) {
    if (re.test(normalized)) return slug;
  }
  return "baby-skincare"; // fallback: cream/lotion/gel/mask/mist/oil/serum/powder/balm
}

async function loadCategorySlugToId() {
  const { data, error } = await admin.from("categories").select("id, slug");
  if (error) throw new Error(error.message);
  const map = {};
  for (const row of data) map[row.slug] = row.id;
  return map;
}

async function fetchAllProducts() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await admin
      .from("products")
      .select("id, name, category_id")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  const slugToId = await loadCategorySlugToId();
  for (const slug of Object.keys(CATEGORY_ID)) {
    if (!slugToId[slug]) throw new Error(`Category slug not found in DB: ${slug} — did migration 00105 apply?`);
    CATEGORY_ID[slug] = slugToId[slug];
  }

  const products = await fetchAllProducts();
  console.log(`Scanned ${products.length} products across the whole catalog.\n`);

  const buckets = new Map(); // slug -> product ids
  for (const p of products) {
    const normalized = normalize(p.name);
    if (!isBabyKidsProduct(normalized)) continue;
    const slug = classifyType(normalized);
    if (!buckets.has(slug)) buckets.set(slug, []);
    buckets.get(slug).push(p.id);
  }

  // Separately compute what the exclusion filter caught, for transparency.
  const excludedNames = [];
  for (const p of products) {
    const normalized = normalize(p.name);
    if (BABY_RE.test(normalized) && !KID_BRAND_RE.test(normalized) && EXCLUDE_RE.test(normalized)) {
      excludedNames.push(p.name);
    }
  }

  console.log("=== Classification report ===");
  let total = 0;
  for (const [slug, ids] of [...buckets.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${slug.padEnd(26)} ${ids.length}`);
    total += ids.length;
  }
  console.log(`  ${"TOTAL classified as baby/kids".padEnd(26)} ${total}`);
  console.log(`  ${"Excluded false positives".padEnd(26)} ${excludedNames.length}\n`);

  console.log("=== Excluded (false-positive) names, left in current category ===");
  console.log(excludedNames.join("\n"));

  if (!APPLY) {
    console.log("\nDry run only — no writes made. Re-run with --apply to write category_id updates.");
    return;
  }

  console.log("\nApplying category_id updates in batches of 500...");
  const BATCH = 500;
  for (const [slug, ids] of buckets.entries()) {
    const categoryId = CATEGORY_ID[slug];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      const { error } = await admin
        .from("products")
        .update({ category_id: categoryId, updated_at: new Date().toISOString() })
        .in("id", chunk);
      if (error) {
        console.error(`  FAILED batch for ${slug} [${i}-${i + chunk.length}]: ${error.message}`);
      } else {
        console.log(`  ${slug}: updated ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
      }
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
