// Seeds the AMS Bioteq supplier (Taiwan, SIPSIP medical/skincare) + its 13
// products from "TW-vendor list for Annie -AMS BioteQ.xlsx". Idempotent:
// re-running skips records that already exist.
//
// Run: node --env-file=.env scripts/seed-ams-bioteq.mjs
//
// Pricing: base_price = COGS * 1.17 (17% markup, per instruction for this
// import — same convention as HODAF; PLATFORM_MARKUP stays 1.0). COGS is per
// sellable unit (box/bottle/tube, col AK "1盒"), so sales_unit carries the
// unit and box_pack_qty stays null. MOQ 100 units per SKU (col O "100盒").
// Shipping: air freight -> products.shipping_mode = 'air' (00050 convention).
// Products are seeded approved so the catalogue goes straight to marketplace.

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
  "TW-vendor list for Annie -AMS BioteQ.xlsx"
);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const MARKUP = 1.17;
const LEAD_TIME_DAYS = 30; // not in the sheet; air-freight Taiwan assumption
const SHIPPING_MODE = "air";

const SUPPLIER = {
  email: "owner@ams-bioteq.com",
  password: "password123",
  fullName: "AMS Bioteq Owner",
  companyName: "AMS Bioteq",
  companyNameLocal: "元樟生物科技",
  slug: "ams-bioteq",
  countryCode: "TW",
  marketRegion: "global", // market_region enum has no "tw" (africa_*/cn/global only)
  description:
    "Taiwan biotech manufacturer (AMS BioteQ / 元樟生物科技): SIPSIP wound-care line (hydrophilic foam dressings, sterile wound gel, skin-barrier and adhesive-remover sprays) and the Lumière d'Art sheet-mask skincare line. EXW pricing, air freight.",
  factoryCountry: "TW",
};

// Per-row config keyed by sheet row (4-16). Pricing/MOQ/packaging/shelf-life
// come from the sheet; names are lightly normalized (the FID rows get "Foam
// Dressing" spelled out — the sheet names are bare size codes).
const ROWS = {
  4:  { slug: "lumi-rejuvenate-anti-aging-mask",  name: "Lumi Rejuvenate Anti-Aging Mask",                        category: "facial-masks",      hsCode: "3304.99", salesUnit: "Box",    line: "Lumière d'Art" },
  5:  { slug: "lumi-bright-brightening-mask",     name: "Lumi Bright Brightening Mask",                           category: "facial-masks",      hsCode: "3304.99", salesUnit: "Box",    line: "Lumière d'Art" },
  6:  { slug: "lumi-radiance-pore-refining-mask", name: "Lumi Radiance Pore-Refining Mask",                       category: "facial-masks",      hsCode: "3304.99", salesUnit: "Box",    line: "Lumière d'Art" },
  7:  { slug: "lumi-serenity-soothing-mask",      name: "Lumi Serenity Soothing Mask",                            category: "facial-masks",      hsCode: "3304.99", salesUnit: "Box",    line: "Lumière d'Art" },
  8:  { slug: "lumi-balance-deep-cleansing-mask", name: "Lumi Balance Deep-Cleansing Mask",                       category: "facial-masks",      hsCode: "3304.99", salesUnit: "Box",    line: "Lumière d'Art" },
  9:  { slug: "sting-free-skin-barrier-spray",    name: "Sting-Free Skin Barrier Spray",                          category: "health-wound-care", hsCode: "3005.90", salesUnit: "Bottle" },
  10: { slug: "adhesive-remover-spray",           name: "Adhesive Remover Spray",                                 category: "health-wound-care", hsCode: "3402.90", salesUnit: "Bottle" },
  11: { slug: "wound-gel-sterile",                name: "Wound Gel (Sterile)",                                    category: "health-wound-care", hsCode: "3005.90", salesUnit: "Tube" },
  12: { slug: "no-rinse-foam-cleanser",           name: "No-Rinse Foam Cleanser",                                 category: "body-cleaning",     hsCode: "3401.30", salesUnit: "Bottle" },
  13: { slug: "fid0505-foam-dressing",            name: "FID0505 Foam Dressing 5×5 cm 1mm — Micro / Aesthetic Wounds", category: "health-wound-care", hsCode: "3005.90", salesUnit: "Box" },
  14: { slug: "fid1012-foam-dressing",            name: "FID1012 Foam Dressing 10×12 cm 2mm — Medium Wounds",     category: "health-wound-care", hsCode: "3005.90", salesUnit: "Box" },
  15: { slug: "fid1020-foam-dressing",            name: "FID1020 Foam Dressing 10×20 cm 1mm — Large / Post-Op Wounds", category: "health-wound-care", hsCode: "3005.90", salesUnit: "Box" },
  16: { slug: "fid1515-foam-dressing",            name: "FID1515 Foam Dressing 15×15 cm 2mm — Pressure Ulcer Care", category: "health-wound-care", hsCode: "3005.90", salesUnit: "Box" },
};

