import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Package, Filter, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/queries/user";
import { getSupplierProducts } from "@/lib/queries/products";
import { canSupply } from "@/lib/company-access";
import ProductRowActions from "./product-row-actions";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Products" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "pending") as "approved" | "pending" | "rejected";
  const styles: Record<"approved" | "pending" | "rejected", string> = {
    approved:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
    pending:
      "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/20",
    rejected:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[s]}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function SupplierProducts({
  searchParams,
}: {
  searchParams: Promise<{ status?: StatusFilter; q?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];
  if (!membership || !canSupply(membership.companies?.type)) {
    redirect("/dashboard");
  }

  const statusParam = params.status;
  const search = params.q?.trim();

  const { products, total } = await getSupplierProducts(membership.company_id, {
    status: statusParam && statusParam !== "all" ? statusParam : undefined,
    search: search || undefined,
    limit: 100,
  });

  const active: StatusFilter = statusParam ?? "all";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Products
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your product catalog and listings.
          </p>
        </div>
        <Link href="/supplier/products/new" className="btn-primary self-start">
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      <form className="flex flex-col sm:flex-row gap-3" method="get">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20"
          />
        </div>
        {active !== "all" && (
          <input type="hidden" name="status" value={active} />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-[var(--text-tertiary)]" />
          {STATUS_FILTERS.map((f) => {
            const href =
              f.value === "all"
                ? search
                  ? `/supplier/products?q=${encodeURIComponent(search)}`
                  : "/supplier/products"
                : search
                  ? `/supplier/products?status=${f.value}&q=${encodeURIComponent(search)}`
                  : `/supplier/products?status=${f.value}`;
            const isActive = active === f.value;
            return (
              <Link
                key={f.value}
                href={href}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                    : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </form>

      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Product</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Price</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">MOQ</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Stock</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Status</th>
                <th className="text-right py-3 px-4 text-[var(--text-tertiary)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const primary =
                  p.product_images.find((i) => i.is_primary) ??
                  p.product_images[0];
                const stock = p.product_variants.reduce(
                  (sum, v) => sum + (v.stock_quantity ?? 0),
                  0
                );
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-tertiary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {primary ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primary.url}
                              alt={primary.alt_text ?? p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package
                              size={16}
                              className="text-[var(--text-tertiary)]"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {p.brand ? `${p.brand} · ` : ""}
                            {p.categories?.name ?? "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                      {formatMoney(p.base_price ?? 0, p.currency ?? "USD")}
                      <span className="text-[var(--text-tertiary)] font-normal">
                        /unit
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {(p.moq ?? 1).toLocaleString()} units
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          stock === 0
                            ? "text-[var(--danger)]"
                            : stock < 200
                              ? "text-[var(--warning)]"
                              : "text-[var(--text-primary)]"
                        }`}
                      >
                        {stock.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.moderation_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ProductRowActions
                        productId={p.id}
                        productName={p.name}
                        isActive={p.is_active ?? false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package
              size={40}
              className="mx-auto text-[var(--text-tertiary)] mb-3"
            />
            <p className="text-[var(--text-secondary)] font-medium">
              No products found
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {search || active !== "all"
                ? "Try clearing the filter, or add a new product."
                : "Add your first product to get started."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--text-tertiary)]">
        <p>
          Showing {products.length} of {total} products
        </p>
      </div>
    </div>
  );
}
