"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle2, TrendingUp, Landmark } from "lucide-react";

const SETTLEMENTS = [
  { id: "s1", number: "STL-ABC123", amount: 324000, commission: 16200, net: 307800, currency: "USD", status: "paid", paidAt: "2026-04-10", method: "Stripe Connect" },
  { id: "s2", number: "STL-DEF456", amount: 156000, commission: 7800, net: 148200, currency: "USD", status: "paid", paidAt: "2026-04-05", method: "MTN Mobile Money" },
  { id: "s3", number: "STL-GHI789", amount: 89500, commission: 4475, net: 85025, currency: "USD", status: "ready", paidAt: null, method: "Pending" },
  { id: "s4", number: "STL-JKL012", amount: 210000, commission: 10500, net: 199500, currency: "USD", status: "processing", paidAt: null, method: "Stripe Connect" },
];

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}

const totalPaid = SETTLEMENTS.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.net, 0);
const totalPending = SETTLEMENTS.filter((s) => s.status !== "paid").reduce((sum, s) => sum + s.net, 0);

export default function SupplierSettlementsPage() {
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
                {formatPrice(totalPaid, "USD")}
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
                {formatPrice(totalPending, "USD")}
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
              <p className="text-lg font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>5%</p>
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
                {SETTLEMENTS.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{s.number}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatPrice(s.amount, s.currency)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--danger)]">-{formatPrice(s.commission, s.currency)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{formatPrice(s.net, s.currency)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{s.method}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "paid" ? "default" : s.status === "processing" ? "secondary" : "outline"}>
                        {s.status === "paid" && <CheckCircle2 className="w-3 h-3" />}
                        {s.status === "processing" && <Clock className="w-3 h-3" />}
                        {s.status === "ready" && <Landmark className="w-3 h-3" />}
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)]">{s.paidAt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
