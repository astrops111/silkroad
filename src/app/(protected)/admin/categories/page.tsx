import {
  getAdminCategoryTree,
  getCategoryProductCounts,
} from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/queries/user";
import CategoryManager from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [tree, counts, user] = await Promise.all([
    getAdminCategoryTree(),
    getCategoryProductCounts(),
    getCurrentUser(),
  ]);

  const role = user?.company_members?.[0]?.role;
  const canDelete = role === "admin_super";

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Categories
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Manage the taxonomy suppliers pick from when listing products.
        </p>
      </div>

      <CategoryManager tree={tree} productCounts={counts} canDelete={canDelete} />
    </div>
  );
}
