import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { getCompanyMembers } from "@/lib/queries/supplier";
import { canSupply } from "@/lib/company-access";
import ContactsPanel from "./contacts-panel";

export const dynamic = "force-dynamic";

export default async function SupplierContactsPage() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) =>
    canSupply(m.companies?.type)
  );

  if (!membership) {
    redirect("/dashboard");
  }

  const members = await getCompanyMembers(membership.company_id);

  return (
    <ContactsPanel
      currentUserId={membership.user_id}
      currentRole={membership.role}
      members={members.map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        isPrimary: m.is_primary ?? false,
        joinedAt: m.joined_at ?? "",
        fullName: m.user_profiles?.full_name ?? null,
        email: m.user_profiles?.email ?? null,
        phone: m.user_profiles?.phone ?? null,
        avatarUrl: m.user_profiles?.avatar_url ?? null,
      }))}
    />
  );
}
