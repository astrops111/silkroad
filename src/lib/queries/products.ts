"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type ProductWithDetails = Tables<"products"> & {
  categories: Tables<"categories"> | null;
  product_images: Tables<"product_images">[];
  product_variants: Tables<"product_variants">[];
  product_pricing_tiers: Tables<"product_pricing_tiers">[];
  product_certifications: Tables<"product_certifications">[];
  companies: Pick<Tables<"companies">, "id" | "name" | "slug" | "logo_url" | "verification_status" | "country_code"> | null;
};

export async function getSupplierProducts(
  companyId: string,
  options?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (*),
      product_pricing_tiers (*)
    `,
      { count: "exact" }
    )
    .eq("supplier_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq("moderation_status", options.status);
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, count, error } = await query;

  return {
    products: (data ?? []) as ProductWithDetails[],
    total: count ?? 0,
    error: error?.message,
  };
}

export async function getProductById(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (*),
      product_pricing_tiers (*),
      product_certifications (*)
    `
    )
    .eq("id", productId)
    .single();

  return { product: data as ProductWithDetails | null, error: error?.message };
}

export async function getProductWithSupplier(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (*),
      product_pricing_tiers (*),
      product_certifications (*),
      companies:supplier_id (id, name, slug, logo_url, verification_status, country_code)
    `
    )
    .eq("id", productId)
    .single();

  return { product: data as ProductWithDetails | null, error: error?.message };
}
