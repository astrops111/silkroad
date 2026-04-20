import { getCurrentUser, type UserWithCompany } from "@/lib/queries/user";
import { redirect } from "next/navigation";
import { SupplierShell } from "@/components/layouts/supplier-shell";

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) as UserWithCompany;
  const primaryMembership =
    user.company_members.find((m) => m.is_primary) ?? user.company_members[0];
  const company = primaryMembership?.companies;

  // Only suppliers can access the supplier portal
  if (company?.type !== "supplier") {
    redirect("/dashboard");
  }

  return (
    <SupplierShell
      userName={user.full_name ?? user.email ?? "User"}
      companyName={company.name}
      userInitials={getInitials(user.full_name ?? user.email ?? "U")}
      companyId={company.id}
    >
      {children}
    </SupplierShell>
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
