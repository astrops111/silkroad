// Downloads HODAF's product photos from the (now publicly shared) Google
// Drive links in the vendor spreadsheet and uploads them to Supabase Storage,
// then inserts product_images rows pointing at our own storage URLs.
//
// For folder links (most rows): fetches the Drive folder's server-rendered
// HTML (drive.google.com renders a real <table> of files for public folders,
// no JS/API needed) and extracts every image file's id + filename from
// `data-id="..."` / `aria-label="....jpg Image Shared"` pairs, capped at 6
// images per product. For direct file links (a few rows): downloads that one
// file. Each file is fetched as bytes via
// https://drive.usercontent.google.com/download?id=...&export=download.
//
// Idempotent: skips any product that already has product_images rows.
//
// Run: node --env-file=.env scripts/fetch-hodaf-images.mjs

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

const BUCKET = "product-images";
const MAX_IMAGES_PER_PRODUCT = 6;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = { vendor: "D", nameEn: "L", imgUrl: "U" };
  const rows = [];
  for (let r = 4; r <= 31; r++) {
    const get = (col) => { const cell = sheet[col + r]; return cell ? cell.v : null; };
    if (get(cols.vendor) !== "HODAF") continue;
    const nameEn = get(cols.nameEn);
    rows.push({ nameEn, slug: slugify(nameEn), imgUrl: get(cols.imgUrl) });
  }
  return rows;
}

function extFromName(name) {
  const m = name.match(/\.(jpe?g|png|gif|webp)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : null;
}

async function listFolderFiles(folderUrl) {
  const res = await fetch(folderUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`folder fetch ${res.status}`);
  const html = await res.text();
  const seen = new Set();
  const files = [];
  const re = /data-id="([\w-]{20,})"/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    const window = html.slice(m.index, m.index + 4000);
    const label = window.match(/aria-label="([^"]+)"/);
    if (!label) continue;
    const name = label[1].replace(/\s+Image Shared$/, "").trim();
    const ext = extFromName(name);
    if (!ext) continue; // skip non-image files (docs, videos, folders)
    seen.add(id);
    files.push({ id, name, ext });
    if (files.length >= MAX_IMAGES_PER_PRODUCT) break;
  }
  return files;
}

function fileIdFromDirectLink(fileUrl) {
  const m = fileUrl.match(/\/file\/d\/([\w-]+)/);
  return m ? m[1] : null;
}

async function downloadFile(id) {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`download ${id} -> ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`download ${id} -> not an image (${contentType})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType };
}

async function ensureBucket() {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await admin.storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw new Error(`createBucket failed: ${error.message}`);
  console.log(`[storage] created bucket "${BUCKET}"`);
}

async function resolveImageFiles(row) {
  if (row.imgUrl.includes("/file/d/")) {
    const id = fileIdFromDirectLink(row.imgUrl);
    return id ? [{ id, name: `${row.slug}.jpg`, ext: "jpg" }] : [];
  }
  if (row.imgUrl.includes("/folders/")) {
    return listFolderFiles(row.imgUrl);
  }
  return [];
}

async function processProduct(row) {
  const { data: product } = await admin.from("products").select("id").eq("slug", row.slug).maybeSingle();
  if (!product) { console.warn(`  ! product not found for slug ${row.slug}`); return; }

  const { count: existingCount } = await admin
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id);
  if (existingCount) { console.log(`  · ${row.nameEn}: already has ${existingCount} image(s) — skipping`); return; }

  let files;
  try {
    files = await resolveImageFiles(row);
  } catch (e) {
    console.error(`  ✗ ${row.nameEn}: could not list images — ${e.message}`);
    return;
  }
  if (!files.length) { console.warn(`  ! ${row.nameEn}: no images found in ${row.imgUrl}`); return; }

  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      const { buffer, contentType } = await downloadFile(f.id);
      const path = `hodaf/${row.slug}/${i}.${f.ext}`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
      rows.push({ product_id: product.id, url: pub.publicUrl, alt_text: row.nameEn, sort_order: i, is_primary: i === 0 });
    } catch (e) {
      console.error(`    ✗ image ${f.name} (${f.id}): ${e.message}`);
    }
  }

  if (!rows.length) { console.warn(`  ! ${row.nameEn}: all image downloads failed`); return; }
  const { error: insErr } = await admin.from("product_images").insert(rows);
  if (insErr) { console.error(`  ✗ ${row.nameEn}: product_images insert failed — ${insErr.message}`); return; }
  console.log(`  ✓ ${row.nameEn}: ${rows.length} image(s) uploaded`);
}

console.log(`Fetching HODAF images into: ${URL}\n`);
await ensureBucket();
const rows = loadRows();
console.log(`[xlsx] ${rows.length} HODAF rows\n`);

for (const row of rows) {
  await processProduct(row);
}
console.log(`\nDone.`);
