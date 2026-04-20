"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  Clock,
  ShieldCheck,
  Lock,
  CalendarDays,
  Banknote,
} from "lucide-react";
import {
  calculatePaymentTerms,
  qualifiesForCreditTerms,
  type PaymentTermType,
  type PaymentTermsResult,
} from "@/lib/payments/payment-terms";
import { formatMoney } from "@/lib/payments/currency-config";

/* ---------- Types ---------- */
export interface PaymentTermsSelectorProps {
  totalAmount: number;
  currency: string;
  buyerVerified: boolean;
  totalOrders: number;
  totalSpend: number;
  onSelect: (terms: PaymentTermsResult) => void;
}

/* ---------- Card config ---------- */
interface TermCardConfig {
  type: PaymentTermType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  lockMessage?: string;
}

/* ---------- Component ---------- */
export default function PaymentTermsSelector({
  totalAmount,
  currency,
  buyerVerified,
  totalOrders,
  totalSpend,
  onSelect,
}: PaymentTermsSelectorProps) {
  const [selected, setSelected] = useState<PaymentTermType>("immediate");

  const availableTerms = useMemo(
    () => qualifiesForCreditTerms(buyerVerified, totalOrders, totalSpend),
    [buyerVerified, totalOrders, totalSpend]
  );

  const currentResult = useMemo(
    () => calculatePaymentTerms(totalAmount, currency, selected),
    [totalAmount, currency, selected]
  );

  const depositResult = useMemo(
    () => calculatePaymentTerms(totalAmount, currency, "deposit_balance"),
    [totalAmount, currency]
  );

  const net30Result = useMemo(
    () => calculatePaymentTerms(totalAmount, currency, "net_30"),
    [totalAmount, currency]
  );

  const net60Result = useMemo(
    () => calculatePaymentTerms(totalAmount, currency, "net_60"),
    [totalAmount, currency]
  );

  const isQualified = (type: PaymentTermType) => availableTerms.includes(type);

  const handleSelect = (type: PaymentTermType) => {
    if (!isQualified(type)) return;
    setSelected(type);
    const result = calculatePaymentTerms(totalAmount, currency, type);
    onSelect(result);
  };

  /* Card definitions */
  const cards: TermCardConfig[] = [
    {
      type: "immediate",
      icon: <CreditCard className="size-5" />,
      title: "Pay Now",
      subtitle: `Full payment of ${formatMoney(totalAmount, currency)}`,
    },
    {
      type: "deposit_balance",
      icon: <Banknote className="size-5" />,
      title: "30% Deposit",
      subtitle: `Pay ${formatMoney(depositResult.payNowAmount, currency)} now, ${formatMoney(depositResult.deposit?.balanceAmount ?? 0, currency)} before shipping`,
    },
    {
      type: "net_30",
      icon: <Clock className="size-5" />,
      title: "Net 30",
      subtitle: net30Result.invoiceDueDate
        ? `Due by ${new Date(net30Result.invoiceDueDate).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
        : "Pay within 30 days",
      lockMessage: !isQualified("net_30")
        ? "Requires verified account + 5 orders"
        : undefined,
    },
    {
      type: "net_60",
      icon: <CalendarDays className="size-5" />,
      title: "Net 60",
      subtitle: net60Result.invoiceDueDate
        ? `Due by ${new Date(net60Result.invoiceDueDate).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
        : "Pay within 60 days",
      lockMessage: !isQualified("net_60")
        ? "Requires verified account + 20 orders"
        : undefined,
    },
  ];

  /* Summary text */
  const summaryLine = (() => {
    if (selected === "deposit_balance" && currentResult.deposit) {
      return `Deposit: ${formatMoney(currentResult.payNowAmount, currency)} (balance: ${formatMoney(currentResult.deposit.balanceAmount, currency)} due before shipping)`;
    }
    if (selected === "net_30" || selected === "net_60") {
      return `${formatMoney(totalAmount, currency)} due by ${currentResult.invoiceDueDate ? new Date(currentResult.invoiceDueDate).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "invoice date"}`;
    }
    return `Pay now: ${formatMoney(totalAmount, currency)}`;
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5" style={{ color: "var(--amber)" }} />
        <h3
          className="text-base font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Payment Terms
        </h3>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const isActive = selected === card.type;
          const locked = !!card.lockMessage;

          return (
            <button
              key={card.type}
              type="button"
              disabled={locked}
              onClick={() => handleSelect(card.type)}
              className="group relative flex flex-col gap-2 rounded-xl border-2 px-4 py-4 text-left transition-all"
              style={{
                borderColor: isActive
                  ? "var(--amber)"
                  : locked
                    ? "var(--border-subtle)"
                    : "var(--border-default)",
                background: isActive
                  ? "var(--amber-glow)"
                  : locked
                    ? "var(--surface-secondary)"
                    : "var(--surface-primary)",
                opacity: locked ? 0.7 : 1,
                cursor: locked ? "not-allowed" : "pointer",
                boxShadow: isActive ? "var(--shadow-glow-amber)" : "none",
              }}
            >
              {/* Radio indicator */}
              <div className="flex items-start justify-between">
                <div
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{
                    background: isActive ? "var(--amber-glow)" : "var(--surface-tertiary)",
                    color: isActive ? "var(--amber-dark)" : "var(--text-tertiary)",
                  }}
                >
                  {locked ? <Lock className="size-4" /> : card.icon}
                </div>

                {/* Radio dot */}
                <div
                  className="flex size-5 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isActive ? "var(--amber)" : "var(--border-default)",
                    background: isActive ? "var(--amber)" : "transparent",
                  }}
                >
                  {isActive && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Text */}
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: locked ? "var(--text-tertiary)" : "var(--text-primary)",
                  }}
                >
                  {card.title}
                </p>
                <p
                  className="mt-0.5 text-xs leading-relaxed"
                  style={{
                    color: locked ? "var(--text-tertiary)" : "var(--text-secondary)",
                  }}
                >
                  {locked ? card.lockMessage : card.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div
        className="flex items-center gap-3 rounded-lg border px-4 py-3"
        style={{
          borderColor: "var(--amber)",
          background: "var(--amber-glow)",
        }}
      >
        <CreditCard className="size-4 shrink-0" style={{ color: "var(--amber-dark)" }} />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--amber-dark)" }}
        >
          {summaryLine}
        </p>
      </div>
    </div>
  );
}
