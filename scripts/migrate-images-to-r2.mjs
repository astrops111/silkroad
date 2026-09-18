// One-time migration: copies every object in the Supabase Storage "products"
// and "product-images" buckets to Cloudflare R2, then repoints product_images
// rows at the new R2 URL. Both buckets were found driving the project's
// egress-quota restriction — see memory: project_buy_supabase_linter_fixes_2026-09-18.md.
//
// Keys are prefixed with their source bucket name in R2 (products/... ,
// product-images/...) to avoid collisions between the two buckets.
//
// Dry-run by default (lists what would change, uploads nothing, writes
// nothing). Pass --apply to actually copy objects and update the DB.
//
// Run: node --env-file=.env scripts/migrate-images-to-r2.mjs [--limit=N] [--apply]

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "buy-product-images";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error("Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_URL in env.");
  process.exit(1);
}
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

const SOURCE_BUCKETS = ["products", "product-images"];

async function listAllFiles(bucket, prefix = "") {
  const out = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefix} failed: ${error.message}`);
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      out.push(...(await listAllFiles(bucket, fullPath))); // folder placeholder — recurse
    } else {
      out.push({ path: fullPath });
    }
  }
  return out;
}

function r2PublicUrl(key) {
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

async function migrateOne(bucket, path) {
  const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(path);
  if (dlErr) throw new Error(`download failed: ${dlErr.message}`);
  const buf = Buffer.from(await blob.arrayBuffer());
  const contentType = blob.type || "application/octet-stream";

  const key = `${bucket}/${path}`;
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  const oldUrl = pub.publicUrl;
  const newUrl = r2PublicUrl(key);

  if (!APPLY) {
    return { key, oldUrl, newUrl, bytes: buf.length, updatedRows: 0 };
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const { data: updated, error: updErr } = await admin
    .from("product_images")
    .update({ url: newUrl })
    .eq("url", oldUrl)
    .select("id");
  if (updErr) throw new Error(`product_images update failed: ${updErr.message}`);

  return { key, oldUrl, newUrl, bytes: buf.length, updatedRows: updated?.length ?? 0 };
}

async function main() {
  let migrated = 0;
  let failed = 0;
  let rowsUpdated = 0;
  let unmatched = 0;

  for (const bucket of SOURCE_BUCKETS) {
    console.log(`\n=== ${bucket} ===`);
    const files = await listAllFiles(bucket);
    console.log(`  ${files.length} object(s) found`);

    for (const f of files) {
      if (migrated + failed >= LIMIT) break;
      try {
        const result = await migrateOne(bucket, f.path);
        migrated++;
        rowsUpdated += result.updatedRows;
        if (result.updatedRows === 0) unmatched++;
        console.log(
          `  ${APPLY ? "✓" : "·"} ${f.path} -> ${result.key} (${result.bytes}b, ${result.updatedRows} row(s) repointed)${APPLY ? "" : " [dry-run]"}`
        );
      } catch (err) {
        failed++;
        console.error(`  ✗ ${f.path}: ${err.message}`);
      }
    }
    if (migrated + failed >= LIMIT) break;
  }

  console.log(
    `\nDone. Migrated ${migrated}, failed ${failed}, product_images rows repointed ${rowsUpdated}, objects with no matching row ${unmatched}.${
      APPLY ? "" : " Dry-run only — pass --apply to actually copy objects and update the DB."
    }`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
