"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Upload,
  TrendingUp,
  Megaphone,
  Crown,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Gem,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUnreadMessagesCount } from "@/hooks/use-unread-messages";

const CORE_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/supplier/dashboard" },
  { icon: Package, label: "Products", href: "/supplier/products" },
  { icon: Upload, label: "Bulk Import", href: "/supplier/products/bulk-import" },
  { icon: Gem, label: "Resources", href: "/supplier/resources" },
  { icon: ShoppingCart, label: "Orders", href: "/supplier/orders" },
  { icon: FileText, label: "RFQ Requests", href: "/supplier/rfq" },
  { icon: MessageSquare, label: "Messages", href: "/supplier/messages" },
  { icon: BarChart3, label: "Analytics", href: "/supplier/analytics" },
  { icon: Users, label: "Team & Contacts", href: "/supplier/contacts" },
  { icon: Settings, label: "Settings", href: "/supplier/settings" },
];

const ADVANCED_ITEMS = [
  { icon: Megaphone, label: "Promoted", href: "/supplier/products/promote" },
  { icon: TrendingUp, label: "Smart Pricing", href: "/supplier/products/pricing" },
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const unreadMessages = useUnreadMessagesCount();

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
      {/* Sidebar — visible by default at every screen size; collapses only when the user toggles it */}
      <aside
        className={`flex flex-col bg-[var(--obsidian)] shrink-0 transition-[width] duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center px-6 h-16 border-b border-white/10">
          <Link href="/supplier/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--amber)] flex items-center justify-center shrink-0">
              <span
                className="text-[var(--obsidian)] font-bold text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SR
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span
                  className="text-[var(--ivory)] font-bold text-base tracking-tight block truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Silk Road Africa
                </span>
                <span className="block text-[10px] text-[var(--amber)] font-medium tracking-[0.12em] uppercase">
                  Supplier Portal
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Company badge */}
        <div className="px-6 py-4">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-[var(--amber)]/20 flex items-center justify-center text-[var(--amber)] text-sm font-semibold shrink-0">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[var(--ivory)] text-sm font-medium truncate">
                  {companyName}
                </p>
                <p className="text-[var(--ivory)]/50 text-xs truncate">
                  {userName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-1">
            {CORE_ITEMS.map((item) => {
              const isActive = activeHref === item.href;
              const isMessages = item.href === "/supplier/messages";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${collapsed ? "justify-center px-0" : ""}
                    ${
                      isActive
                        ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                        : "text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5"
                    }
                  `}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {isMessages && unreadMessages > 0 && (
                    collapsed ? (
                      <span
                        className="absolute top-2 right-2 w-2 h-2 rounded-full"
                        style={{ background: "var(--terracotta)" }}
                      />
                    ) : (
                      <span
                        className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                        style={{ background: "var(--terracotta)", color: "white" }}
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    )
                  )}
                  {!collapsed && isActive && !(isMessages && unreadMessages > 0) && (
                    <ChevronRight size={14} className="ml-auto opacity-60" />
                  )}
                </Link>
              );
            })}
          </div>

          {isSuperAdmin && (
            <div className="mt-6">
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ivory)]/30">
                    Advanced
                  </p>
                  <Crown size={10} className="text-[var(--amber)]/70" />
                </div>
              )}
              <div className="space-y-1">
                {ADVANCED_ITEMS.map((item) => {
                  const isActive = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${collapsed ? "justify-center px-0" : ""}
                        ${
                          isActive
                            ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                            : "text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5"
                        }
                      `}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && isActive && (
                        <ChevronRight size={14} className="ml-auto opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 pt-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5 transition-all duration-200 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} className="shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={18} className="shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 pt-1 space-y-1">
          <div className="h-px bg-white/10 mx-3 mb-2" />
          <a
            href="/auth/logout"
            title={collapsed ? "Sign Out" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--ivory)]/60 hover:text-[var(--ivory)] hover:bg-white/5 transition-all duration-200 w-full ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] flex items-center justify-end px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/supplier/messages"
              className="relative p-2.5 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="Messages"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
              {unreadMessages > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                  style={{ background: "var(--terracotta)", color: "white" }}
                >
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>

            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
