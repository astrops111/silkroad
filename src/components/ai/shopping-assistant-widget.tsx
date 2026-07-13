"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageCircle, Send, X, Bot } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Ops/auth surfaces where the buyer chatbot makes no sense.
const HIDDEN_PREFIXES = ["/admin", "/superadmin", "/supplier", "/auth", "/ops"];

// Conversation survives navigation (component stays mounted in the root
// layout) AND full reloads within the tab via sessionStorage.
const STORAGE_KEY = "sr-shopping-assistant";

function loadPersisted(): { messages: ChatMessage[]; open: boolean; sessionId: string | null } {
  if (typeof window === "undefined") return { messages: [], open: false, sessionId: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], open: false, sessionId: null };
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-24) : [],
      open: Boolean(parsed.open),
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : null,
    };
  } catch {
    return { messages: [], open: false, sessionId: null };
  }
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const hydrated = useRef(false);
  const sessionIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore after mount (not in the state initializer — the server renders
  // closed/empty, so reading sessionStorage there would mismatch hydration).
  useEffect(() => {
    const p = loadPersisted();
    if (p.messages.length > 0) setMessages(p.messages);
    if (p.open) setOpen(true);
    sessionIdRef.current = p.sessionId ?? crypto.randomUUID();
    hydrated.current = true;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!hydrated.current) return; // don't clobber storage before restore
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages.slice(-24), open, sessionId: sessionIdRef.current })
      );
    } catch {
      // storage full/blocked — persistence is best-effort
    }
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
          sessionId: sessionIdRef.current || undefined,
          page: pathname ?? undefined,
        }),
      });
      if (res.status === 403) {
        setAvailable(false);
        return;
      }
      // Pre-stream failures (rate limit, validation) come back as plain JSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error ?? "Sorry, something went wrong." },
        ]);
        return;
      }

      // Stream ndjson: grow the last assistant bubble as {delta} lines arrive.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const setLast = (content: string) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content };
          return next;
        });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: { delta?: string; reply?: string; error?: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.delta) {
            acc += evt.delta;
            setLast(acc);
          } else if (evt.error) {
            acc = evt.error;
            setLast(acc);
          } else if (evt.reply && !acc) {
            // done-event fallback when no deltas were emitted
            acc = evt.reply;
            setLast(acc);
          }
        }
      }
      if (!acc) setLast("Sorry, I could not produce an answer.");
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
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

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
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ml-auto bg-[var(--amber)]/15 text-[var(--text-primary)]"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  className="max-w-[92%] rounded-xl px-3 py-2 text-sm bg-[var(--surface-secondary)] text-[var(--text-primary)] [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="underline font-medium"
                          style={{ color: "var(--amber-dark)" }}
                          target={href?.startsWith("/") ? undefined : "_blank"}
                          rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-1.5">
                          <table className="text-xs border-collapse [&_th]:text-left [&_th]:font-semibold [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-[var(--border-subtle)]">
                            {children}
                          </table>
                        </div>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              )
            )}
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
