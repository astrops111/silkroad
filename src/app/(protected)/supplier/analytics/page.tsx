"use client";

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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function formatCompact(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return formatCurrency(cents);
}

// Mock — will be replaced with getSupplierKpis(), getSupplierMonthlyRevenue(), getSupplierTopProducts()
const MOCK_KPIS = { totalOrders: 342, totalRevenue: 12485000, activeProducts: 156, averageRating: 4.7, responseRate: 98, onTimeDeliveryRate: 96.4 };
const MOCK_MONTHLY = [
  { label: "Nov", value: 1800000 },
  { label: "Dec", value: 2200000 },
  { label: "Jan", value: 1900000 },
  { label: "Feb", value: 2600000 },
  { label: "Mar", value: 2100000 },
  { label: "Apr", value: 2800000 },
];
const MOCK_TOP_PRODUCTS = [
  { name: "3000W Fiber Laser Cutter", revenue: 4200000, units: 28 },
  { name: "CNC Press Brake 160T", revenue: 2800000, units: 15 },
  { name: "Plasma Cutting Table 1530", revenue: 1900000, units: 42 },
  { name: "Welding Robot Cell", revenue: 1500000, units: 8 },
  { name: "Spare Parts Bundle", revenue: 800000, units: 156 },
];

export default function SupplierAnalyticsPage() {
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
        <StatCard label="Total Revenue" value={formatCompact(MOCK_KPIS.totalRevenue)} subtitle="all time" icon={DollarSign} accent="var(--amber)" />
        <StatCard label="Total Orders" value={MOCK_KPIS.totalOrders.toString()} subtitle="all time" icon={ShoppingCart} accent="var(--indigo)" />
        <StatCard label="Active Products" value={MOCK_KPIS.activeProducts.toString()} subtitle="approved & listed" icon={Package} accent="var(--terracotta)" />
        <StatCard label="Average Rating" value={MOCK_KPIS.averageRating.toFixed(1)} subtitle="out of 5.0" icon={Star} accent="var(--success)" />
        <StatCard label="Response Rate" value={`${MOCK_KPIS.responseRate}%`} subtitle="within 24h" icon={Clock} accent="var(--info)" />
        <StatCard label="On-Time Delivery" value={`${MOCK_KPIS.onTimeDeliveryRate}%`} subtitle="last 90 days" icon={Truck} accent="var(--success)" />
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
            <BarChart
              data={MOCK_MONTHLY}
              color="var(--amber)"
              formatValue={(v) => formatCompact(v)}
              height={220}
            />
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
            <div className="space-y-3">
              {MOCK_TOP_PRODUCTS.map((product, i) => {
                const maxRevenue = MOCK_TOP_PRODUCTS[0].revenue;
                const pct = (product.revenue / maxRevenue) * 100;
                return (
                  <div key={product.name} className="space-y-1">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
