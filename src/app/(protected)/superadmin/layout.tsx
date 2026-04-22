import { redirect } from "next/navigation";
import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";
import { SuperAdminShell } from "@/components/layouts/superadmin-shell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;

  // Filter by role rather than indexing [0] — superadmins may have
  // other memberships (supplier/buyer) that come before the admin row.
  const superadminMembership = user.company_members.find(
    (m) => m.role === "admin_super"
  );
  if (!superadminMembership) {
    redirect("/admin/dashboard");
  }

  return (
    <SuperAdminShell
      userName={user.full_name ?? user.email ?? "Super Admin"}
      userInitials={getInitials(user.full_name ?? user.email ?? "SA")}
    >
      {children}
    </SuperAdminShell>
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
