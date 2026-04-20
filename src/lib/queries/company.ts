"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCompany(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  return data;
}

export async function getCompanyBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function getCompanyMembers(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("*, user_profiles (*)")
    .eq("company_id", companyId);
  return data;
}
