"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Scale,
  Shield,
  Bell,
  Search,
  LogOut,
  Settings,
  Crown,
  ArrowLeft,
  Activity,
  ShieldCheck,
  Gavel,
  Route,
  ImagePlus,
  TrendingUp,
  MessageSquare,
  FolderTree,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Platform",
    items: [
      { name: "Categories", href: "/superadmin/categories", icon: FolderTree },
    ],
  },
  {
    label: "AI Features",
    items: [
      { name: "Feature Toggles", href: "/superadmin/ai-features", icon: Sparkles },
    ],
  },
  {
    label: "Trust & Safety AI",
    items: [
      { name: "Dispute Analysis", href: "/superadmin/disputes/ai-analysis", icon: Scale },
      { name: "Compliance Scanner", href: "/superadmin/compliance", icon: Shield },
    ],
  },
];

interface SuperAdminShellProps {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
}

export function SuperAdminShell({ children, userName, userInitials }: SuperAdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col shrink-0"
        style={{ background: "linear-gradient(180deg, #14110F 0%, #1F1A15 100%)" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/[0.06]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
            style={{
              background: "linear-gradient(135deg, var(--amber) 0%, var(--terracotta-light) 100%)",
              color: "var(--obsidian)",
              fontFamily: "var(--font-display)",
            }}
          >
            SR
          </div>
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--ivory)", fontFamily: "var(--font-display)" }}
          >
            Silk Road
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(216,159,46,0.2), rgba(184,60,48,0.2))",
              color: "var(--amber)",
            }}
          >
            <Crown className="w-3 h-3" />
            Super
          </span>
        </div>

        {/* Back to Admin */}
        <div className="px-3 pt-4 pb-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin Panel
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/superadmin/dashboard" &&
                      pathname.startsWith(item.href));
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
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                            style={{
                              background: "linear-gradient(180deg, var(--amber), var(--terracotta-light))",
                            }}
                          />
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

        {/* User */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(216,159,46,0.2), rgba(184,60,48,0.2))",
                color: "var(--amber)",
              }}
            >
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--ivory)" }}>
                {userName}
              </p>
              <p className="text-[11px] text-white/30 truncate flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Super Admin
              </p>
            </div>
            <a
              href="/auth/logout"
              className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              style={{ color: "rgba(245,240,232,0.35)" }}
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-64" style={{ background: "var(--surface-secondary)" }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-8"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg w-80"
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Search AI features, disputes, compliance..."
              className="bg-transparent border-none outline-none text-sm w-full"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(216,159,46,0.1), rgba(184,60,48,0.1))",
                color: "var(--amber-dark)",
              }}
            >
              <Crown className="w-3 h-3" />
              Super Admin Panel
            </div>
            <button
              className="relative p-2.5 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              className="p-2.5 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
