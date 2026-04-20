"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  Bell,
  ShoppingCart,
  FileText,
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  MessageSquare,
  CreditCard,
  Shield,
  Loader2,
  Check,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, typeof Bell> = {
  "shopping-cart": ShoppingCart,
  "file-text": FileText,
  truck: Truck,
  package: Package,
  "check-circle-2": CheckCircle2,
  "x-circle": XCircle,
  "message-square": MessageSquare,
  "credit-card": CreditCard,
  shield: Shield,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=15");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to Realtime for new notifications
  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 14)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.is_read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate
    if (notif.action_url) {
      router.push(notif.action_url);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="relative p-2.5 rounded-lg transition-colors"
        style={{ color: "var(--text-tertiary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
            style={{ background: "var(--terracotta)", color: "white" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 max-h-[480px] rounded-2xl shadow-xl overflow-hidden z-50"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <h3
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                  style={{ background: "var(--terracotta)", color: "white" }}
                >
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: "var(--amber-dark)" }}
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--amber)" }} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const IconComp = ICON_MAP[notif.icon || ""] || Bell;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors"
                    style={{
                      background: notif.is_read ? "transparent" : "color-mix(in srgb, var(--amber) 4%, transparent)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = notif.is_read ? "transparent" : "color-mix(in srgb, var(--amber) 4%, transparent)")}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)" }}
                    >
                      <IconComp className="w-4 h-4" style={{ color: "var(--amber-dark)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm truncate"
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: notif.is_read ? 400 : 600,
                          }}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      {notif.body && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
                          {notif.body}
                        </p>
                      )}
                    </div>
                    {!notif.is_read && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                        style={{ background: "var(--amber)" }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
