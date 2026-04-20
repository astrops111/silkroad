"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2, Send } from "lucide-react";

interface ContactSupplierButtonProps {
  supplierCompanyId: string;
  supplierName: string;
  contextType: "product_inquiry" | "rfq" | "order" | "general";
  contextId?: string;
  contextTitle?: string;
  variant?: "button" | "inline";
  className?: string;
}

export function ContactSupplierButton({
  supplierCompanyId,
  supplierName,
  contextType,
  contextId,
  contextTitle,
  variant = "button",
  className = "",
}: ContactSupplierButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierCompanyId,
          content: message,
          contextType,
          contextId,
          contextTitle: contextTitle || `Inquiry to ${supplierName}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/messages?conversation=${data.conversationId}`);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (variant === "inline") {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${className}`}
        style={{ color: "var(--amber-dark)" }}
      >
        <MessageSquare className="w-4 h-4" />
        Contact Supplier
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`btn-outline !py-3 !px-6 ${className}`}
      >
        <MessageSquare className="w-4 h-4" />
        Contact Supplier
      </button>

      {/* Message modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-2xl p-6"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
          >
            <h3
              className="text-lg font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Message {supplierName}
            </h3>
            {contextTitle && (
              <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
                Re: {contextTitle}
              </p>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message... (e.g., pricing inquiry, MOQ question, sample request)"
              rows={5}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 transition-all"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
              autoFocus
            />

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="btn-primary !py-2.5 !px-6 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
