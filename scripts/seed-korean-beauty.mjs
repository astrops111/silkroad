// Seed "Korean Beauty Trading Co" supplier + 3 sample K-beauty products.
// Idempotent: re-running skips records that already exist.
//
// Run: node --env-file=.env scripts/seed-korean-beauty.mjs

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
// Supplier spec
// ───────────────────────────────────────────────────────────
const SUPPLIER = {
  email: "owner@kbeautytrading.kr",
  password: "password123",
  fullName: "KBeauty Owner",
  companyName: "Korean Beauty Trading Co",
  companyNameLocal: "한국뷰티무역상사",
  slug: "korean-beauty-trading-co",
  countryCode: "KR",
  marketRegion: "global",
  description:
    "Seoul-based trading company sourcing certified K-beauty skincare and personal care products for African retail and wholesale markets.",
  factoryCountry: "KR",
  industry: "Beauty & Personal Care",
};

// ───────────────────────────────────────────────────────────
// Products — typical K-beauty catalogue
// ───────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: "MEDIHEAL N.M.F Aquaring Ampoule Mask EX 25ml (Box of 10)",
    nameLocal: "메디힐 NMF 아쿠아링 앰플 마스크",
    slug: "mediheal-nmf-aquaring-ampoule-mask-25ml-box10",
    description: [
      "MEDIHEAL N.M.F Aquaring Ampoule Mask — Korea's best-selling sheet mask.",
      "",
      "Korean brand: MEDIHEAL (메디힐)",
      "Origin: South Korea",
      "Net volume: 25 ml per sheet mask",
      "Units per box: 10 masks",
      "Shelf life: 36 months",
      "Key ingredients: Sodium PCA, Hyaluronic Acid, Betaine — deep hydration and barrier repair.",
      "Skin type: all skin types",
      "KFDA-registered. Cruelty-free. Fragrance-free.",
      "Storage: cool, dry place; avoid direct sunlight.",
      "Barcode (outer): 8809261572018",
      "Trade term: EXW Incheon",
    ].join("\n"),
    basePrice: 850,
    currency: "USD",
    moq: 100,
    leadTimeDays: 14,
    tradeTerm: "exw",
    hsCode: "3304.99",
    weightKg: 0.32,
    originCountry: "KR",
    images: [
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    name: "COSRX Advanced Snail 96 Mucin Power Essence 100ml",
    nameLocal: "코스알엑스 어드밴스드 달팽이 96 뮤신 에센스",
    slug: "cosrx-advanced-snail-96-mucin-power-essence-100ml",
    description: [
      "COSRX Advanced Snail 96 Mucin Power Essence — 96% snail secretion filtrate for repair, hydration, and anti-ageing.",
      "",
      "Korean brand: COSRX (코스알엑스)",
      "Origin: South Korea",
      "Net volume: 100 ml",
      "Units per carton: 24",
      "Shelf life: 36 months (unopened)",
      "Key ingredient: Snail Secretion Filtrate 96%",
      "Free of: parabens, sulfates, phthalates, artificial fragrance.",
      "Suitable for: dry, sensitive, combination skin.",
      "KFDA-registered. Vegan. Cruelty-free.",
      "Storage: cool, dry place away from direct sunlight.",
      "Barcode (outer): 8809416470016",
      "Trade term: EXW Incheon",
    ].join("\n"),
    basePrice: 1250,
    currency: "USD",
    moq: 48,
    leadTimeDays: 14,
    tradeTerm: "exw",
    hsCode: "3304.99",
    weightKg: 0.18,
    originCountry: "KR",
    images: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    name: "BEAUTY OF JOSEON Relief Sun: Rice + Probiotics SPF50+ PA++++ 50ml",
    nameLocal: "조선미녀 라이스 선크림 SPF50+",
    slug: "beauty-of-joseon-relief-sun-rice-probiotics-spf50-50ml",
    description: [
      "Beauty of Joseon Relief Sun — lightweight mineral-hybrid sunscreen with niacinamide, rice extract, and probiotics.",
      "",
      "Korean brand: Beauty of Joseon (조선미녀)",
      "Origin: South Korea",
      "Net volume: 50 ml",
      "SPF: 50+  |  PA rating: PA++++",
      "Units per carton: 24",
      "Shelf life: 36 months (unopened)",
      "Key actives: Oryza Sativa (Rice) Extract, Niacinamide, Lactobacillus Ferment.",
      "Finish: weightless, no white cast — suitable for all skin tones.",
      "KFDA-registered. Cruelty-free. Vegan.",
      "Storage: cool, dry place; do not freeze.",
      "Barcode (outer): 8809738310026",
      "Trade term: EXW Incheon",
    ].join("\n"),
    basePrice: 1490,
    currency: "USD",
    moq: 48,
    leadTimeDays: 14,
    tradeTerm: "exw",
    hsCode: "3304.99",
    weightKg: 0.12,
    originCountry: "KR",
    images: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────
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
      email: SUPPLIER.email,
      full_name: SUPPLIER.fullName,
      country_code: SUPPLIER.countryCode,
      preferred_locale: "ko",
      preferred_currency: "KRW",
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
    .eq("slug", SUPPLIER.slug)
    .maybeSingle();
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
      verification_status: "verified",
      industry: SUPPLIER.industry,
      is_active: true,
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
    factory_country: SUPPLIER.factoryCountry,
    certifications: ["KFDA", "CRUELTY_FREE"],
    trade_terms_default: "exw",
    moq_default: 48,
    lead_time_days_default: 14,
  });
  if (error) throw new Error(`supplier_profiles insert failed: ${error.message}`);
}

async function findBeautyFacialCategory() {
  const { data } = await admin
    .from("categories")
    .select("id, name")
    .eq("slug", "beauty-facial")
    .maybeSingle();
  if (data) {
    console.log(`  ✓ found category "${data.name}" (beauty-facial)`);
    return data.id;
  }

  const { data: top } = await admin
    .from("categories")
    .select("id, name")
    .eq("slug", "beauty")
    .maybeSingle();
  if (top) {
    console.log(`  ✓ falling back to top-level "${top.name}" (beauty)`);
    return top.id;
  }

  throw new Error("Cannot find a beauty category — run category seeding first.");
}

async function upsertProduct(supplierId, categoryId, p) {
  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("slug", p.slug)
    .maybeSingle();

  if (existing) {
    console.log(`  · product already seeded: ${p.name} — skipping`);
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
  console.log(`  ✓ product ${product.id}  ${p.name}`);

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
console.log(`Seeding Korean Beauty Trading Co into: ${URL}\n`);

try {
  console.log("[supplier] ensuring company + user + profile");
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
  console.log(`  → Login: ${SUPPLIER.email} / ${SUPPLIER.password}\n`);

  console.log("[category] resolving Beauty › Facial category");
  const categoryId = await findBeautyFacialCategory();
  console.log(`  → using category ${categoryId}\n`);

  console.log(`[products] seeding ${PRODUCTS.length} products`);
  for (const p of PRODUCTS) {
    await upsertProduct(companyId, categoryId, p);
  }
  console.log("\nDone.");
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
}
