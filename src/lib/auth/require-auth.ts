import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AuthenticatedUser {
  authId: string;
  profileId: string;
  email: string | null;
  companyIds: string[];
  role: string | null;
}

/**
 * Require authentication for API routes.
 * Returns authenticated user data on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthenticatedUser | NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", profile.id);

  return {
    authId: user.id,
    profileId: profile.id,
    email: profile.email,
    companyIds: (memberships || []).map((m) => m.company_id),
    role: (memberships || [])[0]?.role || null,
  };
}

/** Type guard */
export function isUnauthorized(
  result: AuthenticatedUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
