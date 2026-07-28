import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle2, TrendingUp, Landmark, XCircle, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply, findSupplierMembership } from "@/lib/company-access";
import { getSupplierSettlements } from "@/lib/settlement/engine";

export const dynamic = "force-dynamic";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  processing: Clock,
  ready: Landmark,
  pending: Clock,
  calculating: Clock,
  failed: XCircle,
  disputed: AlertTriangle,
  cancelled: XCircle,
};

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe Connect",
  xtransfer: "XTransfer",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  platform_wallet: "Platform Wallet",
};

export default async function SupplierSettlementsPage() {
  const user = await getCurrentUser();
  const membership = findSupplierMembership(user?.company_members);
  if (!membership || !canSupply(membership.companies?.type)) {
    redirect("/dashboard");
  }

  const settlements = await getSupplierSettlements(membership.company_id);

  const currency = settlements[0]?.currency ?? "USD";
  const totalPaid = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + Number(s.net_payout), 0);
  const totalPending = settlements
    .filter((s) => s.status !== "paid")
    .reduce((sum, s) => sum + Number(s.net_payout), 0);
  const totalGross = settlements.reduce((sum, s) => sum + Number(s.gross_sales), 0);
  const totalCommission = settlements.reduce((sum, s) => sum + Number(s.total_commission), 0);
  const commissionRateLabel = totalGross > 0 ? `${((totalCommission / totalGross) * 100).toFixed(1)}%` : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
        Settlements & Payouts
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Total Paid</p>
              <p className="text-lg font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
                {formatPrice(totalPaid, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Pending Payout</p>
              <p className="text-lg font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
                {formatPrice(totalPending, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Commission Rate</p>
              <p className="text-lg font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
                {commissionRateLabel}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlements table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--surface-secondary)]">
                  {["Settlement", "Gross Sales", "Commission", "Net Payout", "Method", "Status", "Paid"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => {
                  const StatusIcon = STATUS_ICON[s.status ?? ""] ?? Clock;
                  return (
                    <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{s.settlement_number}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatPrice(Number(s.gross_sales), s.currency ?? currency)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--danger)]">-{formatPrice(Number(s.total_commission), s.currency ?? currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{formatPrice(Number(s.net_payout), s.currency ?? currency)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {s.payout_method ? (METHOD_LABELS[s.payout_method] ?? s.payout_method) : "Pending"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === "paid" ? "default" : s.status === "processing" ? "secondary" : "outline"}>
                          <StatusIcon className="w-3 h-3" />
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                        {s.paid_at ? new Date(s.paid_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {settlements.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">No settlements yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
