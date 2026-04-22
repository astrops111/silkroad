// One-off seed: creates one supplier login + one buyer login in the
// Supabase project pointed to by .env. Idempotent-ish: if an email already
// exists the script will tell you and skip cleanly.
//
// Run:  node --env-file=.env scripts/seed-test-users.mjs

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

const accounts = [
  {
    label: "SUPPLIER",
    email: "supplier.test@silkroadafrica.dev",
    password: "Supplier!Test2026",
    fullName: "Test Supplier Owner",
    role: "supplier",
    companyName: "Shenzhen Silk Trading Co",
    countryCode: "CN",
    marketRegion: "cn",
    platformRole: "supplier_owner",
    companyType: "supplier",
  },
  {
    label: "BUYER",
    email: "buyer.test@silkroadafrica.dev",
    password: "Buyer!Test2026",
    fullName: "Test Buyer Admin",
    role: "buyer",
    companyName: "Accra Global Imports Ltd",
    countryCode: "GH",
    marketRegion: "africa_west",
    platformRole: "buyer",
    companyType: "buyer_org",
  },
  {
    label: "ADMIN",
    email: "admin.test@silkroadafrica.dev",
    password: "Admin!Test2026",
    fullName: "Platform Admin",
    role: "admin",
    companyName: "SilkRoad Platform Admin",
    countryCode: "CN",
    marketRegion: "global",
    platformRole: "admin_super",
    companyType: "buyer_org", // placeholder — admins don't "own" a company
  },
];

async function createAccount(a) {
  console.log(`\n[${a.label}] ${a.email} — ${a.companyName}`);

  // 1. auth user (email pre-confirmed so login works immediately)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { full_name: a.fullName },
  });

  if (createErr) {
    console.error(`  ✗ auth.createUser: ${createErr.message}`);
    return;
  }
  const authId = created.user.id;
  console.log(`  ✓ auth user  ${authId}`);

  // 2. user_profiles
  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .insert({
      auth_id: authId,
      email: a.email,
      full_name: a.fullName,
      country_code: a.countryCode,
    })
    .select("id")
    .single();

  if (profileErr) {
    console.error(`  ✗ user_profiles: ${profileErr.message}`);
    return;
  }
  console.log(`  ✓ profile    ${profile.id}`);

  // 3. companies
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({
      name: a.companyName,
      slug: slugify(a.companyName),
      type: a.companyType,
      country_code: a.countryCode,
      market_region: a.marketRegion,
    })
    .select("id, slug")
    .single();

  if (companyErr) {
    console.error(`  ✗ companies: ${companyErr.message}`);
    return;
  }
  console.log(`  ✓ company    ${company.id} (${company.slug})`);

  // 4. company_members
  const { error: memberErr } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: profile.id,
    role: a.platformRole,
    is_primary: true,
  });

  if (memberErr) {
    console.error(`  ✗ company_members: ${memberErr.message}`);
    return;
  }
  console.log(`  ✓ membership (${a.platformRole}, primary)`);

  // 5. supplier_profiles (suppliers only)
  if (a.role === "supplier") {
    const { error: spErr } = await admin.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: a.countryCode,
    });
    if (spErr) {
      console.error(`  ✗ supplier_profiles: ${spErr.message}`);
      return;
    }
    console.log(`  ✓ supplier_profile`);
  }

  console.log(`  → Login: ${a.email} / ${a.password}`);
}

console.log(`Seeding test users into: ${URL}`);
for (const a of accounts) {
  await createAccount(a);
}
console.log("\nDone.");
