"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

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
        // unreadOnly returns just the summed counter — no conversation
        // list/embeds, and not capped by the list endpoint's pagination.
        const res = await fetch("/api/messages?unreadOnly=1");
        if (!res.ok) return;
        const data = (await res.json()) as { totalUnread?: number };
        if (!cancelled) setCount(data.totalUnread ?? 0);
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
