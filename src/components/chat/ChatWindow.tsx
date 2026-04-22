"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Send, Loader2, MessageSquare, Paperclip } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Message {
  id: string;
  content: string;
  message_type: string;
  sender_name: string;
  sender_role: string;
  sender_user_id: string;
  created_at: string;
  message_attachments?: { name: string; url: string }[];
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
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

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ChatWindow({
  conversationId,
  currentUserId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Scroll to bottom */
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  /* Fetch messages */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(
          `/api/messages?conversationId=${conversationId}`
        );
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        if (!cancelled) {
          setMessages(data.messages ?? []);
          setLoading(false);
          setTimeout(scrollToBottom, 50);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, scrollToBottom]);

  /* Realtime subscription */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, scrollToBottom]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  /* Send message */
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setInputValue("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: text,
          messageType: "text",
        }),
      });

      if (!res.ok) throw new Error("Send failed");
      const data = await res.json();

      // Append optimistically if realtime hasn't delivered it yet
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch {
      // Restore input on failure
      setInputValue(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  /* Loading */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--amber)" }}
          />
          <p
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-tertiary)",
            }}
          >
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ------- Message list ------- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--amber-glow)" }}
            >
              <MessageSquare
                className="h-7 w-7"
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
                No messages yet
              </p>
              <p
                className="mt-1 text-sm"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-tertiary)",
                }}
              >
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => {
              const isMe = msg.sender_user_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      fontFamily: "var(--font-body)",
                      background: isMe
                        ? "var(--amber)"
                        : "var(--surface-tertiary)",
                      color: isMe
                        ? "var(--surface-primary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {getInitials(msg.sender_name || "?")}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] ${
                      isMe ? "items-end" : "items-start"
                    } flex flex-col`}
                  >
                    {/* Sender name */}
                    {!isMe && (
                      <span
                        className="mb-1 px-1 text-xs font-medium"
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {msg.sender_name}
                      </span>
                    )}

                    <div
                      className="rounded-2xl px-4 py-2.5"
                      style={{
                        fontFamily: "var(--font-body)",
                        background: isMe
                          ? "rgba(216, 159, 46, 0.10)"
                          : "var(--surface-secondary)",
                        borderBottomRightRadius: isMe ? "6px" : undefined,
                        borderBottomLeftRadius: !isMe ? "6px" : undefined,
                        border: isMe
                          ? "1px solid rgba(216, 159, 46, 0.20)"
                          : "1px solid var(--border-subtle)",
                      }}
                    >
                      <p
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {msg.content}
                      </p>

                      {/* Attachments */}
                      {msg.message_attachments &&
                        msg.message_attachments.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            {msg.message_attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium underline"
                                style={{ color: "var(--amber-dark)" }}
                              >
                                <Paperclip className="h-3 w-3" />
                                {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <span
                      className={`mt-1 px-1 text-[11px] ${
                        isMe ? "text-right" : "text-left"
                      }`}
                      style={{
                        fontFamily: "var(--font-body)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {relativeTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------- Input bar ------- */}
      <div
        className="flex-shrink-0 px-4 py-3 sm:px-6"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-primary)",
        }}
      >
        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "var(--surface-tertiary)",
                  color: "var(--text-secondary)",
                }}
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="ml-1 hover:opacity-70"
                  style={{ color: "var(--danger)" }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setAttachments((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:bg-[var(--surface-tertiary)]"
            style={{ color: "var(--text-tertiary)" }}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachments.length === 0) || sending}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-150"
            style={{
              background:
                (inputValue.trim() || attachments.length > 0) && !sending
                  ? "var(--amber)"
                  : "var(--surface-tertiary)",
              color:
                (inputValue.trim() || attachments.length > 0) && !sending
                  ? "var(--surface-primary)"
                  : "var(--text-tertiary)",
              cursor:
                (inputValue.trim() || attachments.length > 0) && !sending ? "pointer" : "not-allowed",
            }}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
