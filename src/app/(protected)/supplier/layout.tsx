import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SupplierShell } from "@/components/layouts/supplier-shell";
import { NoProfilePanel } from "@/components/auth/NoProfilePanel";
import { canBuy, canSupply } from "@/lib/company-access";
import type { CompanyType, PlatformRole } from "@/lib/supabase/database.types";

// Supplier portal layout.
//
// Uses the same bulletproof pattern as /dashboard:
//   1. supabase.auth.getUser() to verify the session (cryptographic JWT check).
//   2. Service-client query for the user's own profile + memberships. This
//      bypasses RLS for the user's already-verified row and avoids the
//      parallel-layout race where the cookie-scoped client returns empty.
//
// Access is granted to companies of type 'supplier' OR 'both' (per the
// canSupply helper). If the user has no such membership, we render the
// NoProfilePanel in place — the URL stays at /supplier/dashboard.

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  // Disambiguate via !user_id — company_members has a second FK to
  // user_profiles via invited_by, which makes the plain nested select
  // return null ("more than one relationship found").
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      `
      id,
      email,
      full_name,
      company_members!user_id (
        role,
        is_primary,
        companies (id, name, type)
      )
    `
    )
    .eq("auth_id", authUser.id)
    .maybeSingle();

  type Row = {
    id: string;
    email: string | null;
    full_name: string | null;
    company_members:
      | {
          role: PlatformRole;
          is_primary: boolean;
          companies: { id: string; name: string; type: CompanyType } | null;
        }[]
      | null;
  };
  const row = (profile ?? null) as Row | null;

  const userName = row?.full_name ?? row?.email ?? authUser.email ?? "User";
  const userInitials = getInitials(userName);

  const supplierMembers =
    row?.company_members?.filter((m) => canSupply(m.companies?.type)) ?? [];

  if (supplierMembers.length === 0) {
    const hasBuyer =
      row?.company_members?.some((m) => canBuy(m.companies?.type)) ?? false;
    return (
      <NoProfilePanel
        wantedPortal="supplier"
        userEmail={row?.email ?? authUser.email ?? null}
        hasOtherPortal={hasBuyer}
      />
    );
  }

  const primary =
    supplierMembers.find((m) => m.is_primary) ?? supplierMembers[0];
  const company = primary.companies;

  const isSuperAdmin =
    row?.company_members?.some((m) => m.role === "admin_super") ?? false;

  return (
    <SupplierShell
      userName={userName}
      companyName={company?.name ?? "Supplier"}
      userInitials={userInitials}
      companyId={company?.id ?? ""}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </SupplierShell>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
