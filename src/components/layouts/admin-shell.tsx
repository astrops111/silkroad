"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  Route,
  Landmark,
  Gavel,
  FolderTree,
  Bell,
  Search,
  LogOut,
  Settings,
  ShieldCheck,
  Crown,
  ScrollText,
  Inbox,
  UserPlus,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Trade",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { name: "Suppliers", href: "/admin/suppliers", icon: Users },
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Categories", href: "/admin/categories", icon: FolderTree },
    ],
  },
  {
    label: "Inbox",
    items: [
      { name: "Supplier applications", href: "/admin/supplier-applications", icon: Inbox },
    ],
  },
  {
    label: "Accounts",
    items: [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Create user", href: "/admin/users/create", icon: UserPlus },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      { name: "Disputes", href: "/admin/disputes", icon: Gavel },
      { name: "Verification", href: "/admin/suppliers?tab=verification", icon: ShieldCheck },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Settlements", href: "/admin/settlements", icon: Landmark },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Logistics", href: "/admin/logistics", icon: Truck },
      { name: "Route Optimizer", href: "/admin/logistics/optimize", icon: Route },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
    ],
  },
];

interface AdminShellProps {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
  role: string;
}

export function AdminShell({ children, userName, userInitials, role }: AdminShellProps) {
  const pathname = usePathname();

  const roleLabel = role === "admin_super" ? "Super Admin" : role === "admin_moderator" ? "Moderator" : "Support";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col shrink-0"
        style={{ background: "var(--obsidian)" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/[0.06]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
            style={{ background: "var(--amber)", color: "var(--obsidian)", fontFamily: "var(--font-display)" }}
          >
            SR
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--ivory)", fontFamily: "var(--font-display)" }}>
            Silk Road Africa
          </span>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(216,159,46,0.15)", color: "var(--amber)" }}>
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href.split("?")[0]));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                        style={{
                          color: isActive ? "var(--amber)" : "rgba(245,240,232,0.5)",
                          background: isActive ? "rgba(216,159,46,0.08)" : "transparent",
                        }}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "var(--amber)" }} />
                        )}
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Super Admin Panel — visible only to admin_super */}
        {role === "admin_super" && (
          <div className="px-3 pb-2">
            <Link
              href="/admin/system"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(216,159,46,0.08), rgba(184,60,48,0.08))",
                color: "var(--amber)",
                border: "1px solid rgba(216,159,46,0.12)",
              }}
            >
              <Crown className="w-[18px] h-[18px] shrink-0" />
              Super Admin Panel
            </Link>
          </div>
        )}

        {/* User */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(216,159,46,0.15)", color: "var(--amber)" }}>
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--ivory)" }}>
                {userName}
              </p>
              <p className="text-[11px] text-white/30 truncate">{roleLabel}</p>
            </div>
            <a href="/auth/logout" className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" style={{ color: "rgba(245,240,232,0.35)" }}>
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-64" style={{ background: "var(--surface-secondary)" }}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-8" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg w-80" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Search orders, suppliers, products..."
              className="bg-transparent border-none outline-none text-sm w-full"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
            </button>
            <button className="p-2.5 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}>
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