const LEGAL_CATEGORY_EN = { 化妝品: "Cosmetics", 化妆品: "Cosmetics", 醫材: "Medical Device", 一般品: "General Goods" };

// "100盒" / "100瓶" -> 100
function parseMoq(cell) {
  const m = String(cell ?? "").match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// "3年" -> 1095; "5年" -> 1825; "5年/開封後12個月" -> 1825 (opened-shelf-life
// stays in the description only)
function parseShelfDays(cell) {
  const m = String(cell ?? "").match(/^(\d+)\s*年/);
  return m ? parseInt(m[1], 10) * 365 : null;
}

// "90ml /1 btl" -> "90 ml/bottle"; "4 pcs/box" stays; "30g / 1 Tube" -> "30 g/tube"
function normalizePackaging(cell) {
  if (!cell) return null;
  return String(cell)
    .replace(/\s*\/\s*1\s*btl\b/i, "/bottle")
    .replace(/\s*\/\s*1\s*Tube\b/i, "/tube")
    .replace(/(\d)(ml|g)\b/gi, "$1 $2")
    .trim();
}

function buildDescription(cfg, row) {
  return [
    cfg.name,
    "",
    `Brand: ${row.brand}`,
    cfg.line ? `Product line: ${cfg.line}` : null,
    "Origin: Taiwan",
    row.packaging ? `Packaging: ${normalizePackaging(row.packaging)}` : null,
    row.shelfLifeRaw ? `Shelf life: ${String(row.shelfLifeRaw).replace(/年/, " years").replace(/\/開封後12個月/, " (12 months after opening)")}` : null,
    `Trade term: ${String(row.incoterm ?? "EXW").toUpperCase()}`,
    "Shipping: Air freight",
    "",
    `Reference: ${row.refUrl}`,
  ].filter((l) => l !== null).join("\n");
}

// ── 1. Parse the spreadsheet ────────────────────────────────────────────
function loadRows() {
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["Sheet1"];
  const cols = {
    vendor: "D", nameEn: "L", refUrl: "N", moqCell: "O", incoterm: "R",
    cogs: "S", legalCategory: "AG", nameZh: "AH", brand: "AI",
    packaging: "AL", shelfLifeRaw: "AQ",
  };
  const rows = [];
  for (const [r, cfg] of Object.entries(ROWS)) {
    const get = (col) => { const cell = sheet[col + r]; return cell ? cell.v : null; };
    if (get(cols.vendor) !== "AMS Bioteq") {
      console.warn(`  ! row ${r}: vendor is not "AMS Bioteq" — skipping`);
      continue;
    }
    const row = { cfg };
    for (const [k, col] of Object.entries(cols)) row[k] = get(col);
    rows.push(row);
  }
  return rows;
}

// ── 2. Supplier company ─────────────────────────────────────────────────
async function ensureAuthUser() {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === SUPPLIER.email);
  if (existing) return existing.id;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: SUPPLIER.email,
    password: SUPPLIER.password,
    email_confirm: true,
    user_metadata: { full_name: SUPPLIER.fullName },
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
      email: SUPPLIER.email,
      full_name: SUPPLIER.fullName,
      country_code: SUPPLIER.countryCode,
      preferred_locale: "zh",
      preferred_currency: "USD",
    })
    .select("id")
    .single();
  if (error) throw new Error(`user_profiles insert failed: ${error.message}`);
  return data.id;
}

