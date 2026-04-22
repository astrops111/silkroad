import { redirect } from "next/navigation";
import { getCategories } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import NewProductForm from "./new-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategories(),
  ]);

  const membership = user?.company_members?.find((m) =>
    canSupply(m.companies?.type)
  );
  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <NewProductForm
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        parentId: c.parent_id,
      }))}
      supplierCompanyId={membership.company_id}
    />
  );
}
