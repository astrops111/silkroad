"use client";

import { useState, useEffect, useMemo } from "react";
import { Inbox, Search, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface OtherParty {
  id: string;
  name: string;
  country_code?: string;
  logo_url?: string;
}

interface Conversation {
  id: string;
  context_title: string;
  last_message_text: string;
  last_message_at: string;
  unreadCount: number;
  myRole: string;
  otherParty: OtherParty;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

const CONTEXT_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  product_inquiry: {
    label: "Product Inquiry",
    color: "var(--indigo)",
    bg: "var(--indigo-glow)",
  },
  rfq: {
    label: "RFQ",
    color: "var(--amber-dark)",
    bg: "var(--amber-glow)",
  },
  order: {
    label: "Order",
    color: "var(--success)",
    bg: "rgba(42, 157, 110, 0.12)",
  },
};

/* ------------------------------------------------------------------ */
/*  Supplier Messages Page                                             */
/* ------------------------------------------------------------------ */
export default function SupplierMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  /* Fetch conversations */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        // Sort by most recent message
        const sorted = (data.conversations ?? []).sort(
          (a: Conversation, b: Conversation) =>
            new Date(b.last_message_at).getTime() -
            new Date(a.last_message_at).getTime()
        );
        setConversations(sorted);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* Get current user id */
  useEffect(() => {
    async function getUser() {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    getUser();
  }, []);

  /* Total unread */
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  /* Filtered conversations */
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherParty.name.toLowerCase().includes(q) ||
        c.context_title?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  /* Select conversation */
  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileShowChat(true);
  };

  /* Detect context type from title for badge styling */
  function getContextType(title: string): string | null {
    if (!title) return null;
    const lower = title.toLowerCase();
    if (lower.includes("rfq") || lower.includes("quotation")) return "rfq";
    if (lower.includes("order") || lower.includes("po")) return "order";
    return "product_inquiry";
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--amber)" }}
          />
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-tertiary)",
            }}
          >
            Loading inbox...
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main layout                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div
        className="flex flex-shrink-0 items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <Inbox className="h-5 w-5" style={{ color: "var(--amber)" }} />
        <h1
          className="text-xl font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          Inbox
        </h1>
        {totalUnread > 0 && (
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
            style={{
              fontFamily: "var(--font-body)",
              background: "var(--amber)",
              color: "var(--surface-primary)",
            }}
          >
            {totalUnread}
          </span>
        )}
      </div>

      {/* Body: split layout */}
      <div className="flex min-h-0 flex-1">
        {/* ---- Left: Conversation List ---- */}
        <div
          className={`flex w-full flex-col border-r md:w-1/3 lg:w-[340px] ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Search */}
          <div className="flex-shrink-0 px-4 py-3">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Search
                className="h-4 w-4 flex-shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search inbox..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--amber-glow)" }}
                >
                  <Inbox
                    className="h-6 w-6"
                    style={{ color: "var(--amber)" }}
                  />
                </div>
                <p
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-secondary)",
                  }}
                >
                  No messages yet
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Buyer inquiries will appear here.
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const active = conv.id === activeId;
                const ctxType = getContextType(conv.context_title);
                const badge = ctxType ? CONTEXT_BADGES[ctxType] : null;

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelect(conv.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150"
                    style={{
                      background: active
                        ? "var(--amber-glow)"
                        : "transparent",
                      borderLeft: active
                        ? "3px solid var(--amber)"
                        : "3px solid transparent",
                    }}
                  >
                    {/* Avatar */}
                    {conv.otherParty.logo_url ? (
                      <img
                        src={conv.otherParty.logo_url}
                        alt={conv.otherParty.name}
                        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                        style={{
                          border: "2px solid var(--border-subtle)",
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          fontFamily: "var(--font-body)",
                          background: "var(--surface-tertiary)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {getInitials(conv.otherParty.name)}
                      </div>
                    )}

                    {/* Text content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="truncate text-sm font-semibold"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {conv.otherParty.name}
                        </span>
                        <span
                          className="flex-shrink-0 text-[11px]"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {relativeTime(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Context badge + title */}
                      {conv.context_title && (
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {badge && (
                            <span
                              className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                fontFamily: "var(--font-body)",
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          )}
                          <span
                            className="truncate text-xs font-medium"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {conv.context_title}
                          </span>
                        </div>
                      )}

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className="min-w-0 truncate text-xs"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {truncate(conv.last_message_text, 55)}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span
                            className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                            style={{
                              background: "var(--amber)",
                              color: "var(--surface-primary)",
                            }}
                          >
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ---- Right: Chat Window ---- */}
        <div
          className={`flex min-h-0 flex-1 flex-col ${
            !mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Mobile back button */}
          {mobileShowChat && (
            <button
              onClick={() => setMobileShowChat(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium md:hidden"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--amber-dark)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to inbox
            </button>
          )}

          {activeId && currentUserId ? (
            <ChatWindow
              key={activeId}
              conversationId={activeId}
              currentUserId={currentUserId}
            />
          ) : (
            /* No conversation selected */
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "var(--amber-glow)" }}
              >
                <MessageSquare
                  className="h-9 w-9"
                  style={{ color: "var(--amber)" }}
                />
              </div>
              <div>
                <p
                  className="text-base font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                  }}
                >
                  Select a conversation
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Pick a buyer inquiry from your inbox to respond
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