async function ensureCompany() {
  const { data: existing } = await admin.from("companies").select("id").eq("slug", SUPPLIER.slug).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("companies")
    .insert({
      name: SUPPLIER.companyName,
      name_local: SUPPLIER.companyNameLocal,
      slug: SUPPLIER.slug,
      type: "supplier",
      country_code: SUPPLIER.countryCode,
      market_region: SUPPLIER.marketRegion,
      description: SUPPLIER.description,
      verification_status: "pending",
      industry: "Medical Devices & Skincare",
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
    factory_country: SUPPLIER.factoryCountry,
    certifications: [],
    trade_terms_default: "exw",
    moq_default: 100,
    lead_time_days_default: LEAD_TIME_DAYS,
  });
  if (error) throw new Error(`supplier_profiles insert failed: ${error.message}`);
}

// ── 3. Products ──────────────────────────────────────────────────────────
async function loadCategories() {
  const { data, error } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", ["facial-masks", "body-cleaning", "health-wound-care"]);
  if (error) throw new Error(`categories fetch failed: ${error.message}`);
  const map = Object.fromEntries(data.map((c) => [c.slug, c.id]));
  for (const slug of ["facial-masks", "body-cleaning", "health-wound-care"]) {
    if (!map[slug]) throw new Error(`category "${slug}" missing — run apply-migration-137 first`);
  }
  return map;
}

async function upsertProduct(supplierId, categories, row) {
  const { cfg } = row;
  const { data: existing } = await admin.from("products").select("id").eq("slug", cfg.slug).maybeSingle();
  if (existing) {
    console.log(`  · product already seeded: ${cfg.name} (${existing.id}) — skipping`);
    return existing.id;
  }

  const cogsCents = Math.round(row.cogs * 100);
  const basePriceCents = Math.round(row.cogs * MARKUP * 100);
  const moq = parseMoq(row.moqCell) ?? 100;

  const { data: product, error } = await admin
    .from("products")
    .insert({
      supplier_id: supplierId,
      category_id: categories[cfg.category],
      name: cfg.name,
      name_local: row.nameZh ? String(row.nameZh).replace(/\s+/g, " ").trim() : null,
      slug: cfg.slug,
      description: buildDescription(cfg, row),
      base_price: basePriceCents,
      cogs: cogsCents,
      currency: "USD",
      moq,
      sales_unit: cfg.salesUnit,
      box_pack_qty: null,
      lead_time_days: LEAD_TIME_DAYS,
      trade_term: String(row.incoterm ?? "exw").toLowerCase(),
      hs_code: cfg.hsCode,
      shelf_life_days: parseShelfDays(row.shelfLifeRaw),
      legal_category: LEGAL_CATEGORY_EN[String(row.legalCategory ?? "").trim()] ?? null,
      origin_country: "TW",
      brand: row.brand ?? "SIPSIP",
      shipping_mode: SHIPPING_MODE,
      moderation_status: "approved",
      sample_available: true,
      sample_moq: 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(`products insert failed for ${cfg.name}: ${error.message}`);
  console.log(
    `  ✓ ${product.id} ${cfg.name} — cogs $${row.cogs} -> $${(basePriceCents / 100).toFixed(2)}/${cfg.salesUnit.toLowerCase()}, MOQ ${moq}`
  );
  return product.id;
}

// ── Run ──────────────────────────────────────────────────────────────────
console.log(`Seeding AMS Bioteq into: ${URL}\n`);
try {
  const rows = loadRows();
  console.log(`[xlsx] ${rows.length} AMS Bioteq rows found\n`);

  console.log(`[supplier] ensuring AMS Bioteq company + user + profile`);
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
  console.log(`  → Login: ${SUPPLIER.email} / ${SUPPLIER.password}\n`);

  const categories = await loadCategories();
  console.log(`[products] seeding ${rows.length} products (approved, shipping_mode=air)`);
  let ok = 0;
  for (const row of rows) {
    const id = await upsertProduct(supplierId, categories, row);
    if (id) ok++;
  }
  console.log(`\nDone — ${ok}/${rows.length} products seeded.`);
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
}
