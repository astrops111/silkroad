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
  Upload,
  TrendingUp,
  Megaphone,
  Crown,
  Users,
} from "lucide-react";

const CORE_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/supplier/dashboard" },
  { icon: Package, label: "Products", href: "/supplier/products" },
  { icon: Upload, label: "Bulk Import", href: "/supplier/products/bulk-import" },
  { icon: FileText, label: "RFQ Requests", href: "/supplier/rfq" },
  { icon: MessageSquare, label: "Messages", href: "/supplier/messages" },
  { icon: Users, label: "Team & Contacts", href: "/supplier/contacts" },
  { icon: Settings, label: "Settings", href: "/supplier/settings" },
];

const ADVANCED_ITEMS = [
  { icon: Megaphone, label: "Promoted", href: "/supplier/products/promote" },
  { icon: TrendingUp, label: "Smart Pricing", href: "/supplier/products/pricing" },
  { icon: ShoppingCart, label: "Orders", href: "/supplier/orders" },
  { icon: Truck, label: "Shipments", href: "/supplier/shipments" },
  { icon: BarChart3, label: "Analytics", href: "/supplier/analytics" },
  { icon: Crown, label: "Subscription", href: "/supplier/subscription" },
];

interface SupplierShellProps {
  children: React.ReactNode;
  userName: string;
  companyName: string;
  userInitials: string;
  companyId: string;
  isSuperAdmin?: boolean;
}

export function SupplierShell({
  children,
  userName,
  companyName,
  userInitials,
  isSuperAdmin = false,
}: SupplierShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Pick the single most-specific nav entry for the current pathname. Using
  // startsWith naively lights up both "Products" and "Bulk Import" when the
  // URL is /supplier/products/bulk-import, since the latter is nested under
  // the former. We match the longest href that is either exact or a path
  // segment prefix, and mark only that one as active.
  const allHrefs = [
    ...CORE_ITEMS.map((i) => i.href),
    ...(isSuperAdmin ? ADVANCED_ITEMS.map((i) => i.href) : []),
  ];
  const activeHref =
    allHrefs
      .filter(
        (href) => pathname === href || pathname.startsWith(href + "/")
      )
      .sort((a, b) => b.length - a.length)[0] ?? null;

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
                Silk Road Africa
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
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-1">
            {CORE_ITEMS.map((item) => {
              const isActive = activeHref === item.href;
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
          </div>

          {isSuperAdmin && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-3 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ivory)]/30">
                  Advanced
                </p>
                <Crown size={10} className="text-[var(--amber)]/70" />
              </div>
              <div className="space-y-1">
                {ADVANCED_ITEMS.map((item) => {
                  const isActive = activeHref === item.href;
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
              </div>
            </div>
          )}
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
