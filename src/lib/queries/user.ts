"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type UserWithCompany = Tables<"user_profiles"> & {
  company_members: (Tables<"company_members"> & {
    companies: Tables<"companies">;
  })[];
};

// Resolve the signed-in user's own profile + memberships.
//
// Identity is verified via supabase.auth.getUser() (cryptographically
// validates the JWT). Once we have authUser.id we do the nested select
// with the **service client** rather than the cookie-scoped anon client.
//
// Why: the cookie-scoped client is subject to RLS policies that depend on
// auth.uid() resolving inside the Postgres session. In some Next.js 16 /
// Supabase SSR render paths (notably nested layouts evaluated in parallel)
// that claim doesn't land in time and user_profiles reads come back empty —
// causing layouts to redirect to /auth/login in a loop. Bypassing RLS for
// the user's own already-verified row is safe and removes the race.
export async function getCurrentUser(): Promise<UserWithCompany | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Disambiguate via !user_id — company_members has a second FK to
  // user_profiles (invited_by), which makes the plain embed return null
  // because PostgREST can't pick a relationship automatically.
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      `
      *,
      company_members!user_id (
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
