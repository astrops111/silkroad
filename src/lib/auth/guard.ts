import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminRole = "admin_super" | "admin_moderator" | "admin_support";

const ADMIN_ROLES: AdminRole[] = ["admin_super", "admin_moderator", "admin_support"];

/**
 * Require the current user to have an admin role.
 * Returns the user profile + role on success, or a 401/403 NextResponse on failure.
 */
export async function requireAdmin(): Promise<
  | { profile: { id: string; auth_id: string }; role: AdminRole; companyId: string }
  | NextResponse
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, auth_id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("role, company_id")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (!membership || !ADMIN_ROLES.includes(membership.role as AdminRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    profile,
    role: membership.role as AdminRole,
    companyId: membership.company_id,
  };
}

/**
 * Require the current user to be a super admin.
 */
export async function requireSuperAdmin(): Promise<
  | { profile: { id: string; auth_id: string }; role: "admin_super"; companyId: string }
  | NextResponse
> {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  if (result.role !== "admin_super") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result as { profile: { id: string; auth_id: string }; role: "admin_super"; companyId: string };
}

/** Type guard: returns true when requireAdmin() returned an error response */
export function isAuthError(
  result: { profile: { id: string; auth_id: string }; role: AdminRole; companyId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
