"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      // Supabase resend verification email
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = new URLSearchParams(window.location.search).get("email");

      if (email) {
        await supabase.auth.resend({
          type: "signup",
          email,
        });
        toast.success("Verification email resent!");
      } else {
        toast.error("No email address found. Please try registering again.");
      }
    } catch {
      toast.error("Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--surface-secondary)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "color-mix(in srgb, var(--amber) 12%, transparent)" }}
        >
          <Mail className="w-8 h-8" style={{ color: "var(--amber)" }} />
        </div>

        <h1
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Check Your Email
        </h1>

        <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
          We&apos;ve sent a verification link to your email address.
          Click the link to verify your account and start trading on SilkRoad Africa.
        </p>

        <div
          className="p-4 rounded-xl mb-6"
          style={{ background: "var(--surface-secondary)" }}
        >
          <div className="flex items-start gap-3 text-left">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                Didn&apos;t receive the email?
              </p>
              <ul className="text-[11px] mt-1 space-y-1" style={{ color: "var(--text-tertiary)" }}>
                <li>Check your spam/junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Resend Verification Email
          </button>

          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-semibold"
            style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
