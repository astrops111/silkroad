"use server";

import { createClient } from "@/lib/supabase/server";

export interface ResourceCategory {
  id: string;
  parent_id: string | null;
  slug: string;
  name_en: string;
  name_zh: string | null;
  name_fr: string | null;
  hs_prefix: string | null;
  unit_of_measure: string;
  group_code: string;
  requires_kimberley: boolean;
  requires_oecd_3tg: boolean;
  requires_cites: boolean;
  requires_gacc: boolean;
}

export interface ResourceListing {
  id: string;
  tenant_id: string;
  name_en: string;
  name_zh: string | null;
  slug: string | null;
  category: string;
  subcategory: string | null;
  hs_code: string | null;
  origin_country: string;
  origin_region: string | null;
  grade: string | null;
  variety: string | null;
  unit_of_measure: string | null;
  incoterm: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  available_quantity: number | null;
  min_order_quantity: number | null;
  price_per_unit_usd: number | null;
  price_usd_per_kg: number | null;
  currency: string;
  lead_time_days: number | null;
  images: string[];
  assay: Record<string, unknown> | null;
  status: string;
  is_featured: boolean;
  resource_categories: {
    slug: string;
    name_en: string;
    name_zh: string | null;
    group_code: string;
    unit_of_measure: string;
  } | null;
  companies: {
    id: string;
    name: string;
    slug: string | null;
    country_code: string | null;
    verification_status: string | null;
  } | null;
}

export interface ListResourceFilters {
  group?: string;           // 'metals' | 'food' | 'minerals' | 'timber' | 'energy' | 'raw_materials'
  categorySlug?: string;    // leaf category slug
  originCountry?: string;
  incoterm?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export async function listResourceCategories(groupCode?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("resource_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (groupCode) query = query.eq("group_code", groupCode);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ResourceCategory[];
}

export async function listResourceListings(filters: ListResourceFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 24;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("commodities")
    .select(
      `
      *,
      resource_categories:resource_category_id (slug, name_en, name_zh, group_code, unit_of_measure),
      companies:tenant_id (id, name, slug, country_code, verification_status)
      `,
      { count: "exact" }
    )
    .eq("status", "approved");

  if (filters.categorySlug) {
    query = query.eq("resource_categories.slug", filters.categorySlug);
  }
  if (filters.group) {
    query = query.eq("resource_categories.group_code", filters.group);
  }
  if (filters.originCountry) {
    query = query.eq("origin_country", filters.originCountry);
  }
  if (filters.incoterm) {
    query = query.eq("incoterm", filters.incoterm);
  }
  if (filters.search) {
    query = query.ilike("name_en", `%${filters.search}%`);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price_per_unit_usd", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_per_unit_usd", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    listings: (data ?? []) as unknown as ResourceListing[],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getResourceListing(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commodities")
    .select(
      `
      *,
      resource_categories:resource_category_id (
        slug, name_en, name_zh, group_code, unit_of_measure,
        requires_kimberley, requires_oecd_3tg, requires_cites, requires_gacc
      ),
      companies:tenant_id (id, name, slug, country_code, verification_status)
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ResourceListing | null;
}
