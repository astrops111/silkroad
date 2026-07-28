import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Gem, Filter, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/queries/user";
import { getSupplierResourceListings } from "@/lib/queries/resources";
import { canSupply, findSupplierMembership } from "@/lib/company-access";
import ResourceRowActions from "./resource-row-actions";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "approved" | "pending" | "rejected" | "suspended";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Listings" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "pending") as "approved" | "pending" | "rejected" | "suspended";
  const styles: Record<typeof s, string> = {
    approved:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
    pending:
      "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/20",
    rejected:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
    suspended:
      "bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)] border-[var(--text-tertiary)]/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[s]}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

const PAGE_SIZE = 50;

export default async function SupplierResources({
  searchParams,
}: {
  searchParams: Promise<{ status?: StatusFilter; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const membership = findSupplierMembership(user?.company_members);
  if (!membership || !canSupply(membership.companies?.type)) {
    redirect("/dashboard");
  }

  const statusParam = params.status;
  const search = params.q?.trim();
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const { listings, total } = await getSupplierResourceListings(membership.company_id, {
    status: statusParam && statusParam !== "all" ? statusParam : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const active: StatusFilter = statusParam ?? "all";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (active !== "all") qs.set("status", active);
    if (search) qs.set("q", search);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/supplier/resources?${s}` : "/supplier/resources";
  };

  if (page > totalPages) {
    redirect(pageHref(totalPages));
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Resources
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            List raw commodities and resources for buyers around the world to discover.
          </p>
        </div>
        <Link href="/supplier/resources/new" className="btn-primary self-start">
          <Plus size={16} />
          New Listing
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
            placeholder="Search listings..."
            className="w-full pl-9 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20"
          />
        </div>
        {active !== "all" && <input type="hidden" name="status" value={active} />}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-[var(--text-tertiary)]" />
          {STATUS_FILTERS.map((f) => {
            const href =
              f.value === "all"
                ? search
                  ? `/supplier/resources?q=${encodeURIComponent(search)}`
                  : "/supplier/resources"
                : search
                  ? `/supplier/resources?status=${f.value}&q=${encodeURIComponent(search)}`
                  : `/supplier/resources?status=${f.value}`;
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
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Listing</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Price</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Available</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Origin</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Status</th>
                <th className="text-right py-3 px-4 text-[var(--text-tertiary)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const primaryImage = l.images?.[0];
                return (
                  <tr
                    key={l.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-tertiary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {primaryImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryImage}
                              alt={l.name_en}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Gem size={16} className="text-[var(--text-tertiary)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {l.name_en}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {l.resource_categories?.name_en ?? l.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                      {formatMoney(l.price_per_unit_usd ?? 0, l.currency ?? "USD")}
                      <span className="text-[var(--text-tertiary)] font-normal">
                        /{l.unit_of_measure ?? "unit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {(l.available_quantity ?? 0).toLocaleString()} {l.unit_of_measure}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {l.origin_country}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ResourceRowActions
                        listingId={l.id}
                        listingName={l.name_en}
                        status={l.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {listings.length === 0 && (
          <div className="text-center py-12">
            <Gem size={40} className="mx-auto text-[var(--text-tertiary)] mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">No resource listings found</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {search || active !== "all"
                ? "Try clearing the filter, or add a new listing."
                : "List your first resource to reach buyers around the world."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--text-tertiary)]">
        <p>
          {total === 0
            ? "0 listings"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + listings.length} of ${total} listings`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] opacity-40">
                Previous
              </span>
            )}
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] opacity-40">
                Next
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
