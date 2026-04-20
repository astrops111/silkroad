"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  name: string;
  name_local: string | null;
  slug: string;
  description: string | null;
  base_price: number;
  currency: string;
  moq: number;
  supplier_id: string;
  supplier_name: string;
  supplier_country: string;
  supplier_verified: boolean;
  category_name: string | null;
  primary_image_url: string | null;
  rank: number;
}

export async function searchProducts(options: {
  query: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  moqMax?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  page?: number;
  limit?: number;
}): Promise<{ results: SearchResult[]; total: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_products", {
    query: options.query,
    filter_category: options.category ?? null,
    filter_price_min: options.priceMin ? options.priceMin * 100 : null,
    filter_price_max: options.priceMax ? options.priceMax * 100 : null,
    filter_moq_max: options.moqMax ?? null,
    sort_by: options.sort ?? "relevance",
    page_num: options.page ?? 1,
    page_size: options.limit ?? 20,
  });

  if (error) {
    console.error("[search] RPC error:", error);
    return { results: [], total: 0 };
  }

  return {
    results: (data ?? []) as SearchResult[],
    total: (data ?? []).length,
  };
}
