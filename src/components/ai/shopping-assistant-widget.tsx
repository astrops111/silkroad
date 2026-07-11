"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Bot } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What K-beauty products can I source?",
  "How do RFQs and quotes work?",
  "What does landed cost include?",
];

/**
 * Floating public shopping assistant. Conversation lives only in
 * component state — nothing is persisted, and the backend has no
 * access to accounts or orders by design.
 */
export function ShoppingAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12),
          locale: typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en",
        }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setAvailable(false);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.ok ? data.reply : (data.error ?? "Sorry, something went wrong."),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network hiccup — please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          style={{ background: "var(--amber)", color: "var(--obsidian)" }}
          aria-label="Open shopping assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-5rem)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] flex flex-col overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: "var(--obsidian)" }}
          >
            <Bot className="w-5 h-5" style={{ color: "var(--amber)" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Shopping Assistant</p>
              <p className="text-[10px] text-white/50">
                Products & site help only — can’t see accounts or orders
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-white/60 hover:text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="space-y-2 pt-4">
                <p className="text-xs text-[var(--text-tertiary)] text-center">
                  Ask about products, sourcing, or how the marketplace works
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--amber)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--amber)]/15 text-[var(--text-primary)]"
                    : "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="bg-[var(--surface-secondary)] rounded-xl px-3 py-2 text-sm text-[var(--text-tertiary)] w-16">
                <span className="animate-pulse">…</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send(input)}
              placeholder="Ask anything about products…"
              className="flex-1 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 text-[var(--text-primary)]"
            />
            <button
              onClick={() => void send(input)}
              disabled={busy || !input.trim()}
              className="px-3 rounded-lg disabled:opacity-40"
              style={{ background: "var(--amber)", color: "var(--obsidian)" }}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
