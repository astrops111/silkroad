"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, LayoutDashboard, LogOut, User, UserCog } from "lucide-react";

export type CurrentUser = {
  name: string;
  fullName: string | null;
  email: string | null;
  initials: string;
};

/** Reads the signed-in user once per mount. `null` user = signed out. */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setUser((data?.user as CurrentUser | null) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}

/**
 * Signed-in account control for the navbar: "Hi {name}" with a dropdown to
 * the dashboard, account settings and sign out. Sign out is a plain anchor
 * so the server route at /auth/logout clears the session cookie.
 */
export function UserMenu({
  user,
  variant = "desktop",
}: {
  user: CurrentUser;
  variant?: "desktop" | "compact";
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const greeting = t("greeting", { name: user.name });

  const items = [
    { href: "/dashboard", label: tc("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/settings", label: t("accountHeading"), icon: UserCog },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={greeting}
        className={
          variant === "compact"
            ? "flex items-center gap-1 p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
            : "flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        }
      >
        {variant === "compact" ? (
          <>
            <span className="w-6 h-6 rounded-full bg-[var(--obsidian)] text-[var(--ivory)] text-[10px] font-bold flex items-center justify-center">
              {user.initials}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        ) : (
          <>
            <User className="w-5 h-5" />
            <span className="flex items-center gap-0.5 text-[10px] mt-0.5 max-w-[92px]">
              <span className="truncate">{greeting}</span>
              <ChevronDown
                className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[var(--border-subtle)] py-2 animate-scale-in z-50"
        >
          <div className="px-4 pb-2 mb-1 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {user.fullName || user.name}
            </p>
            {user.email && (
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
            )}
          </div>

          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <item.icon className="w-4 h-4 text-[var(--text-tertiary)]" />
              {item.label}
            </Link>
          ))}

          <a
            href="/auth/logout"
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2 mt-1 border-t border-[var(--border-subtle)] pt-2.5 text-sm text-[var(--terracotta)] hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {tc("signOut")}
          </a>
        </div>
      )}
    </div>
  );
}
