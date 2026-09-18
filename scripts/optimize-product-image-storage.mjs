// One-time re-processing of the existing objects in the "products" and
// "product-images" buckets: resizes/recompresses oversized photos and
// re-uploads every object with a much longer Cache-Control than Supabase's
// upload default (max-age=3600). Both buckets were found driving the
// project's egress-quota restriction — see memory:
// project_buy_supabase_linter_fixes_2026-09-18.md.
//
// Paths are NOT changed (product_images.url stores the full path including
// extension), so this is safe to run in place. "products" bucket paths are
// content-unique (timestamp+random, upsert:false at upload time) so an
// immutable 1-year cache is safe there. "product-images" bucket paths are
// stable/reusable per product (hodaf/<slug>/<n>.<ext>, upsert:true), so a
// re-scrape could change bytes under the same URL — capped at 30 days
// there instead of a full year.
//
// Run: node --env-file=.env scripts/optimize-product-image-storage.mjs [--limit=N] [--dry-run]

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

const MAX_DIMENSION = 1600; // px, long edge
const RESIZABLE_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);

const BUCKETS = [
  { bucket: "products", cacheControl: "31536000" }, // 1y — paths are unique per upload
  { bucket: "product-images", cacheControl: "2592000" }, // 30d — paths are reused across re-scrapes
];

async function listAllFiles(bucket, prefix = "") {
  const out = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefix} failed: ${error.message}`);
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // Folder placeholder — recurse.
      out.push(...(await listAllFiles(bucket, fullPath)));
    } else {
      out.push({ path: fullPath, size: entry.metadata?.size ?? 0 });
    }
  }
  return out;
}

function extOf(path) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path);
  return m ? m[1].toLowerCase() : "";
}

async function processOne(bucket, path, cacheControl) {
  const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(path);
  if (dlErr) throw new Error(`download failed: ${dlErr.message}`);
  const inputBuffer = Buffer.from(await blob.arrayBuffer());
  const originalBytes = inputBuffer.length;

  const ext = extOf(path);
  let outputBuffer = inputBuffer;
  let contentType = blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

  if (RESIZABLE_FORMATS.has(ext)) {
    const img = sharp(inputBuffer, { failOn: "none" }).rotate(); // auto-orient, then strip orientation tag
    const meta = await img.metadata();
    const needsResize = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;

    let pipeline = img;
    if (needsResize) {
      pipeline = pipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    if (ext === "jpeg" || ext === "jpg") {
      pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      contentType = "image/jpeg";
    } else if (ext === "webp") {
      pipeline = pipeline.webp({ quality: 82 });
      contentType = "image/webp";
    } else if (ext === "png") {
      pipeline = pipeline.png({ quality: 82, compressionLevel: 9 });
      contentType = "image/png";
    }
    const candidate = await pipeline.toBuffer();
    // Only keep the re-encode if it actually shrank the file — a few
    // already-small/already-compressed images can grow slightly on re-encode.
    if (candidate.length < originalBytes) outputBuffer = candidate;
  }

  if (DRY_RUN) {
    return { path, originalBytes, newBytes: outputBuffer.length, uploaded: false };
  }

  const { error: upErr } = await admin.storage.from(bucket).upload(path, outputBuffer, {
    contentType,
    upsert: true,
    cacheControl,
  });
  if (upErr) throw new Error(`upload failed: ${upErr.message}`);

  return { path, originalBytes, newBytes: outputBuffer.length, uploaded: true };
}

async function main() {
  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;
  let failed = 0;

  for (const { bucket, cacheControl } of BUCKETS) {
    console.log(`\n=== ${bucket} (cacheControl=${cacheControl}) ===`);
    const files = await listAllFiles(bucket);
    console.log(`  ${files.length} object(s) found`);

    for (const f of files) {
      if (processed >= LIMIT) break;
      try {
        const result = await processOne(bucket, f.path, cacheControl);
        totalOriginal += result.originalBytes;
        totalNew += result.newBytes;
        processed++;
        const pct = result.originalBytes > 0
          ? Math.round((1 - result.newBytes / result.originalBytes) * 100)
          : 0;
        console.log(
          `  ✓ ${f.path}: ${result.originalBytes} -> ${result.newBytes} bytes (${pct >= 0 ? "-" : "+"}${Math.abs(pct)}%)${DRY_RUN ? " [dry-run]" : ""}`
        );
      } catch (err) {
        failed++;
        console.error(`  ✗ ${f.path}: ${err.message}`);
      }
    }
    if (processed >= LIMIT) break;
  }

  console.log(
    `\nDone. Processed ${processed}, failed ${failed}. Total bytes ${totalOriginal} -> ${totalNew} (${
      totalOriginal > 0 ? Math.round((1 - totalNew / totalOriginal) * 100) : 0
    }% reduction).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
