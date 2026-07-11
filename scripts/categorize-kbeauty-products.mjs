// Categorize Korean-beauty products (currently all sitting in the generic
// Beauty > Facial bucket) into the proper skincare/makeup subcategory by
// matching product names against an evidence-tuned keyword ruleset.
//
// Dry run (default): prints the full classification report, writes nothing.
// Run:      node --env-file=.env scripts/categorize-kbeauty-products.mjs
// Apply:    node --env-file=.env scripts/categorize-kbeauty-products.mjs --apply

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
const SOURCE_CATEGORY_ID = "a0000004-0001-0000-0000-000000000000"; // Beauty > Facial (generic bucket)

// Populated from the DB below (slug -> id), covers both pre-existing leaves
// (00045_reseed_categories.sql) and the new ones (00104_beauty_subcategory_expansion.sql)
const CATEGORY_ID = {
  "makeup-nails": "",
  "makeup-lips": "",
  "beauty-lip": "",
  "makeup-eyes": "",
  "makeup-cheek": "",
  "makeup-face": "",
  "facial-sun-protection": "",
  "facial-masks": "",
  "facial-cleaning": "",
  "facial-sprays": "",
  "facial-toner": "",
  "facial-serum": "",
  "hair-shampoo": "",
  "hair-conditioner": "",
  "body-fragrance": "",
  "body-cleaning": "",
  "facial-cream": "",
};

// Source names mix underscores/dots/brackets as separators and sometimes
// concatenate words (camelCase or plain lowercase, e.g. "AirMask",
// "eyeshadow") — normalize before matching so \b word-boundary keywords
// aren't defeated by punctuation, and split camelCase transitions.
function normalize(name) {
  return (name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ");
}

// Ordered rules — first match wins. Order matters: more specific / higher
// collision-risk categories are checked first (e.g. "lip liner" must resolve
// to makeup-lips before the generic eyes "liner" rule fires). Matched
// against the normalized name (see normalize() above).
const RULES = [
  ["makeup-nails", /\bnail\b/i],
  ["makeup-lips", /\btint\b|\blipstick\b|lip\s*liner|lip\s*gloss|lip\s*lacquer|lip\s*ink|lip.*(velvet|matte)/i],
  ["beauty-lip", /\blip\b/i], // remaining lip-* items after color-cosmetics carved out above (balm/mask/treatment/oil)
  ["makeup-cheek", /\bblush\b|\bblusher\b|\bcheek\b|highlighter/i],
  ["makeup-eyes", /\beyes?\b|eyeshadow|eyeliner|eyebrow|\bmascara\b|\bbrow\b|\blash\b|\bshadow\b|\bliner\b|\bpalette\b/i],
  ["makeup-face", /\bcushion\b|\bfoundation\b|\bconcealer\b|\bbb\s*cream\b|\bcc\s*cream\b|\bprimer\b|setting\s*powder|pressed\s*powder/i],
  ["facial-sun-protection", /\bspf\b|sun\s*cream|sunscreen|sun\s*screen|sun\s*serum|sun\s*stick|uv\s*protect|\bsun\b/i],
  ["facial-masks", /\bmask\b/i],
  ["facial-cleaning", /cleans|\bfoam\b|facial\s*wash|micellar|\bwash\b/i],
  ["facial-toner", /\btoner\b|\btoning\b/i],
  ["facial-serum", /\bserum\b|\bessence\b|\bampoule\b|\bbooster\b/i],
  ["hair-shampoo", /\bshampoo\b/i],
  ["hair-conditioner", /\bconditioner\b/i],
  ["body-fragrance", /\bperfume\b|eau\s*de|\bcologne\b|\bfragrance\b/i],
  ["body-cleaning", /body\s*scrub|body\s*wash|bath\s*bomb|shower\s*gel/i],
  ["facial-cream", /\bcream\b|\blotion\b|moistur|\bemulsion\b|\bbalm\b|\bgel\b/i],
  ["facial-sprays", /\bmist\b|\bspray\b/i],
  ["facial-toner", /\bpad\b/i], // pre-soaked toner pads — weaker signal, checked last before giving up
];

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
      .select("id, name")
      .eq("category_id", SOURCE_CATEGORY_ID)
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

function classify(name) {
  const normalized = normalize(name);
  for (const [slug, re] of RULES) {
    if (re.test(normalized)) return slug;
  }
  return null;
}

async function main() {
  const slugToId = await loadCategorySlugToId();
  for (const slug of Object.keys(CATEGORY_ID)) {
    if (!slugToId[slug]) throw new Error(`Category slug not found in DB: ${slug} — did migration 00104 apply?`);
    CATEGORY_ID[slug] = slugToId[slug];
  }

  const products = await fetchAllProducts();
  console.log(`Fetched ${products.length} products currently in the generic Facial bucket.\n`);

  const buckets = new Map(); // slug -> product ids
  const unmatched = [];
  for (const p of products) {
    const slug = classify(p.name);
    if (!slug) {
      unmatched.push(p);
      continue;
    }
    if (!buckets.has(slug)) buckets.set(slug, []);
    buckets.get(slug).push(p.id);
  }

  console.log("=== Classification report ===");
  for (const [slug, ids] of [...buckets.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${slug.padEnd(24)} ${ids.length}`);
  }
  console.log(`  ${"UNMATCHED (left as-is)".padEnd(24)} ${unmatched.length}`);
  console.log(`  ${"TOTAL".padEnd(24)} ${products.length}\n`);

  if (!APPLY) {
    console.log("Dry run only — no writes made. Re-run with --apply to write category_id updates.");
    console.log("\nSample of 30 UNMATCHED names (left in the generic Facial bucket):");
    console.log(unmatched.slice(0, 30).map((p) => p.name).join("\n"));
    return;
  }

  console.log("Applying category_id updates in batches of 500...");
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
