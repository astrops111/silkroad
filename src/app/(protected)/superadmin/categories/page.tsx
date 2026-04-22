import {
  getAdminCategoryTree,
  getCategoryProductCounts,
} from "@/lib/queries/categories";
import CategoryManager from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function SuperAdminCategoriesPage() {
  const [tree, counts] = await Promise.all([
    getAdminCategoryTree(),
    getCategoryProductCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Category Taxonomy
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Full control of the platform taxonomy. Deletions are allowed when no products depend on the category.
        </p>
      </div>

      <CategoryManager tree={tree} productCounts={counts} canDelete={true} />
    </div>
  );
}
