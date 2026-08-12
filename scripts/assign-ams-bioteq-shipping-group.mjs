// Creates a dedicated "AMS Bioteq" shipping/pooling group (group_type='supplier':
// one combined minimum order across this supplier's own listed products,
// independent of any other supplier's group) and assigns every AMS Bioteq
// product to it. Mirrors scripts/assign-hodaf-shipping-group.mjs.
//
// Run: node --env-file=.env scripts/assign-ams-bioteq-shipping-group.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const SUPPLIER_SLUG = "ams-bioteq";
const GROUP_NAME = "AMS Bioteq";
const GROUP_CODE = "TW-AMS-BIOTEQ";

// 1. Resolve the company id
const { data: company, error: compErr } = await admin
  .from("companies")
  .select("id")
  .eq("slug", SUPPLIER_SLUG)
  .single();
if (compErr || !company) {
  console.error(`Supplier "${SUPPLIER_SLUG}" not found.`);
  process.exit(1);
}

// 2. Get or create the shipping group
let { data: group } = await admin
  .from("product_shipping_groups")
  .select("id, name")
  .ilike("code", GROUP_CODE)
  .maybeSingle();

if (!group) {
  const { data: created, error: createErr } = await admin
    .from("product_shipping_groups")
    .insert({
      name: GROUP_NAME,
      code: GROUP_CODE,
      group_type: "supplier",
      description: "AMS Bioteq (Taiwan) SIPSIP wound care + Lumière d'Art skincare — own supplier pooling group, ships by air freight.",
      country_code: "TW",
      product_mix: true,
      is_active: true,
    })
    .select("id, name")
    .single();
  if (createErr) { console.error(`Failed to create shipping group: ${createErr.message}`); process.exit(1); }
  group = created;
  console.log(`Created shipping group "${group.name}" — ${group.id}`);
} else {
  console.log(`Found shipping group "${group.name}" — ${group.id}`);
}

// 3. Assign every AMS Bioteq product to it
const { data: products, error: fetchErr } = await admin
  .from("products")
  .select("id")
  .eq("supplier_id", company.id);
if (fetchErr) { console.error(`Failed to fetch products: ${fetchErr.message}`); process.exit(1); }

if (!products?.length) {
  console.log("No AMS Bioteq products found — nothing to assign.");
  process.exit(0);
}

const { error: updateErr } = await admin
  .from("products")
  .update({ shipping_group_id: group.id })
  .in("id", products.map((p) => p.id));
if (updateErr) { console.error(`Update failed: ${updateErr.message}`); process.exit(1); }

console.log(`Done — ${products.length} AMS Bioteq products assigned to shipping group "${group.name}".`);
