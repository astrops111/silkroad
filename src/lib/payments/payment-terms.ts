/**
 * Payment terms logic for B2B orders
 *
 * Supports:
 * - immediate: full payment now
 * - deposit_balance: pay X% now, rest before shipping
 * - net_30: pay within 30 days of invoice date
 * - net_60: pay within 60 days of invoice date
 */

export type PaymentTermType = "immediate" | "deposit_balance" | "net_30" | "net_60";

export interface DepositConfig {
  depositPercent: number;  // e.g., 30 = 30%
  depositAmount: number;   // calculated from total
  balanceAmount: number;   // total - deposit
  balanceDueEvent: "before_shipping" | "on_delivery" | "net_days";
  balanceDueDays?: number; // for net_days
}

export interface PaymentTermsResult {
  type: PaymentTermType;
  totalAmount: number;
  currency: string;
  // For immediate
  payNowAmount: number;
  // For deposit_balance
  deposit?: DepositConfig;
  // For net terms
  invoiceDueDate?: string;  // ISO date
  paymentDueDays?: number;
  // Display
  description: string;
  shortLabel: string;
}

const DEFAULT_DEPOSIT_PERCENT = 30;

/**
 * Calculate payment amounts based on selected terms
 */
export function calculatePaymentTerms(
  totalAmount: number,
  currency: string,
  terms: PaymentTermType,
  options?: {
    depositPercent?: number;
    invoiceDate?: string;
  }
): PaymentTermsResult {
  const depositPct = options?.depositPercent || DEFAULT_DEPOSIT_PERCENT;
  const invoiceDate = options?.invoiceDate || new Date().toISOString().slice(0, 10);

  switch (terms) {
    case "immediate":
      return {
        type: "immediate",
        totalAmount,
        currency,
        payNowAmount: totalAmount,
        description: "Full payment required now",
        shortLabel: "Pay Now",
      };

    case "deposit_balance": {
      const depositAmount = Math.round(totalAmount * (depositPct / 100));
      const balanceAmount = totalAmount - depositAmount;

      return {
        type: "deposit_balance",
        totalAmount,
        currency,
        payNowAmount: depositAmount,
        deposit: {
          depositPercent: depositPct,
          depositAmount,
          balanceAmount,
          balanceDueEvent: "before_shipping",
        },
        description: `Pay ${depositPct}% deposit now (balance due before shipping)`,
        shortLabel: `${depositPct}% Deposit`,
      };
    }

    case "net_30": {
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      return {
        type: "net_30",
        totalAmount,
        currency,
        payNowAmount: 0,
        invoiceDueDate: dueDate.toISOString().slice(0, 10),
        paymentDueDays: 30,
        description: `Payment due within 30 days (by ${dueDate.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })})`,
        shortLabel: "Net 30",
      };
    }

    case "net_60": {
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 60);

      return {
        type: "net_60",
        totalAmount,
        currency,
        payNowAmount: 0,
        invoiceDueDate: dueDate.toISOString().slice(0, 10),
        paymentDueDays: 60,
        description: `Payment due within 60 days (by ${dueDate.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })})`,
        shortLabel: "Net 60",
      };
    }

    default:
      return {
        type: "immediate",
        totalAmount,
        currency,
        payNowAmount: totalAmount,
        description: "Full payment required now",
        shortLabel: "Pay Now",
      };
  }
}

/**
 * Check if a buyer qualifies for credit terms (net-30/60)
 * In production, this would check credit history, verification status, etc.
 */
export function qualifiesForCreditTerms(
  buyerVerified: boolean,
  totalOrders: number,
  totalSpend: number
): PaymentTermType[] {
  const available: PaymentTermType[] = ["immediate", "deposit_balance"];

  // Net-30: verified buyer with 5+ orders and $5K+ spend
  if (buyerVerified && totalOrders >= 5 && totalSpend >= 500000) {
    available.push("net_30");
  }

  // Net-60: verified buyer with 20+ orders and $25K+ spend
  if (buyerVerified && totalOrders >= 20 && totalSpend >= 2500000) {
    available.push("net_60");
  }

  return available;
}
