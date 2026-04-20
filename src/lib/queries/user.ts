"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type UserWithCompany = Tables<"user_profiles"> & {
  company_members: (Tables<"company_members"> & {
    companies: Tables<"companies">;
  })[];
};

export async function getCurrentUser(): Promise<UserWithCompany | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      `
      *,
      company_members (
        *,
        companies (*)
      )
    `
    )
    .eq("auth_id", authUser.id)
    .single();

  return profile as UserWithCompany | null;
}

export async function getUserProfile(authId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth_id", authId)
    .single();
  return data;
}

export async function getUserCompanies(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("*, companies (*)")
    .eq("user_id", userId);
  return data;
}
