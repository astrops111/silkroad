import { redirect } from "next/navigation";
import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";
import { AdminShell } from "@/components/layouts/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;
  const membership = user.company_members[0];

  // Only admin roles can access
  const adminRoles = ["admin_super", "admin_moderator", "admin_support"];
  if (!membership || !adminRoles.includes(membership.role)) {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      userName={user.full_name ?? user.email ?? "Admin"}
      userInitials={getInitials(user.full_name ?? user.email ?? "A")}
      role={membership.role}
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
