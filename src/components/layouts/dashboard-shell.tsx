"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RegionPicker } from "@/components/ui/region-picker";
import { useUnreadMessagesCount } from "@/hooks/use-unread-messages";
import { useCartStore } from "@/stores/cart";
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
  Search,
  Loader2,
  LogOut,
  Sparkles,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type SearchHit = { id: string; title: string; subtitle: string; href: string };
type SearchResults = { orders: SearchHit[]; products: SearchHit[] };

function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ orders: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setResults({ orders: [], products: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { orders: [], products: [] }))
        .then((data: SearchResults) => setResults(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const hasQuery = query.trim().length >= 2;
  const hasResults = results.orders.length > 0 || results.products.length > 0;

  return (
    <div className="relative hidden md:block" ref={ref}>
      <div className="flex items-center h-9 w-72 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-3 focus-within:border-[var(--amber)] transition-colors">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] animate-spin shrink-0" />
        ) : (
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search orders, products..."
          className="w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {open && hasQuery && (
        <div className="absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-xl z-50 overflow-hidden">
          {!loading && !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {results.orders.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)]">
                    Orders
                  </div>
                  {results.orders.map((hit) => (
                    <Link
                      key={hit.id}
                      href={hit.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <span className="font-medium text-[var(--text-primary)] truncate">{hit.title}</span>
                      <span className="text-xs text-[var(--text-tertiary)] shrink-0 capitalize">{hit.subtitle}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)]">
                    Products
                  </div>
                  {results.products.map((hit) => (
                    <Link
                      key={hit.id}
                      href={hit.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <span className="font-medium text-[var(--text-primary)] truncate">{hit.title}</span>
                      <span className="text-xs text-[var(--text-tertiary)] shrink-0 truncate max-w-[40%]">{hit.subtitle}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BUYER_NAV = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: ShoppingCart, label: "Orders", href: "/dashboard/orders" },
  { icon: ClipboardList, label: "My Quotes", href: "/quotes" },
  { icon: FileText, label: "RFQ & Quotations", href: "/dashboard/rfq" },
  { icon: Sparkles, label: "AI Supplier Match", href: "/dashboard/rfq/match" },
  { icon: Package, label: "Products", href: "/dashboard/products" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
  { icon: Heart, label: "Saved Items", href: "/dashboard/saved" },
  { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
  { icon: FileText, label: "Invoices", href: "/dashboard/invoices" },
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
  const [collapsed, setCollapsed] = useState(false);
  const navItems = companyType === "supplier" ? SUPPLIER_NAV : BUYER_NAV;
  const dashboardLabel =
    companyType === "supplier" ? "Supplier Portal" : "Buyer Dashboard";
  const unreadMessages = useUnreadMessagesCount();
  const messagesHref = companyType === "supplier" ? "/supplier/messages" : "/dashboard/messages";
  const isBuyer = companyType !== "supplier";
  const cartCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — visible by default at every screen size; collapses only when the user toggles it */}
      <aside
        className={`flex flex-col bg-[var(--obsidian)] h-screen sticky top-0 shrink-0 transition-[width] duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--amber)] to-[var(--amber-dark)] flex items-center justify-center shrink-0">
              <span
                className="font-black text-[var(--obsidian)] text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SR
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span
                  className="text-[15px] font-bold text-[var(--ivory)] tracking-tight leading-none block truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Silk Road Africa
                </span>
                <span className="block text-[10px] text-[var(--amber)] font-medium tracking-[0.12em] uppercase mt-0.5">
                  {dashboardLabel}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard" || item.href === "/supplier"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const isMessages = item.href === messagesHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-white/[0.08] text-[var(--ivory)]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {isMessages && unreadMessages > 0 && (
                  collapsed ? (
                    <span
                      className="absolute top-2 right-2 w-2 h-2 rounded-full"
                      style={{ background: "var(--terracotta)" }}
                    />
                  ) : (
                    <span
                      className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                      style={{ background: "var(--terracotta)", color: "white" }}
                    >
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-[18px] h-[18px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className={`flex items-center gap-3 px-4 py-3 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-[var(--terracotta)]/20 border border-[var(--terracotta)]/30 flex items-center justify-center text-xs font-bold text-[var(--terracotta-light)] shrink-0">
              {userInitials}
            </div>
            {!collapsed && (
              <>
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
              </>
            )}
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
              <HeaderSearch />

              <Link
                href={messagesHref}
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

              {isBuyer && (
                <button
                  type="button"
                  onClick={openCart}
                  className="relative p-2.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="Cart"
                >
                  <ShoppingCart className="w-[18px] h-[18px]" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                      style={{ background: "var(--terracotta)", color: "white" }}
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              )}

              <NotificationBell />

              <RegionPicker variant="full" />
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
