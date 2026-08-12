// Seeds the HODAF supplier (China, cosmetics/skincare) + its 28 products from
// the vendor spreadsheet. Idempotent: re-running skips records that already exist.
//
// Run: node --env-file=.env scripts/seed-hodaf.mjs
//
// Pricing: base_price = COGS * 1.17 (17% markup, per instruction for this import only).
// MOQ: 1 box per SKU. Lead time: 75 days. Trade term: EXW. Moderation: pending admin review.
// Images: not sourced yet (Drive links were not publicly accessible) — each product's
// Drive link is preserved in its description for provenance; add real photos later via
// scripts/insert-product-images.mjs.

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
const MOQ = 1;
const LEAD_TIME_DAYS = 75;

const HODAF = {
  email: "owner@hodaf.cn",
  password: "password123",
  fullName: "HODAF Owner",
  companyName: "HODAF",
  companyNameLocal: "赫达夫",
  slug: "hodaf",
  countryCode: "CN",
  marketRegion: "cn",
  description: "China-based cosmetics and skincare manufacturer/trading company (masks, patches, serums, creams, toners) supplied to Annie's vendor list, EXW pricing.",
  factoryCountry: "CN",
};

// Beauty taxonomy leaf category IDs (from live `categories` table, path under beauty/*)
const CATEGORY = {
  masks: "f18e692b-021d-4137-8d14-e49da3bcef9b", // beauty/beauty-facial/facial-masks
  cream: "9c3b153a-9f92-4b51-ae1e-53495d8ff72d", // beauty/beauty-facial/facial-cream
  toner: "b9ba7061-6ae3-422a-87e7-dbbeae760a1d", // beauty/beauty-facial/facial-toner
  serum: "17953546-2243-4d24-90cc-fe583f52b28c", // beauty/beauty-facial/facial-serum
  cleaning: "1cee50c7-2032-4ac0-97ad-fa43bac47e18", // beauty/beauty-facial/facial-cleaning
  bodyCream: "8b47004b-4aef-423d-90f2-f00fe8d6472e", // beauty/beauty-body/body-cream
  nails: "1391eed9-2947-4aff-b8c3-bedc4a997bb2", // beauty/beauty-makeup/makeup-nails
};

