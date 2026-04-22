import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ApplicationsList from "./applications-list";

export const dynamic = "force-dynamic";

type Status = "all" | "pending" | "in_review" | "approved" | "rejected" | "contacted";

interface ApplicationRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  company_name_local: string | null;
  country_code: string | null;
  city: string | null;
  website: string | null;
  years_in_business: string | null;
  employee_range: string | null;
  product_categories: string[] | null;
  products_description: string;
  monthly_capacity: string | null;
  existing_markets: string | null;
  certifications: string | null;
  sample_available: boolean | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const FILTERS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default async function SupplierApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>;
}) {
  const params = await searchParams;
  const active = params.status ?? "all";

  const supabase = await createClient();
  let query = supabase
    .from("supplier_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (active !== "all") query = query.eq("status", active);
  const { data, error } = await query;

  const rows = (data ?? []) as ApplicationRow[];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Supplier applications
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {rows.length} {active === "all" ? "total" : active} application
          {rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={
              f.value === "all"
                ? "/admin/supplier-applications"
                : `/admin/supplier-applications?status=${f.value}`
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              active === f.value
                ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <ApplicationsList rows={rows} />
    </div>
  );
}
