// One-off spot-check: confirms a migrated K-beauty product's parent row,
// product_variants, and product_images ended up correctly linked after
// running scripts/migrate-kbeauty-variants.mjs --write.
//
// Run: node --env-file=.env scripts/verify-kbeauty-variant-migration.mjs <product-id>

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const id = process.argv[2] ?? "965e925d-f48d-4ab8-9bda-58dd70970792"; // ATOPALM MLE Cream

const { data: product } = await admin
  .from("products")
  .select("id, name, slug, base_price, moq, is_active, jan_code")
  .eq("id", id)
  .single();
console.log("PRODUCT:", product);

const { data: variants } = await admin.from("product_variants").select("*").eq("product_id", id);
console.log("VARIANTS:", variants);

const { data: images } = await admin
  .from("product_images")
  .select("id, url, variant_id, product_id")
  .eq("product_id", id);
console.log("IMAGES:", images);
