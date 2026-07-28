import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Only super admins can access system monitoring — check every membership,
  // not just the first row, and tolerate an expired session.
  const isSuper =
    user?.company_members?.some((m) => m.role === "admin_super") ?? false;
  if (!isSuper) {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
