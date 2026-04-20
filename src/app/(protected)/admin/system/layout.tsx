import { redirect } from "next/navigation";
import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;
  const membership = user.company_members[0];

  // Only super admins can access system monitoring
  if (!membership || membership.role !== "admin_super") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
