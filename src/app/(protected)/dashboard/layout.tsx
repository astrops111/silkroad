import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";
import { DashboardShell } from "@/components/layouts/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;
  const primaryMembership = user.company_members.find((m) => m.is_primary) ?? user.company_members[0];
  const company = primaryMembership?.companies;

  return (
    <DashboardShell
      userName={user.full_name ?? user.email ?? "User"}
      companyName={company?.name ?? "My Company"}
      userInitials={getInitials(user.full_name ?? user.email ?? "U")}
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
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
