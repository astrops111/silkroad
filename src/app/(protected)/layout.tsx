import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has a company — if not, redirect to onboarding
  const hasCompany = user.company_members && user.company_members.length > 0;
  if (!hasCompany) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
