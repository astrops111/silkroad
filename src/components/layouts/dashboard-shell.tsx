"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  MessageSquare,
  Heart,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Search,
  Globe,
  LogOut,
  Sparkles,
} from "lucide-react";

const BUYER_NAV = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: ShoppingCart, label: "Orders", href: "/dashboard/orders" },
  { icon: FileText, label: "RFQ & Quotations", href: "/dashboard/rfq" },
  { icon: Sparkles, label: "AI Supplier Match", href: "/dashboard/rfq/match" },
  { icon: Package, label: "Products", href: "/dashboard/products" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
  { icon: Heart, label: "Saved Items", href: "/dashboard/saved" },
  { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const SUPPLIER_NAV = [
  { icon: LayoutDashboard, label: "Overview", href: "/supplier" },
  { icon: Package, label: "Products", href: "/supplier/products" },
  { icon: ShoppingCart, label: "Orders", href: "/supplier/orders" },
  { icon: FileText, label: "RFQ Requests", href: "/supplier/rfq" },
  { icon: MessageSquare, label: "Messages", href: "/supplier/messages" },
  { icon: BarChart3, label: "Analytics", href: "/supplier/analytics" },
  { icon: Settings, label: "Settings", href: "/supplier/settings" },
];

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  companyName: string;
  userInitials: string;
  companyType: string;
}

export function DashboardShell({
  children,
  userName,
  companyName,
  userInitials,
  companyType,
}: DashboardShellProps) {
  const pathname = usePathname();
  const navItems = companyType === "supplier" ? SUPPLIER_NAV : BUYER_NAV;
  const dashboardLabel =
    companyType === "supplier" ? "Supplier Portal" : "Buyer Dashboard";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--obsidian)] min-h-screen shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--amber)] to-[var(--amber-dark)] flex items-center justify-center">
              <span
                className="font-black text-[var(--obsidian)] text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SR
              </span>
            </div>
            <div>
              <span
                className="text-[15px] font-bold text-[var(--ivory)] tracking-tight leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Silk Road Africa
              </span>
              <span className="block text-[10px] text-[var(--amber)] font-medium tracking-[0.12em] uppercase mt-0.5">
                {dashboardLabel}
              </span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard" || item.href === "/supplier"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-[var(--ivory)]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-[var(--terracotta)]/20 border border-[var(--terracotta)]/30 flex items-center justify-center text-xs font-bold text-[var(--terracotta-light)]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--ivory)] truncate">
                {userName}
              </div>
              <div className="text-xs text-white/30">{companyName}</div>
            </div>
            <a
              href="/auth/logout"
              className="p-1.5 text-white/25 hover:text-white/50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[var(--surface-primary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between h-16 px-8">
            <div className="flex items-center gap-4">
              <h1
                className="text-lg font-bold text-[var(--obsidian)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {dashboardLabel}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center h-9 w-72 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-3 focus-within:border-[var(--amber)] transition-colors">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search orders, products..."
                  className="w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              <NotificationDropdown variant="light" />

              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">
                <Globe className="w-4 h-4" />
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 bg-[var(--surface-secondary)]">
          {children}
        </main>
      </div>
    </div>
  );
}
