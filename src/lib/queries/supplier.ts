"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SupplierProfileFull = Tables<"supplier_profiles"> & {
  companies: Tables<"companies">;
};

export async function getSupplierProfile(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("*, companies (*)")
    .eq("company_id", companyId)
    .single();

  return {
    profile: data as SupplierProfileFull | null,
    error: error?.message,
  };
}

export async function getPublicSupplierProfile(companyId: string) {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, name_local, slug, logo_url, country_code, city, description, verification_status, established_year, employee_count_range, website")
    .eq("id", companyId)
    .eq("type", "supplier")
    .single();

  if (!company) return null;

  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("tier, response_rate, on_time_delivery_rate, average_rating, total_orders, certifications")
    .eq("company_id", companyId)
    .single();

  return { company, profile };
}

export async function getPublicSuppliers(options?: {
  category?: string;
  country?: string;
  tier?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("companies")
    .select(
      `
      id, name, slug, logo_url, country_code, city, description, verification_status, established_year,
      supplier_profiles (tier, response_rate, on_time_delivery_rate, average_rating, total_orders)
    `,
      { count: "exact" }
    )
    .eq("type", "supplier")
    .eq("is_active", true)
    .range(offset, offset + limit - 1);

  if (options?.country) {
    query = query.eq("country_code", options.country);
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, count } = await query;

  return {
    suppliers: data ?? [],
    total: count ?? 0,
  };
}
