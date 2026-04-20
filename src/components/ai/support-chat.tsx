"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  X,
  Sparkles,
  AlertTriangle,
  Headphones,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  suggestedActions?: { label: string; action: string }[];
  shouldHandoff?: boolean;
  handoffReason?: string;
}

interface SupportChatProps {
  userId: string;
  companyName: string;
  userRole: "buyer" | "supplier";
  userLanguage?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SupportChat({
  userId,
  companyName,
  userRole,
  userLanguage = "en",
}: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [disabled, setDisabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            userLanguage === "fr"
              ? "Bonjour ! Je suis l'assistant Silk Road. Comment puis-je vous aider aujourd'hui ?"
              : userLanguage === "sw"
                ? "Habari! Mimi ni msaidizi wa Silk Road. Nawezaje kukusaidia leo?"
                : "Hello! I'm the Silk Road support assistant. How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, userLanguage]);

  const sendMessage = async () => {
    if (!input.trim() || loading || disabled) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            userId,
            companyName,
            userLanguage,
            role: userRole,
          },
          orderNumber: orderRef || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Sorry, I'm unable to help right now. Please try again later.",
            timestamp: new Date(),
          },
        ]);

        if (res.status === 403) {
          setDisabled(true);
        }
        return;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        intent: data.intent,
        suggestedActions: data.suggestedActions,
        shouldHandoff: data.shouldHandoff,
        handoffReason: data.handoffReason,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-105"
        style={{ background: "var(--obsidian)", color: "var(--amber)" }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 w-[380px] h-[560px] rounded-2xl shadow-xl flex flex-col overflow-hidden z-50"
      style={{
        background: "var(--surface-primary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--obsidian)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(212,168,83,0.2)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--amber)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--ivory)" }}>
              Silk Road Support
            </p>
            <p className="text-[10px]" style={{ color: "rgba(245,240,232,0.5)" }}>
              AI-powered • Multilingual
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "rgba(245,240,232,0.5)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Order Reference (optional) */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <input
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value)}
          placeholder="Order # (optional — e.g. SR-20260408-003)"
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background:
                  msg.role === "assistant"
                    ? "color-mix(in srgb, var(--indigo) 12%, transparent)"
                    : "color-mix(in srgb, var(--amber) 12%, transparent)",
              }}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-3.5 h-3.5" style={{ color: "var(--indigo)" }} />
              ) : (
                <User className="w-3.5 h-3.5" style={{ color: "var(--amber-dark)" }} />
              )}
            </div>

            <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : ""}`}>
              <div
                className="px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed"
                style={{
                  background:
                    msg.role === "user" ? "var(--obsidian)" : "var(--surface-secondary)",
                  color: msg.role === "user" ? "var(--ivory)" : "var(--text-primary)",
                  borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                  borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                }}
              >
                {msg.content}
              </div>

              {/* Handoff notice */}
              {msg.shouldHandoff && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                  style={{
                    background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                    color: "var(--warning)",
                  }}
                >
                  <Headphones className="w-3 h-3" />
                  Transferring to human support...
                </div>
              )}

              {/* Suggested actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(action.label);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                      style={{
                        background: "var(--surface-primary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--indigo) 12%, transparent)" }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: "var(--indigo)" }} />
            </div>
            <div
              className="px-3.5 py-2.5 rounded-xl"
              style={{ background: "var(--surface-secondary)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {disabled ? (
          <div
            className="flex items-center gap-2 text-xs flex-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            AI support is currently disabled.
          </div>
        ) : (
          <>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: input.trim() ? "var(--obsidian)" : "transparent",
                color: input.trim() ? "var(--ivory)" : "var(--text-tertiary)",
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
