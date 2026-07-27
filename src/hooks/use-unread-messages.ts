"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

interface ConversationSummary {
  unreadCount?: number;
}

/**
 * Total unread message count across all of the current user's conversations.
 * Recomputed on mount and whenever a visible conversation row changes
 * (new message bumps the unread counter; opening a thread resets it via RPC).
 */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) return;
        const data = await res.json();
        const total = ((data.conversations || []) as ConversationSummary[]).reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0
        );
        if (!cancelled) setCount(total);
      } catch {
        // Silently fail
      }
    };

    fetchCount();

    const supabase = createClient();
    const channel = supabase
      .channel("unread-messages-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
