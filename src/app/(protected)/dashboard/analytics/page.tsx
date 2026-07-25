"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  CreditCard,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/charts/stat-card";
import { BarChart } from "@/components/charts/bar-chart";
import { getCurrentUser } from "@/lib/queries/user";
import {
  getBuyerKpis,
  getBuyerMonthlySpend,
  getBuyerTopSuppliers,
  type KpiData,
  type MonthlyTrend,
  type TopSupplier,
} from "@/lib/queries/analytics";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompact(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return formatCurrency(cents);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export default function BuyerAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyTrend[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      const companyId = user?.company_members?.[0]?.company_id;
      if (!companyId) {
        setLoading(false);
        return;
      }
      const [k, m, s] = await Promise.all([
        getBuyerKpis(companyId),
        getBuyerMonthlySpend(companyId, 6),
        getBuyerTopSuppliers(companyId),
      ]);
      setKpis(k);
      setMonthly(m);
      setTopSuppliers(s);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  const monthlyChartData = monthly.map((m) => ({ label: formatMonthLabel(m.month), value: m.amount }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Analytics
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Overview of your purchasing activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={(kpis?.totalOrders ?? 0).toString()} subtitle="all time" icon={ShoppingCart} accent="var(--amber)" />
        <StatCard label="Total Spend" value={formatCompact(kpis?.totalSpend ?? 0)} subtitle="all time" icon={CreditCard} accent="var(--success)" />
        <StatCard label="Avg Order Value" value={formatCurrency(kpis?.avgOrderValue ?? 0)} subtitle="per order" icon={DollarSign} accent="var(--indigo)" />
        <StatCard label="Active RFQs" value={(kpis?.activeRfqs ?? 0).toString()} subtitle="awaiting quotes" icon={FileText} accent="var(--terracotta)" />
      </div>

      {/* Monthly Spend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--amber)]" />
            Monthly Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No spend data yet</p>
          ) : (
            <BarChart
              data={monthlyChartData}
              color="var(--amber)"
              formatValue={(v) => formatCompact(v)}
              height={220}
            />
          )}
        </CardContent>
      </Card>

      {/* Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--terracotta)]" />
            Top Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--surface-secondary)]">
                  {["Rank", "Supplier", "Total Spend", "Orders"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
                      No supplier spend yet
                    </td>
                  </tr>
                ) : (
                  topSuppliers.map((supplier, i) => (
                    <tr key={supplier.supplierId} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <td className="px-4 py-3 text-sm font-bold text-[var(--text-tertiary)]">#{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--obsidian)]">{supplier.supplierName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{formatCurrency(supplier.totalSpend)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{supplier.orderCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
