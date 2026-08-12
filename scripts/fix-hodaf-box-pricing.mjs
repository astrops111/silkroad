// Fixes a pricing bug in seed-hodaf.mjs: base_price/cogs were set to the
// vendor's per-BOX cost (COGS * 1.17), but the platform's product-detail page
// treats products.base_price as a PER-PIECE price and multiplies it by
// box_pack_qty to show the box price (see product-detail-client.tsx: `const
// boxPrice = unitPrice * boxPackQty`). Since box_pack_qty was left null
// (defaults to 1), the storefront was showing the full box price as if it
// were the per-piece price.
//
// This mirrors the korean-beauty-trading-co convention (see
// backfill-kbeauty-box-pack-qty.mjs / import-drive-catalog.mjs): base_price
// and cogs are per piece, box_pack_qty is pieces-per-box, and moq = box_pack_qty
// so the minimum order is exactly 1 box.
//
// For each HODAF product: box_pack_qty = pieces-per-box parsed from the
// vendor spec column (AK), moq = box_pack_qty, base_price/cogs divided by
// that same pieces-per-box.
//
// Run: node --env-file=.env scripts/fix-hodaf-box-pricing.mjs

import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = join(
  __dirname,
  "..",
  "sheet_image_updates",
  "original",
  "new",
  "vendor list for Annie .xlsx"
);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const MARKUP = 1.17;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// "36貼/板，4板/盒" -> 144 (multiply the leading count of each comma-separated segment)
function parsePiecesPerBox(specStr) {
  if (!specStr) return null;
  const segments = specStr.split(/[，,]/);
  let total = 1;
  let found = false;
  for (const seg of segments) {
    const m = seg.match(/^(\d+)/);
    if (m) {
      total *= parseInt(m[1], 10);
      found = true;
    }
  }
  return found ? total : null;
}

function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = { vendor: "D", nameEn: "L", cogs: "S", spec: "AK" };
  const rows = [];
  for (let r = 4; r <= 31; r++) {
    const get = (col) => { const cell = sheet[col + r]; return cell ? cell.v : null; };
    const vendor = get(cols.vendor);
    if (vendor !== "HODAF") continue;
    const row = {};
    for (const [k, col] of Object.entries(cols)) row[k] = get(col);
    row.slug = slugify(row.nameEn);
    row.piecesPerBox = parsePiecesPerBox(row.spec) ?? 1;
    rows.push(row);
  }
  return rows;
}

const rows = loadRows();
console.log(`[xlsx] ${rows.length} HODAF rows found\n`);

let updated = 0, failed = 0, skipped = 0;
for (const row of rows) {
  const { data: product, error: findErr } = await admin
    .from("products")
    .select("id, base_price, cogs")
    .eq("slug", row.slug)
    .maybeSingle();

  if (findErr) { failed++; console.error(`  ✗ lookup ${row.slug}: ${findErr.message}`); continue; }
  if (!product) { skipped++; console.warn(`  ! not found: ${row.slug}`); continue; }

  const boxPackQty = row.piecesPerBox;
  const cogsPerPieceCents = Math.round((row.cogs * 100) / boxPackQty);
  const basePricePerPieceCents = Math.round((row.cogs * MARKUP * 100) / boxPackQty);

  const { error: updateErr } = await admin
    .from("products")
    .update({
      box_pack_qty: boxPackQty,
      moq: boxPackQty,
      cogs: cogsPerPieceCents,
      base_price: basePricePerPieceCents,
    })
    .eq("id", product.id);

  if (updateErr) { failed++; console.error(`  ✗ update ${row.slug}: ${updateErr.message}`); continue; }
  updated++;
  console.log(
    `  ✓ ${row.nameEn}: box_pack_qty=${boxPackQty}, moq=${boxPackQty}, ` +
    `base_price ${(product.base_price / 100).toFixed(2)} -> ${(basePricePerPieceCents / 100).toFixed(2)}/pc ` +
    `(box total $${((basePricePerPieceCents * boxPackQty) / 100).toFixed(2)})`
  );
}

console.log(`\nDone — ${updated} updated, ${skipped} not found, ${failed} failed.`);
