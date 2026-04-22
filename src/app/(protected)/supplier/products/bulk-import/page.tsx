import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { getCategories } from "@/lib/queries/categories";
import { canSupply } from "@/lib/company-access";
import BulkImportClient from "./bulk-import-client";

export const dynamic = "force-dynamic";

export default async function BulkImportPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategories(),
  ]);

  const membership = user?.company_members?.find((m) =>
    canSupply(m.companies?.type)
  );
  if (!membership) redirect("/dashboard");

  return (
    <BulkImportClient
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        parentId: c.parent_id,
      }))}
    />
  );
}
