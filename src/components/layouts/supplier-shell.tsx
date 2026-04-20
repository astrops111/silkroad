"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Megaphone,
  Crown,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/supplier/dashboard" },
  { icon: Package, label: "Products", href: "/supplier/products" },
  { icon: Sparkles, label: "AI Listing", href: "/supplier/products/ai-listing" },
  { icon: TrendingUp, label: "Smart Pricing", href: "/supplier/products/pricing" },
  { icon: Megaphone, label: "Promoted", href: "/supplier/products/promote" },
  { icon: ShoppingCart, label: "Orders", href: "/supplier/orders" },
  { icon: FileText, label: "RFQ Requests", href: "/supplier/rfq" },
  { icon: MessageSquare, label: "Messages", href: "/supplier/messages" },
  { icon: Truck, label: "Shipments", href: "/supplier/shipments" },
  { icon: BarChart3, label: "Analytics", href: "/supplier/analytics" },
  { icon: Crown, label: "Subscription", href: "/supplier/subscription" },
  { icon: Settings, label: "Settings", href: "/supplier/settings" },
];

interface SupplierShellProps {
  children: React.ReactNode;
  userName: string;
  companyName: string;
  userInitials: string;
  companyId: string;
}

export function SupplierShell({
  children,
  userName,
  companyName,
  userInitials,
}: SupplierShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[var(--surface-secondary)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-[var(--obsidian)] flex flex-col
          transition-transform duration-300 ease-[var(--ease-out-expo)]
          lg:translate-x-0 lg:static lg:z-auto shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
          <Link href="/supplier/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--amber)] flex items-center justify-center">
              <span
                className="text-[var(--obsidian)] font-bold text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SR
              </span>
            </div>
            <div>
              <span
                className="text-[var(--ivory)] font-bold text-base tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Silk Road
              </span>
              <span className="block text-[10px] text-[var(--amber)] font-medium tracking-[0.12em] uppercase">
                Supplier Portal
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[var(--ivory)]/60 hover:text-[var(--ivory)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Company badge */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--amber)]/20 flex items-center justify-center text-[var(--amber)] text-sm font-semibold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--ivory)] text-sm font-medium truncate">
                {companyName}
              </p>
              <p className="text-[var(--ivory)]/50 text-xs truncate">
                {userName}
              </p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/supplier/dashboard" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                      : "text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5"
                  }
                `}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="ml-auto opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 space-y-1">
          <div className="h-px bg-white/10 mx-3 mb-2" />
          <a
            href="/auth/logout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5 transition-all duration-200 w-full"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <Menu size={20} className="text-[var(--text-primary)]" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors">
              <Bell size={18} className="text-[var(--text-secondary)]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--terracotta)] rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
