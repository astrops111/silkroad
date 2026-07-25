import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Download, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/queries/user";
import { canBuy } from "@/lib/company-access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  issued: "Issued",
  draft: "Draft",
  voided: "Voided",
  paid: "Paid",
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format((cents || 0) / 100);
}

export default async function BuyerInvoicesPage() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) => canBuy(m.companies?.type));
  if (!membership) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();
  const { data: invoices } = await supabase
    .from("b2b_invoices")
    .select("id, invoice_number, invoice_type, status, total_amount, currency, issued_at, country_code, html_storage_path")
    .eq("recipient_company_id", membership.company_id)
    .order("issued_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Invoices
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Invoices issued for your completed orders
        </p>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No invoices yet</p>
          <p className="text-xs mt-1 text-[var(--text-tertiary)]">
            Invoices are issued once your order is confirmed and paid.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {["Invoice #", "Type", "Amount", "Status", "Issued", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-[var(--text-primary)]">{inv.invoice_number}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)] capitalize">{inv.invoice_type?.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">{money(inv.total_amount, inv.currency)}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">{STATUS_LABELS[inv.status ?? ""] ?? inv.status}</td>
                  <td className="px-5 py-3 text-[var(--text-tertiary)]">
                    {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {inv.html_storage_path ? (
                      <Link
                        href={inv.html_storage_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        View
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
