// Downloads AMS Bioteq product photos from ams-bioteq.com and uploads them to
// Supabase Storage (bucket "product-images", path ams-bioteq/{slug}/{i}.png),
// then inserts product_images rows pointing at our own storage URLs — same
// storage convention as fetch-hodaf-images.mjs.
//
// Unlike HODAF (Drive folders in the sheet), the AMS sheet has no image links;
// the vendor's own site pages hold the shots, so the mapping is hardcoded:
//  - the 5 Lumière d'Art masks: per-variant packshots from technology.php?id=6
//    (verified visually — each pack prints its "Lumi …" English name)
//  - the 5 SIPSIP products: packshot (technology3_proN) + usage illustration
//    (傷口照護-0N) from technology.php?id=4; the 4 FID dressings share the
//    foam-dressing packshot + illustration.
//
// Idempotent: skips any product that already has product_images rows.
//
// Run: node --env-file=.env scripts/fetch-ams-bioteq-images.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const BUCKET = "product-images";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SITE = "https://www.ams-bioteq.com/data/editor";
const MASK = (zhName) => `${SITE}/files/${encodeURIComponent(`面膜包裝_${zhName}-01.png`)}`;
const WOUND = (n) => `${SITE}/files/${encodeURIComponent(`傷口照護-0${n}.png`)}`;
const PRO = (n) => `${SITE}/images/technology3_pro${n}.png`;

// slug -> ordered image URLs (first = primary)
const IMAGES = {
  "lumi-rejuvenate-anti-aging-mask":  [MASK("維納斯")],
  "lumi-bright-brightening-mask":     [MASK("星夜")],
  "lumi-radiance-pore-refining-mask": [MASK("睡蓮")],
  "lumi-serenity-soothing-mask":      [MASK("澆花夫人")],
  "lumi-balance-deep-cleansing-mask": [MASK("放鵝少女")],
  "adhesive-remover-spray":           [PRO(1), WOUND(1)],
  "no-rinse-foam-cleanser":           [PRO(2), WOUND(2)],
  "sting-free-skin-barrier-spray":    [PRO(3), WOUND(3)],
  "wound-gel-sterile":                [PRO(4), WOUND(4)],
  "fid0505-foam-dressing":            [PRO(5), WOUND(5)],
  "fid1012-foam-dressing":            [PRO(5), WOUND(5)],
  "fid1020-foam-dressing":            [PRO(5), WOUND(5)],
  "fid1515-foam-dressing":            [PRO(5), WOUND(5)],
};

async function downloadImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`not an image (${contentType}): ${url}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType };
}

async function ensureBucket() {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await admin.storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw new Error(`createBucket failed: ${error.message}`);
  console.log(`[storage] created bucket "${BUCKET}"`);
}

async function processProduct(slug, urls) {
  const { data: product } = await admin.from("products").select("id, name").eq("slug", slug).maybeSingle();
  if (!product) { console.warn(`  ! product not found for slug ${slug}`); return; }

  const { count: existingCount } = await admin
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id);
  if (existingCount) { console.log(`  · ${product.name}: already has ${existingCount} image(s) — skipping`); return; }

  const rows = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const { buffer, contentType } = await downloadImage(urls[i]);
      const path = `ams-bioteq/${slug}/${i}.png`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
      rows.push({ product_id: product.id, url: pub.publicUrl, alt_text: product.name, sort_order: i, is_primary: i === 0 });
    } catch (e) {
      console.error(`    ✗ image ${urls[i]}: ${e.message}`);
    }
  }

  if (!rows.length) { console.warn(`  ! ${product.name}: all image downloads failed`); return; }
  const { error: insErr } = await admin.from("product_images").insert(rows);
  if (insErr) { console.error(`  ✗ ${product.name}: product_images insert failed — ${insErr.message}`); return; }
  console.log(`  ✓ ${product.name}: ${rows.length} image(s) uploaded`);
}

console.log(`Fetching AMS Bioteq images into: ${URL}\n`);
await ensureBucket();
for (const [slug, urls] of Object.entries(IMAGES)) {
  await processProduct(slug, urls);
}
console.log(`\nDone.`);
