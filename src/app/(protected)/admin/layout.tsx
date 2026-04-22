import { redirect } from "next/navigation";
import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";
import { AdminShell } from "@/components/layouts/admin-shell";

const ADMIN_ROLES = ["admin_super", "admin_moderator", "admin_support"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;

  // Filter by role, not by array index — a user can have both
  // admin + supplier/buyer memberships, and the admin one may not be first.
  const adminMembership = user.company_members.find((m) =>
    (ADMIN_ROLES as readonly string[]).includes(m.role)
  );
  if (!adminMembership) {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      userName={user.full_name ?? user.email ?? "Admin"}
      userInitials={getInitials(user.full_name ?? user.email ?? "A")}
      role={adminMembership.role as AdminRole}
    >
      {children}
    </AdminShell>
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
