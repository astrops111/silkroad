import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCallerTierStatus } from "@/lib/auth/tier";

interface PaidGateProps {
  action: "send_quote" | "request_quote";
  children: React.ReactNode;
  upgradeHref?: string;
}

/**
 * Server-rendered gate. Renders children only if the caller belongs to a
 * paid-tier company. Otherwise renders a compact paywall CTA. RLS enforces
 * the same constraint on the server — this component is UX, not security.
 */
export async function PaidGate({
  action,
  children,
  upgradeHref = "/resources/upgrade",
}: PaidGateProps) {
  const t = await getTranslations("resources.paywall");
  const tier = await getCallerTierStatus();

  if (tier.isPaid) return <>{children}</>;

  const title = action === "send_quote" ? t("sendQuoteTitle") : t("requestQuoteTitle");
  const body =
    action === "send_quote" ? t("sendQuoteBody") : t("requestQuoteBody");

  return (
    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--amber)]/20 flex items-center justify-center text-[var(--amber)] font-semibold">
          ★
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">{body}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={upgradeHref}
              className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--amber)] text-black text-sm font-medium hover:opacity-90"
            >
              {t("cta")}
            </Link>
            {!tier.authenticated && (
              <Link
                href="/auth/login?redirect=/resources"
                className="inline-flex items-center px-4 py-2 rounded-md border border-white/20 text-sm hover:bg-white/5"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
