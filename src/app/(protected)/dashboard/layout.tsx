import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layouts/dashboard-shell";

// Minimal dashboard layout.
//
// Checks that the request is authenticated, loads the user's first
// company via the service client (bypasses RLS races), renders the
// shell. No portal filtering — /dashboard is open to anyone signed in.

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/login");

  // Look up profile + first company via service client so RLS can't
  // return an empty result for the signed-in user's own row.
  // Disambiguate via !user_id — company_members has a second FK to
  // user_profiles via invited_by, which would otherwise make the embed
  // return null.
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      `
      id,
      email,
      full_name,
      company_members!user_id (
        is_primary,
        companies (id, name, type)
      )
    `
    )
    .eq("auth_id", authUser.id)
    .maybeSingle();

  type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    company_members:
      | {
          is_primary: boolean;
          companies: { id: string; name: string; type: string } | null;
        }[]
      | null;
  };
  const row = (profile ?? null) as ProfileRow | null;

  const members = row?.company_members ?? [];
  const primary = members.find((m) => m.is_primary) ?? members[0];
  const company = primary?.companies ?? null;

  const userName = row?.full_name ?? row?.email ?? authUser.email ?? "User";
  const userInitials = getInitials(userName);

  return (
    <DashboardShell
      userName={userName}
      companyName={company?.name ?? "My Dashboard"}
      userInitials={userInitials}
      companyType={company?.type ?? "buyer_org"}
    >
      {children}
    </DashboardShell>
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
