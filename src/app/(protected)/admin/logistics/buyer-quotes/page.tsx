import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClipboardList, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  submitted:   "text-blue-700 bg-blue-50 border-blue-200",
  calculating: "text-amber-700 bg-amber-50 border-amber-200",
  ready:       "text-green-700 bg-green-50 border-green-200",
  accepted:    "text-green-700 bg-green-100 border-green-300",
  paid:        "text-green-800 bg-green-100 border-green-400",
  expired:     "text-gray-500 bg-gray-50 border-gray-200",
  cancelled:   "text-red-600 bg-red-50 border-red-200",
};

const SHIPPING_LABELS: Record<string, string> = {
  lcl: "LCL", fcl_20: "FCL 20'", fcl_40: "FCL 40'",
  fcl_40hc: "FCL 40' HC", air_express: "Air Express", air_freight: "Air Freight",
};

export default async function AdminBuyerQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("buyer_quote_requests")
    .select(`
      id, quote_number, status, destination_country, destination_city,
      shipping_mode, incoterms, product_subtotal, total_amount, currency,
      expires_at, created_at,
      user_profiles!buyer_user_id ( full_name, email )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: quotes, error } = await query;

  const allStatuses = ["submitted", "calculating", "ready", "accepted", "paid", "expired", "cancelled"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Buyer Quote Requests
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Review submitted carts and fill in landed costs to send quotes back to buyers.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/logistics/buyer-quotes"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!status || status === "all" ? "bg-[var(--obsidian)] text-white border-transparent" : "bg-white border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--obsidian)]"}`}
        >
          All
        </Link>
        {allStatuses.map((s) => (
          <Link
            key={s}
            href={`/admin/logistics/buyer-quotes?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${status === s ? "bg-[var(--obsidian)] text-white border-transparent" : "bg-white border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--obsidian)]"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error.message}
        </div>
      )}

      {!error && (!quotes || quotes.length === 0) && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[var(--border-subtle)]">
          <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">No quote requests{status && status !== "all" ? ` with status "${status}"` : ""}.</p>
        </div>
      )}

      {quotes && quotes.length > 0 && (
        <div className="space-y-3">
          {quotes.map((q) => {
            const profiles = (q as unknown as { user_profiles: { full_name: string | null; email: string | null }[] }).user_profiles;
            const buyer = Array.isArray(profiles) ? profiles[0] ?? null : profiles;
            return (
              <Link
                key={q.id}
                href={`/admin/logistics/buyer-quotes/${q.id}`}
                className="block bg-white rounded-xl border border-[var(--border-subtle)] p-5 hover:border-[var(--obsidian)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                    <div>
                      <p className="font-mono text-sm font-semibold text-[var(--obsidian)]">{q.quote_number}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {buyer?.full_name ?? buyer?.email ?? "Unknown buyer"} ·{" "}
                        {new Date(q.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[q.status] ?? STATUS_STYLE.submitted}`}>
                      {q.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--obsidian)] transition-colors" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Destination</p>
                    <p className="font-medium">
                      {q.destination_city ? `${q.destination_city}, ` : ""}{q.destination_country}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Mode</p>
                    <p className="font-medium">{SHIPPING_LABELS[q.shipping_mode] ?? q.shipping_mode} · {q.incoterms.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Goods Value</p>
                    <p className="font-medium">
                      {q.product_subtotal != null
                        ? `${q.currency} ${(q.product_subtotal / 100).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Quoted Total</p>
                    <p className={`font-bold ${q.total_amount ? "text-green-700" : "text-[var(--text-tertiary)]"}`}>
                      {q.total_amount != null
                        ? `${q.currency} ${(q.total_amount / 100).toFixed(2)}`
                        : "Pending"}
                    </p>
                  </div>
                </div>

                {q.status === "submitted" && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600">
                    <Clock className="w-3.5 h-3.5" />
                    Awaiting cost calculation — click to fill in
                  </div>
                )}
                {q.status === "ready" && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Quote sent — waiting for buyer to accept
                  </div>
                )}
                {q.status === "expired" && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <XCircle className="w-3.5 h-3.5" />
                    Expired {q.expires_at ? new Date(q.expires_at).toLocaleDateString() : ""}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