// slug -> {category, hsCode} classification, keyed by the English name slug
const CLASSIFICATION = {
  "gold-eye-mask": { category: "masks", hsCode: "3304.99" },
  "acne-patch": { category: "masks", hsCode: "3304.99" },
  "microneedle-acne-patch": { category: "masks", hsCode: "3304.99" },
  "microneedle-eye-patch": { category: "masks", hsCode: "3304.99" },
  "hyaluronic-acid-hydrating-facial-mask": { category: "masks", hsCode: "3304.99" },
  "fullerene-brightening-facial-mask": { category: "masks", hsCode: "3304.99" },
  "anti-aging-firming-facial-mask": { category: "masks", hsCode: "3304.99" },
  "targeted-acne-care-facial-mask": { category: "masks", hsCode: "3304.99" },
  "bio-peptide-repairing-mask": { category: "masks", hsCode: "3304.99" },
  "anti-aging-rejuvenating-repair-mask": { category: "masks", hsCode: "3304.99" },
  "acne-treatment-repair-facial-mask": { category: "masks", hsCode: "3304.99" },
  "hyaluronic-acid-repair-facial-mask": { category: "masks", hsCode: "3304.99" },
  "whitening-spot-correcting-facial-mask": { category: "masks", hsCode: "3304.99" },
  "aqua-glow-brightening-facial-mask": { category: "masks", hsCode: "3304.99" },
  "scar-repair-gel": { category: "cream", hsCode: "3304.99" },
  "forehead-patch": { category: "masks", hsCode: "3304.99" },
  "v-line-chin-slimming-patch": { category: "masks", hsCode: "3304.99" },
  "foot-mask": { category: "bodyCream", hsCode: "3304.99" },
  "blackhead-removal-nose-strip": { category: "cleaning", hsCode: "3304.99" },
  "hydrating-plumping-toner": { category: "toner", hsCode: "3304.99" },
  "moisturizing-anti-wrinkle-repair-lotion": { category: "cream", hsCode: "3304.99" },
  "sculpting-anti-aging-serum": { category: "serum", hsCode: "3304.99" },
  "radiance-anti-wrinkle-firming-cream": { category: "cream", hsCode: "3304.99" },
  "tallow-facial-cream": { category: "cream", hsCode: "3304.99" },
  "tallow-body-lotion": { category: "bodyCream", hsCode: "3304.99" },
  "collagen-facial-mask": { category: "masks", hsCode: "3304.99" },
  "cuticle-oil": { category: "nails", hsCode: "3304.30" },
  "rose-peel-off-mask": { category: "masks", hsCode: "3304.99" },
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// "150g/盒" -> 0.15, "120ml/瓶" -> 0.12 (assume ~1g/ml), "500g/袋" -> 0.5
function parseWeightKg(weightStr) {
  if (!weightStr) return null;
  const match = weightStr.match(/([\d.]+)\s*(g|ml|kg)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "kg") return value;
  return Math.round((value / 1000) * 1000) / 1000; // g and ml treated 1:1, rounded to 3dp
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

function buildDescription(row) {
  const piecesPerBox = parsePiecesPerBox(row.spec);
  return [
    `${row.nameEn} (${row.nameZhTrad})`,
    "",
    `Brand: HODAF`,
    `Origin: China`,
    row.spec ? `Packaging: ${row.spec}${piecesPerBox ? ` (${piecesPerBox} pcs/box)` : ""}` : null,
    row.weight ? `Weight: ${row.weight}` : null,
    row.usage ? `Usage: ${row.usage}` : null,
    row.shelfLife ? `Shelf life: ${row.shelfLife}` : null,
    "Trade term: EXW",
    "",
    `Reference image folder (provenance, not yet publicly accessible): ${row.imgUrl}`,
  ].filter((l) => l !== null).join("\n");
}

// ── 1. Parse the spreadsheet ────────────────────────────────────────────
function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = {
    vendor: "D", nameZhSimp: "K", nameEn: "L", nameZhTrad: "M",
    incoterm: "R", cogs: "S", imgUrl: "U", shelfDays: "AE",
    spec: "AK", weight: "AM", usage: "AN", shelfLife: "AQ",
  };
  const rows = [];
  for (let r = 4; r <= 31; r++) {
    const get = (col) => { const cell = sheet[col + r]; return cell ? cell.v : null; };
    const vendor = get(cols.vendor);
    if (vendor !== "HODAF") continue;
    const row = {};
    for (const [k, col] of Object.entries(cols)) row[k] = get(col);
    row.slug = slugify(row.nameEn);
    rows.push(row);
  }
  return rows;
}

// ── 2. Supplier company ─────────────────────────────────────────────────
async function ensureAuthUser() {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === HODAF.email);
  if (existing) return existing.id;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: HODAF.email,
    password: HODAF.password,
    email_confirm: true,
    user_metadata: { full_name: HODAF.fullName },
  });
  if (error) throw new Error(`auth.createUser failed: ${error.message}`);
  return created.user.id;
}

