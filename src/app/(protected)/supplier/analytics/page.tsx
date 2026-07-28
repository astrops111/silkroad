import { redirect } from "next/navigation";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Star,
  TrendingUp,
  Clock,
  Truck,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/charts/stat-card";
import { BarChart } from "@/components/charts/bar-chart";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply, findSupplierMembership } from "@/lib/company-access";
import {
  getSupplierKpis,
  getSupplierMonthlyRevenue,
  getSupplierTopProducts,
} from "@/lib/queries/analytics";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function formatCompact(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return formatCurrency(cents);
}

export default async function SupplierAnalyticsPage() {
  const user = await getCurrentUser();
  const membership = findSupplierMembership(user?.company_members);
  if (!membership || !canSupply(membership.companies?.type)) {
    redirect("/dashboard");
  }

  const companyId = membership.company_id;
  const [kpis, monthly, topProducts] = await Promise.all([
    getSupplierKpis(companyId),
    getSupplierMonthlyRevenue(companyId),
    getSupplierTopProducts(companyId),
  ]);

  const monthlyChart = monthly.map((m) => ({
    label: MONTH_LABELS[Number(m.month.slice(5, 7)) - 1] ?? m.month,
    value: m.amount,
  }));
  const maxRevenue = topProducts[0]?.revenue ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Analytics
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Your performance and revenue overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={formatCompact(kpis.totalRevenue)} subtitle="all time" icon={DollarSign} accent="var(--amber)" />
        <StatCard label="Total Orders" value={kpis.totalOrders.toString()} subtitle="all time" icon={ShoppingCart} accent="var(--indigo)" />
        <StatCard label="Active Products" value={kpis.activeProducts.toString()} subtitle="approved & listed" icon={Package} accent="var(--terracotta)" />
        <StatCard label="Average Rating" value={kpis.averageRating.toFixed(1)} subtitle="out of 5.0" icon={Star} accent="var(--success)" />
        <StatCard label="Response Rate" value={`${kpis.responseRate}%`} subtitle="within 24h" icon={Clock} accent="var(--info)" />
        <StatCard label="On-Time Delivery" value={`${kpis.onTimeDeliveryRate}%`} subtitle="last 90 days" icon={Truck} accent="var(--success)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--amber)]" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChart.length > 0 ? (
              <BarChart
                data={monthlyChart}
                color="var(--amber)"
                formatValue={(v) => formatCompact(v)}
                height={220}
              />
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No revenue in the last 12 months yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--indigo)]" />
              Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, i) => {
                  const pct = (product.revenue / maxRevenue) * 100;
                  return (
                    <div key={product.productId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-primary)] font-medium truncate max-w-[60%]">
                          {i + 1}. {product.name}
                        </span>
                        <span className="text-[var(--text-secondary)] shrink-0">
                          {formatCurrency(product.revenue)} · {product.units} units
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-tertiary)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: "var(--indigo)" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No sales yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
