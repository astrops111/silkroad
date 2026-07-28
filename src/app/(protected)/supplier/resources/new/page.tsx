import { redirect } from "next/navigation";
import { listResourceCategories } from "@/lib/queries/resources";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import NewResourceListingForm from "./new-resource-listing-form";

export const dynamic = "force-dynamic";

export default async function NewResourceListingPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    listResourceCategories(),
  ]);

  const membership = user?.company_members?.find((m) =>
    canSupply(m.companies?.type)
  );
  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <NewResourceListingForm
      categories={categories}
      supplierCompanyId={membership.company_id}
    />
  );
}
