"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { MarketRegion, PlatformRole } from "@/lib/supabase/database.types";

const ADMIN_ROLES = ["admin_super", "admin_moderator", "admin_support"] as const;
const ADMIN_COMPANY_SLUG = "silkroad-platform-admins";
const ADMIN_COMPANY_NAME = "SilkRoad Platform Admins";

export type UserListRow = {
  userId: string;
  authId: string | null;
  email: string | null;
  fullName: string | null;
  countryCode: string | null;
  createdAt: string | null;
  hasBuyer: boolean;
  hasSupplier: boolean;
  hasAdmin: boolean;
  companies: { id: string; name: string; type: string }[];
};

export type ListUsersResult = {
  users: UserListRow[];
  total: number;
  page: number;
  pageSize: number;
};

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const caller = await getCurrentUser();
  if (!caller) return { ok: false, error: "Not authenticated" };
  const isAdmin = caller.company_members.some((m) =>
    (ADMIN_ROLES as readonly string[]).includes(m.role)
  );
  if (!isAdmin) return { ok: false, error: "Forbidden — admin only" };
  return { ok: true };
}

export async function listUsers(
  page: number = 1,
  pageSize: number = 25
): Promise<ListUsersResult> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error(guard.error);

  const safePageSize = Math.min(Math.max(pageSize, 5), 200);
  const safePage = Math.max(page, 1);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const admin = createServiceClient();

  const { data, count } = await admin
    .from("user_profiles")
    .select(
      `
      id,
      auth_id,
      email,
      full_name,
      country_code,
      created_at,
      company_members!user_id (
        role,
        companies ( id, name, type )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  type Row = {
    id: string;
    auth_id: string | null;
    email: string | null;
    full_name: string | null;
    country_code: string | null;
    created_at: string | null;
    company_members:
      | {
          role: string;
          companies: { id: string; name: string; type: string } | null;
        }[]
      | null;
  };

  const users: UserListRow[] = ((data as Row[] | null) ?? []).map((r) => {
    const members = r.company_members ?? [];
    const companies = members
      .map((m) => m.companies)
      .filter((c): c is NonNullable<typeof c> => c !== null);
    return {
      userId: r.id,
      authId: r.auth_id,
      email: r.email,
      fullName: r.full_name,
      countryCode: r.country_code,
      createdAt: r.created_at,
      hasBuyer: members.some((m) => m.companies?.type === "buyer_org"),
      hasSupplier: members.some((m) => m.companies?.type === "supplier"),
      hasAdmin: members.some((m) =>
        (ADMIN_ROLES as readonly string[]).includes(m.role)
      ),
      companies,
    };
  });

  return {
    users,
    total: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

export type AddRoleInput =
  | {
      userId: string;
      role: "buyer" | "supplier";
      companyName: string;
      countryCode: string;
      marketRegion: string;
    }
  | { userId: string; role: "admin" };

export type AddRoleResult = { success: boolean; error?: string };

export async function addRoleToUser(input: AddRoleInput): Promise<AddRoleResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const admin = createServiceClient();

  if (input.role === "admin") {
    // Ensure a shared admin company exists, then attach the user to it.
    let { data: adminCo } = await admin
      .from("companies")
      .select("id")
      .eq("slug", ADMIN_COMPANY_SLUG)
      .maybeSingle();

    if (!adminCo) {
      const { data: created, error: createErr } = await admin
        .from("companies")
        .insert({
          name: ADMIN_COMPANY_NAME,
          slug: ADMIN_COMPANY_SLUG,
          type: "buyer_org", // schema has no 'admin' company type
          country_code: "CN",
          market_region: "global",
        })
        .select("id")
        .single();
      if (createErr || !created) {
        return {
          success: false,
          error: createErr?.message ?? "Failed to create admin company",
        };
      }
      adminCo = created;
    }

    const { error: memberErr } = await admin.from("company_members").insert({
      company_id: adminCo.id,
      user_id: input.userId,
      role: "admin_super" as PlatformRole,
      is_primary: false,
    });
    if (memberErr) return { success: false, error: memberErr.message };
    return { success: true };
  }

  // buyer or supplier: create a new company + membership.
  if (!input.companyName || !input.countryCode || !input.marketRegion) {
    return { success: false, error: "Missing company details" };
  }

  const companyType = input.role === "supplier" ? "supplier" : "buyer_org";
  const { data: company, error: coErr } = await admin
    .from("companies")
    .insert({
      name: input.companyName,
      slug: slugify(input.companyName),
      type: companyType,
      country_code: input.countryCode,
      market_region: input.marketRegion as MarketRegion,
    })
    .select("id")
    .single();
  if (coErr || !company) {
    return { success: false, error: coErr?.message ?? "Company insert failed" };
  }

  const platformRole: PlatformRole =
    input.role === "supplier" ? "supplier_owner" : "buyer";
  const { error: memberErr } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: input.userId,
    role: platformRole,
    is_primary: false,
  });
  if (memberErr) return { success: false, error: memberErr.message };

  if (input.role === "supplier") {
    await admin.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: input.countryCode,
    });
  }

  return { success: true };
}
