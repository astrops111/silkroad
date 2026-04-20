"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  CreditCard,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/charts/stat-card";
import { BarChart } from "@/components/charts/bar-chart";

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

// Mock data — will be replaced with getBuyerKpis(), getBuyerMonthlySpend(), getBuyerTopSuppliers()
const MOCK_KPIS = { totalOrders: 156, totalSpend: 48200000, avgOrderValue: 3089744, activeRfqs: 8 };
const MOCK_MONTHLY = [
  { label: "Nov", value: 3200000 },
  { label: "Dec", value: 4100000 },
  { label: "Jan", value: 3800000 },
  { label: "Feb", value: 5200000 },
  { label: "Mar", value: 4600000 },
  { label: "Apr", value: 5800000 },
];
const MOCK_TOP_SUPPLIERS = [
  { name: "HuaNan Precision Machinery", spend: 12400000, orders: 23 },
  { name: "SunPower Energy Tech", spend: 8900000, orders: 15 },
  { name: "BrightPath Lighting", spend: 7200000, orders: 31 },
  { name: "Silk Valley Textiles", spend: 5600000, orders: 42 },
  { name: "AgroTech Equipment", spend: 3100000, orders: 8 },
];
const MOCK_CATEGORIES = [
  { label: "Machinery", value: 18500000 },
  { label: "Electronics", value: 12300000 },
  { label: "Textiles", value: 8700000 },
  { label: "Agriculture", value: 5200000 },
  { label: "Construction", value: 3500000 },
];

export default function BuyerAnalyticsPage() {
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
        <StatCard label="Total Orders" value={MOCK_KPIS.totalOrders.toString()} subtitle="all time" icon={ShoppingCart} accent="var(--amber)" />
        <StatCard label="Total Spend" value={formatCompact(MOCK_KPIS.totalSpend)} subtitle="all time" icon={CreditCard} accent="var(--success)" />
        <StatCard label="Avg Order Value" value={formatCurrency(MOCK_KPIS.avgOrderValue)} subtitle="per order" icon={DollarSign} accent="var(--indigo)" />
        <StatCard label="Active RFQs" value={MOCK_KPIS.activeRfqs.toString()} subtitle="awaiting quotes" icon={FileText} accent="var(--terracotta)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Spend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--amber)]" />
              Monthly Spend
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

        {/* Spend by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--indigo)]" />
              Spend by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={MOCK_CATEGORIES}
              color="var(--indigo)"
              formatValue={(v) => formatCompact(v)}
              height={220}
            />
          </CardContent>
        </Card>
      </div>

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
                {MOCK_TOP_SUPPLIERS.map((supplier, i) => (
                  <tr key={supplier.name} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="px-4 py-3 text-sm font-bold text-[var(--text-tertiary)]">#{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--obsidian)]">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--obsidian)]">{formatCurrency(supplier.spend)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{supplier.orders}</td>
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
