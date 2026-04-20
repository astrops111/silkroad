"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  ShoppingCart,
  MessageSquare,
  CheckCircle2,
  Package,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface Notification {
  id: string;
  type: "order" | "message" | "rfq" | "delivery" | "dispute" | "system";
  title: string;
  description: string;
  href: string;
  read: boolean;
  createdAt: string;
}

const ICON_MAP = {
  order: ShoppingCart,
  message: MessageSquare,
  rfq: FileText,
  delivery: Package,
  dispute: AlertTriangle,
  system: CheckCircle2,
};

const COLOR_MAP = {
  order: "var(--amber)",
  message: "var(--indigo)",
  rfq: "var(--terracotta)",
  delivery: "var(--success)",
  dispute: "var(--danger)",
  system: "var(--info)",
};

// Demo notifications — will be replaced with real data from /api/notifications
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "order",
    title: "Order confirmed",
    description: "PO-2026-1247 has been confirmed by HuaNan Machinery",
    href: "/dashboard/orders",
    read: false,
    createdAt: "2026-04-17T10:00:00Z",
  },
  {
    id: "2",
    type: "message",
    title: "New message",
    description: "David Chen from HuaNan sent you a message",
    href: "/dashboard/messages",
    read: false,
    createdAt: "2026-04-17T09:30:00Z",
  },
  {
    id: "3",
    type: "rfq",
    title: "New quote received",
    description: "3 new quotes on your RFQ for water filtration systems",
    href: "/dashboard/rfq",
    read: true,
    createdAt: "2026-04-16T16:00:00Z",
  },
  {
    id: "4",
    type: "delivery",
    title: "Shipment update",
    description: "Your shipment SHP-M1234ABC has arrived at Tema Port",
    href: "/dashboard/orders",
    read: true,
    createdAt: "2026-04-16T08:00:00Z",
  },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

interface NotificationDropdownProps {
  variant?: "dark" | "light";
}

export function NotificationDropdown({ variant = "light" }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications] = useState(DEMO_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isDark = variant === "dark";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2.5 rounded-lg transition-colors ${
          isDark
            ? "text-white/50 hover:text-white hover:bg-white/[0.06]"
            : "text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]"
        }`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--terracotta)]" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--obsidian)]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--amber-dark)] bg-[var(--amber-glow)] px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICON_MAP[notif.type];
                const color = COLOR_MAP[notif.type];
                return (
                  <Link
                    key={notif.id}
                    href={notif.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors ${
                      !notif.read ? "bg-[var(--amber-glow)]/30" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--obsidian)] truncate">
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
                        {notif.description}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[var(--border-subtle)]">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