async function ensureUserProfile(authId) {
  const { data: existing } = await admin.from("user_profiles").select("id").eq("auth_id", authId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("user_profiles")
    .insert({
      auth_id: authId,
      email: HODAF.email,
      full_name: HODAF.fullName,
      country_code: HODAF.countryCode,
      preferred_locale: "zh",
      preferred_currency: "USD",
    })
    .select("id")
    .single();
  if (error) throw new Error(`user_profiles insert failed: ${error.message}`);
  return data.id;
}

async function ensureCompany() {
  const { data: existing } = await admin.from("companies").select("id").eq("slug", HODAF.slug).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("companies")
    .insert({
      name: HODAF.companyName,
      name_local: HODAF.companyNameLocal,
      slug: HODAF.slug,
      type: "supplier",
      country_code: HODAF.countryCode,
      market_region: HODAF.marketRegion,
      description: HODAF.description,
      verification_status: "pending",
      industry: "Cosmetics & Personal Care",
    })
    .select("id")
    .single();
  if (error) throw new Error(`companies insert failed: ${error.message}`);
  return data.id;
}

async function ensureMembership(companyId, profileId) {
  const { data: existing } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", profileId)
    .maybeSingle();
  if (existing) return;
  const { error } = await admin
    .from("company_members")
    .insert({ company_id: companyId, user_id: profileId, role: "supplier_owner", is_primary: true });
  if (error) throw new Error(`company_members insert failed: ${error.message}`);
}

async function ensureSupplierProfile(companyId) {
  const { data: existing } = await admin.from("supplier_profiles").select("id").eq("company_id", companyId).maybeSingle();
  if (existing) return;
  const { error } = await admin.from("supplier_profiles").insert({
    company_id: companyId,
    factory_country: HODAF.factoryCountry,
    certifications: [],
    trade_terms_default: "exw",
    moq_default: MOQ,
    lead_time_days_default: LEAD_TIME_DAYS,
  });
  if (error) throw new Error(`supplier_profiles insert failed: ${error.message}`);
}

// ── 3. Products ──────────────────────────────────────────────────────────
async function upsertProduct(supplierId, row) {
  const classification = CLASSIFICATION[row.slug];
  if (!classification) {
    console.warn(`  ! no classification for slug "${row.slug}" (${row.nameEn}) — skipping`);
    return null;
  }

  const { data: existing } = await admin.from("products").select("id").eq("slug", row.slug).maybeSingle();
  if (existing) {
    console.log(`  · product already seeded: ${row.nameEn} (${existing.id}) — skipping`);
    return existing.id;
  }

  const cogsCents = Math.round(row.cogs * 100);
  const basePriceCents = Math.round(row.cogs * MARKUP * 100);

  const { data: product, error } = await admin
    .from("products")
    .insert({
      supplier_id: supplierId,
      category_id: CATEGORY[classification.category],
      name: row.nameEn,
      name_local: row.nameZhTrad,
      slug: row.slug,
      description: buildDescription(row),
      base_price: basePriceCents,
      cogs: cogsCents,
      currency: "USD",
      moq: MOQ,
      lead_time_days: LEAD_TIME_DAYS,
      trade_term: "exw",
      hs_code: classification.hsCode,
      weight_kg: parseWeightKg(row.weight),
      origin_country: "CN",
      brand: "HODAF",
      moderation_status: "pending",
      sample_available: true,
      sample_moq: 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(`products insert failed for ${row.nameEn}: ${error.message}`);
  console.log(`  ✓ product ${product.id} ${row.nameEn} — $${(basePriceCents / 100).toFixed(2)} (cogs $${row.cogs})`);
  return product.id;
}

// ── Run ──────────────────────────────────────────────────────────────────
console.log(`Seeding HODAF into: ${URL}\n`);
try {
  const rows = loadRows();
  console.log(`[xlsx] ${rows.length} HODAF rows found\n`);

  console.log(`[supplier] ensuring HODAF company + user + profile`);
  const authId = await ensureAuthUser();
  console.log(`  ✓ auth user ${authId}`);
  const profileId = await ensureUserProfile(authId);
  console.log(`  ✓ profile ${profileId}`);
  const supplierId = await ensureCompany();
  console.log(`  ✓ company ${supplierId}`);
  await ensureMembership(supplierId, profileId);
  console.log(`  ✓ membership (supplier_owner, primary)`);
  await ensureSupplierProfile(supplierId);
  console.log(`  ✓ supplier_profile`);
  console.log(`  → Login: ${HODAF.email} / ${HODAF.password}\n`);

  console.log(`[products] seeding ${rows.length} products`);
  let ok = 0, skipped = 0;
  for (const row of rows) {
    const id = await upsertProduct(supplierId, row);
    if (id) ok++; else skipped++;
  }
  console.log(`\nDone — ${ok} products ok, ${skipped} skipped (unclassified).`);
  console.log(`All products are moderation_status='pending' — approve them in /admin before they appear on the marketplace.`);
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
}
