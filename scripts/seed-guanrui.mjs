// Seed the GUANRUI supplier from the spreadsheet + 3 sample products.
// Idempotent: re-running skips records that already exist.
//
// Run: node --env-file=.env scripts/seed-guanrui.mjs
//
// Optional env overrides:
//   ASSIGN_TO_SUPPLIER_EMAIL=kwame@accraexports.gh  → attach products to an existing supplier instead of creating GUANRUI

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

// ───────────────────────────────────────────────────────────
// Supplier spec (GUANRUI, vendor_id 210000917 from spreadsheet)
// ───────────────────────────────────────────────────────────
const GUANRUI = {
  email: "owner@guanrui.jp",
  password: "password123",
  fullName: "GUANRUI Owner",
  companyName: "GUANRUI",
  companyNameLocal: "グァンルイ",
  slug: "guanrui",
  countryCode: "JP",
  marketRegion: "global",
  description:
    "Vendor 210000917 — Japan-based trading company supplying Japanese confectionery and groceries for Asian and African markets.",
  factoryCountry: "JP",
};

// ───────────────────────────────────────────────────────────
// Products (from Google Sheet, vendor GUANRUI)
// Prices converted from NT$ (TWD) at ≈ 32 TWD / USD.
// Images: placeholder Unsplash URLs since Drive viewer links do not
// embed. Drive URLs preserved in description for provenance.
// ───────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: "Ichibiki Hokkaido Red Bean Soup (Less Sweet) 140g",
    nameLocal: "日本Ichibiki 日本北海道紅豆湯",
    slug: "ichibiki-hokkaido-red-bean-soup-140g",
    description: [
      "Japanese Ichibiki red bean soup — Hokkaido-grown azuki beans, reduced sugar (50% less) using erythritol and sucralose.",
      "",
      "Japanese brand: イチビキ (Ichibiki)",
      "Origin: Japan",
      "Net weight: 140 g per pack (1 pack per unit)",
      "Shelf life: 730 days",
      "Units per box: 10",
      "Ingredients: water, red bean, erythritol, salt, sweetener (sucralose).",
      "Storage: keep in a cool, dry place.",
      "Barcode (outer): 14901011650228",
      "Barcode (inner): 4901011600486 / 4901011650221",
      "Trade term: DDP",
      "Manufacturer: カネカ食品株式会社 — 岐阜県岐阜市柳津町下佐波6-45",
      "",
      "Original NT$42. Source images on Google Drive:",
      "  https://drive.google.com/file/d/1ts8efF0oaJJjwVvb2gu5TiEB3ecj8Yko/view",
      "  https://drive.google.com/file/d/1avJyL1nLlKsKfVOukOTWFcdWT5kPQ_wI/view",
    ].join("\n"),
    basePrice: 131, // cents, ≈ NT$42
    currency: "USD",
    moq: 10,
    leadTimeDays: 21,
    tradeTerm: "ddp",
    hsCode: "2005.60",
    weightKg: 0.14,
    originCountry: "JP",
    images: [
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    name: "NIKKOH Marmo Cocoa Biscuits 80g",
    nameLocal: "NIKKOH 可可風味餅乾",
    slug: "nikkoh-marmo-cocoa-biscuits-80g",
    description: [
      "NIKKOH Marmo — cocoa-flavour biscuits with milk and whole-milk powder.",
      "",
      "Japanese brand: 日幸製菓 (Nikkoh)",
      "Origin: Japan",
      "Net weight: 80 g per pack (1 pack per unit)",
      "Shelf life: 390 days",
      "Units per box: 16",
      "Contains: wheat, nuts, milk, soy.",
      "Storage: keep in a cool, dry place.",
      "Barcode (outer): 14902155249880",
      "Barcode (inner): 4902155249708 / 4902155249883",
      "Trade term: DDP",
      "Manufacturer: 株式会社ニッコー — 岐阜県各務原市那加山崎町41番地",
      "",
      "Original NT$69. Source images on Google Drive:",
      "  https://drive.google.com/file/d/1No1F0wFf62zFWw8oPIn_z7WIAnZeEuVs/view",
      "  https://drive.google.com/file/d/1wob7Nz3pPR8GsXVuLlpg56vOqiiL1YXz/view",
    ].join("\n"),
    basePrice: 215, // cents, ≈ NT$69
    currency: "USD",
    moq: 16,
    leadTimeDays: 21,
    tradeTerm: "ddp",
    hsCode: "1905.31",
    weightKg: 0.08,
    originCountry: "JP",
    images: [
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    name: "NIKKOH Mini Wheat Chocolates Family Pack 70g",
    nameLocal: "NIKKOH 可可風味麥菓",
    slug: "nikkoh-mini-wheat-chocolates-70g",
    description: [
      "NIKKOH family-share pack — bite-size wheat crisps coated in cocoa and milk chocolate.",
      "",
      "Japanese brand: 日幸製菓 (Nikkoh)",
      "Origin: Japan",
      "Net weight: 70 g per pack (1 pack per unit)",
      "Shelf life: 390 days",
      "Units per box: 16",
      "Contains: wheat, milk, soy.",
      "Storage: keep in a cool, dry place.",
      "Barcode (outer): 14902155049872",
      "Barcode (inner): 4902155049728 / 4902155049872",
      "Trade term: DDP",
      "Manufacturer: 株式会社ニッコー — 岐阜県各務原市那加山崎町41番地",
      "",
      "Original NT$67. Source images on Google Drive:",
      "  https://drive.google.com/file/d/1NOQ4JiCHx5lGP7W-NCZq_VwquxfSib-L/view",
      "  https://drive.google.com/file/d/1dRI-KcdbvUWV1EDXf-3nMExayaP1Tn4j/view",
    ].join("\n"),
    basePrice: 209, // cents, ≈ NT$67
    currency: "USD",
    moq: 16,
    leadTimeDays: 21,
    tradeTerm: "ddp",
    hsCode: "1806.32",
    weightKg: 0.07,
    originCountry: "JP",
    images: [
      "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1548365328-9f547fb09530?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────
async function ensureAuthUser() {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === GUANRUI.email);
  if (existing) return existing.id;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: GUANRUI.email,
    password: GUANRUI.password,
    email_confirm: true,
    user_metadata: { full_name: GUANRUI.fullName },
  });
  if (error) throw new Error(`auth.createUser failed: ${error.message}`);
  return created.user.id;
}

async function ensureUserProfile(authId) {
  const { data: existing } = await admin
    .from("user_profiles")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("user_profiles")
    .insert({
      auth_id: authId,
      email: GUANRUI.email,
      full_name: GUANRUI.fullName,
      country_code: GUANRUI.countryCode,
      preferred_locale: "ja",
      preferred_currency: "JPY",
    })
    .select("id")
    .single();
  if (error) throw new Error(`user_profiles insert failed: ${error.message}`);
  return data.id;
}

async function ensureCompany() {
  const { data: existing } = await admin
    .from("companies")
    .select("id")
    .eq("slug", GUANRUI.slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("companies")
    .insert({
      name: GUANRUI.companyName,
      name_local: GUANRUI.companyNameLocal,
      slug: GUANRUI.slug,
      type: "supplier",
      country_code: GUANRUI.countryCode,
      market_region: GUANRUI.marketRegion,
      description: GUANRUI.description,
      verification_status: "verified",
      industry: "Food & Beverage Trading",
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

  const { error } = await admin.from("company_members").insert({
    company_id: companyId,
    user_id: profileId,
    role: "supplier_owner",
    is_primary: true,
  });
  if (error) throw new Error(`company_members insert failed: ${error.message}`);
}

async function ensureSupplierProfile(companyId) {
  const { data: existing } = await admin
    .from("supplier_profiles")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();
  if (existing) return;

  const { error } = await admin.from("supplier_profiles").insert({
    company_id: companyId,
    factory_country: GUANRUI.factoryCountry,
    certifications: [],
    trade_terms_default: "ddp",
    moq_default: 10,
    lead_time_days_default: 21,
  });
  if (error) throw new Error(`supplier_profiles insert failed: ${error.message}`);
}

async function findOrCreateSupplierCompany() {
  const override = process.env.ASSIGN_TO_SUPPLIER_EMAIL?.trim();
  if (override) {
    console.log(`[supplier] override via ASSIGN_TO_SUPPLIER_EMAIL=${override}`);
    const { data: profile, error } = await admin
      .from("user_profiles")
      .select("id, company_members!inner (company_id, companies!inner (id, type, name))")
      .eq("email", override)
      .maybeSingle();

    if (error || !profile) {
      throw new Error(
        `Could not find user_profile with email ${override}: ${error?.message ?? "not found"}`
      );
    }
    const membership = profile.company_members?.[0];
    const company = membership?.companies;
    if (!company || company.type !== "supplier") {
      throw new Error(`User ${override} is not attached to a supplier company`);
    }
    console.log(`  ✓ attaching products to existing supplier ${company.name} (${company.id})`);
    return company.id;
  }

  console.log(`[supplier] ensuring GUANRUI company + user + profile`);
  const authId = await ensureAuthUser();
  console.log(`  ✓ auth user ${authId}`);

  const profileId = await ensureUserProfile(authId);
  console.log(`  ✓ profile ${profileId}`);

  const companyId = await ensureCompany();
  console.log(`  ✓ company ${companyId}`);

  await ensureMembership(companyId, profileId);
  console.log(`  ✓ membership (supplier_owner, primary)`);

  await ensureSupplierProfile(companyId);
  console.log(`  ✓ supplier_profile`);
  console.log(`  → Login: ${GUANRUI.email} / ${GUANRUI.password}\n`);

  return companyId;
}

async function findGroceriesCategory() {
  // Try common slugs for the groceries bucket
  const candidates = ["groceries", "grocery", "food-beverage", "food", "agriculture"];
  for (const slug of candidates) {
    const { data } = await admin
      .from("categories")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();
    if (data) {
      console.log(`  ✓ found category "${data.name}" via slug "${slug}"`);
      return data.id;
    }
  }

  // Try by name (case-insensitive)
  const { data: byName } = await admin
    .from("categories")
    .select("id, name")
    .ilike("name", "%grocer%")
    .limit(1)
    .maybeSingle();
  if (byName) {
    console.log(`  ✓ found category "${byName.name}" by name match`);
    return byName.id;
  }

  // Create it
  console.log(`  · no groceries category — creating one`);
  const { data: created, error } = await admin
    .from("categories")
    .insert({
      name: "Groceries",
      slug: "groceries",
      level: 0,
      path: "groceries",
      icon: "ShoppingBasket",
      sort_order: 3,
      is_active: true,
    })
    .select("id, name")
    .single();
  if (error) throw new Error(`Failed to create Groceries category: ${error.message}`);
  console.log(`  ✓ created category "${created.name}" (${created.id})`);
  return created.id;
}

async function upsertProduct(supplierId, categoryId, p) {
  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("slug", p.slug)
    .maybeSingle();

  if (existing) {
    console.log(`  · product already seeded: ${p.name} (${existing.id}) — skipping`);
    return existing.id;
  }

  const { data: product, error } = await admin
    .from("products")
    .insert({
      supplier_id: supplierId,
      category_id: categoryId,
      name: p.name,
      name_local: p.nameLocal,
      slug: p.slug,
      description: p.description,
      base_price: p.basePrice,
      currency: p.currency,
      moq: p.moq,
      lead_time_days: p.leadTimeDays,
      trade_term: p.tradeTerm,
      hs_code: p.hsCode,
      weight_kg: p.weightKg,
      origin_country: p.originCountry,
      moderation_status: "approved",
      sample_available: true,
      sample_moq: 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(`products insert failed for ${p.name}: ${error.message}`);
  console.log(`  ✓ product ${product.id} ${p.name}`);

  if (p.images?.length) {
    const rows = p.images.map((url, i) => ({
      product_id: product.id,
      url,
      alt_text: p.name,
      sort_order: i,
      is_primary: i === 0,
    }));
    const { error: imgErr } = await admin.from("product_images").insert(rows);
    if (imgErr) throw new Error(`product_images insert failed: ${imgErr.message}`);
    console.log(`    ✓ ${rows.length} image(s)`);
  }

  return product.id;
}

// ───────────────────────────────────────────────────────────
// Run
// ───────────────────────────────────────────────────────────
console.log(`Seeding GUANRUI into: ${URL}\n`);

try {
  const supplierId = await findOrCreateSupplierCompany();
  console.log(`[category] resolving Groceries category`);
  const categoryId = await findGroceriesCategory();
  console.log(`  → using category ${categoryId}\n`);

  console.log(`[products] seeding ${PRODUCTS.length} products`);
  for (const p of PRODUCTS) {
    await upsertProduct(supplierId, categoryId, p);
  }
  console.log("\nDone.");
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
}
