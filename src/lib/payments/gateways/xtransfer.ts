/**
 * XTransfer payout gateway
 *
 * XTransfer is a cross-border B2B remittance platform for paying CN/SEA/KR/JP suppliers.
 * This gateway handles OUTBOUND payouts only (platform → supplier).
 * It is NOT a buyer payment collection gateway.
 *
 * Required env vars:
 *   XTRANSFER_APP_ID         — your XTransfer Open API App ID
 *   XTRANSFER_APP_SECRET     — your XTransfer Open API App Secret
 *   XTRANSFER_WEBHOOK_SECRET — shared secret for webhook signature verification
 *   XTRANSFER_ENV            — "sandbox" | "production" (defaults to sandbox)
 *
 * XTransfer Open API docs: https://docs.xtransfer.cn/open-api
 */

import { createHmac, randomBytes } from "crypto";
import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  RefundResult,
  PaymentStatusResult,
  TransferResult,
} from "../types";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.XTRANSFER_ENV === "production"
    ? "https://api.xtransfer.cn/open/v1"
    : "https://sandbox-api.xtransfer.cn/open/v1";

// ── Request signing ───────────────────────────────────────────────────────────

function buildSignature(
  appId: string,
  appSecret: string,
  timestamp: string,
  nonce: string,
  body: string
): string {
  // XTransfer HMAC-SHA256: UPPER(hmac(appSecret, appId + timestamp + nonce + body))
  const payload = `${appId}${timestamp}${nonce}${body}`;
  return createHmac("sha256", appSecret).update(payload, "utf8").digest("hex").toUpperCase();
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.XTRANSFER_WEBHOOK_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex").toUpperCase();
  return expected === signature.toUpperCase();
}

// ── HTTP client ───────────────────────────────────────────────────────────────

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const appId = process.env.XTRANSFER_APP_ID;
  const appSecret = process.env.XTRANSFER_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("XTRANSFER_APP_ID / XTRANSFER_APP_SECRET env vars are not set");
  }

  const timestamp = Date.now().toString();
  const nonce = randomBytes(8).toString("hex");
  const bodyStr = body ? JSON.stringify(body) : "";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": appId,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Sign": buildSignature(appId, appSecret, timestamp, nonce, bodyStr),
    },
    body: bodyStr || undefined,
  });

  const json = (await res.json()) as { code: string; message?: string; data?: T };
  if (!res.ok || json.code !== "SUCCESS") {
    throw new Error(`XTransfer API error (${res.status}): ${json.message ?? json.code}`);
  }
  return json.data as T;
}

// ── Payee (beneficiary) management ───────────────────────────────────────────

export interface XTransferPayeeParams {
  /** Supplier's legal company name in English */
  companyName: string;
  /** ISO 3166-1 alpha-2 country code of the supplier's bank */
  bankCountry: string;
  /** Bank account number (or IBAN for EU accounts) */
  bankAccountNumber: string;
  /** Full bank name */
  bankName: string;
  /** SWIFT/BIC code */
  swiftCode?: string;
  /** US/CA routing number */
  routingNumber?: string;
  /** Payout currency (CNY, USD, EUR, HKD, SGD, JPY, KRW …) */
  currency: string;
  /** Platform-side stable identifier for this supplier (e.g. company UUID) */
  externalId: string;
}

export interface XTransferPayeeResult {
  payeeId: string;
  status: "active" | "pending_review" | "rejected";
}

/** Register a supplier as an XTransfer beneficiary and return their payee ID. */
export async function registerXTransferPayee(
  params: XTransferPayeeParams
): Promise<XTransferPayeeResult> {
  return request<XTransferPayeeResult>("POST", "/beneficiary/create", {
    beneficiaryName: params.companyName,
    bankCountry: params.bankCountry,
    bankAccountNumber: params.bankAccountNumber,
    bankName: params.bankName,
    swiftCode: params.swiftCode,
    routingNumber: params.routingNumber,
    currency: params.currency,
    externalId: params.externalId,
  });
}

// ── Status mapper ─────────────────────────────────────────────────────────────

function mapStatus(xtStatus: string): PaymentStatusResult["status"] {
  switch (xtStatus) {
    case "SUCCESS":   return "succeeded";
    case "FAILED":
    case "CANCELLED": return "failed";
    default:          return "processing";
  }
}

// TransferResult.status is narrower ("pending" | "succeeded" | "failed") — PROCESSING maps to "pending"
function mapTransferStatus(xtStatus: string): TransferResult["status"] {
  switch (xtStatus) {
    case "SUCCESS":   return "succeeded";
    case "FAILED":
    case "CANCELLED": return "failed";
    default:          return "pending";
  }
}

// ── Gateway implementation ────────────────────────────────────────────────────

export const xtransferGateway: PaymentGateway = {
  name: "xtransfer",
  supportedCurrencies: ["CNY", "USD", "EUR", "GBP", "HKD", "SGD", "JPY", "KRW"],

  // ── Collection (buyer → platform via XTransfer virtual account) ──────────
  //
  // XTransfer is also a B2B collection platform. The platform holds ONE
  // XTransfer business account with static virtual account details per currency.
  // Buyers wire funds to that account using a unique order reference as the
  // transfer memo/remark. XTransfer fires a collection webhook when funds land.
  //
  // Required env vars (configure from XTransfer merchant portal):
  //   XTRANSFER_COLLECTION_BANK_NAME   — e.g. "Airwallex / HSBC HK"
  //   XTRANSFER_COLLECTION_ACCOUNT_NO  — virtual account number
  //   XTRANSFER_COLLECTION_SWIFT       — SWIFT/BIC code
  //   XTRANSFER_COLLECTION_IBAN        — IBAN (optional, for EUR/GBP accounts)
  //   XTRANSFER_COLLECTION_ROUTING     — US routing number (optional)
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const bankName    = process.env.XTRANSFER_COLLECTION_BANK_NAME;
    const accountNo   = process.env.XTRANSFER_COLLECTION_ACCOUNT_NO;
    const swiftCode   = process.env.XTRANSFER_COLLECTION_SWIFT;
    const iban        = process.env.XTRANSFER_COLLECTION_IBAN ?? null;
    const routing     = process.env.XTRANSFER_COLLECTION_ROUTING ?? null;

    if (!bankName || !accountNo || !swiftCode) {
      throw new Error(
        "XTransfer collection account not configured. Set XTRANSFER_COLLECTION_BANK_NAME, " +
        "XTRANSFER_COLLECTION_ACCOUNT_NO, and XTRANSFER_COLLECTION_SWIFT in environment."
      );
    }

    // Unique reference the buyer MUST include in their wire transfer memo.
    // We derive it from the order ID so we can match it back in the webhook.
    const reference = `SILK-${params.orderId.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase()}`;

    // Collection window: 5 business days (120 hours)
    const expiresAt = new Date(Date.now() + 120 * 60 * 60 * 1000);

    return {
      success: true,
      transactionId: reference,
      gatewayTransactionId: reference,
      status: "pending",
      requiresAction: true,
      actionType: "bank_transfer_instructions",
      expiresAt,
      rawResponse: {
        reference,
        bankName,
        accountNo,
        swiftCode,
        iban,
        routingNumber: routing,
        amount: params.amount,
        currency: params.currency,
        expiresAt: expiresAt.toISOString(),
        memo: `You MUST include "${reference}" in your wire transfer memo / payment remarks`,
      },
    };
  },

  async refund(_transactionId: string, _amount: number, _currency: string): Promise<RefundResult> {
    throw new Error(
      "XTransfer collection refunds must be initiated via the XTransfer merchant portal"
    );
  },

  // ── Payout operations ──────────────────────────────────────────────────────

  /** Poll the status of an outbound XTransfer payout. */
  async checkStatus(transferId: string): Promise<PaymentStatusResult> {
    const data = await request<{
      transferId: string;
      status: string;
      amount: number;
      currency: string;
    }>("GET", `/transfer/query?transferId=${encodeURIComponent(transferId)}`);

    return {
      transactionId: data.transferId,
      status: mapStatus(data.status),
      amount: data.amount,
      currency: data.currency,
      rawResponse: data,
    };
  },

  /** Verify and parse an inbound XTransfer webhook callback. */
  async handleWebhook(payload: unknown, signature?: string): Promise<PaymentStatusResult> {
    const rawBody = typeof payload === "string" ? payload : JSON.stringify(payload);

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      throw new Error("XTransfer webhook signature verification failed");
    }

    const p = (
      typeof payload === "string" ? JSON.parse(payload) : payload
    ) as {
      transferId: string;
      referenceNo: string;
      status: string;
      amount?: number;
      currency?: string;
    };

    return {
      transactionId: p.transferId,
      status: mapStatus(p.status),
      amount: p.amount,
      currency: p.currency,
      rawResponse: p,
    };
  },

  /**
   * Initiate an outbound payout to a registered XTransfer beneficiary.
   *
   * @param params.recipientAccountId  XTransfer payee ID (supplier_profiles.xtransfer_payee_id)
   * @param params.reference           Settlement number used as idempotency key (referenceNo)
   * @param params.amount              Net payout amount in minor units (cents)
   * @param params.currency            Payout currency code (e.g. "CNY")
   */
  async transfer(params): Promise<TransferResult> {
    if (!params.recipientAccountId) {
      throw new Error(
        "XTransfer transfer requires recipientAccountId (supplier_profiles.xtransfer_payee_id)"
      );
    }

    const data = await request<{ transferId: string; status: string }>(
      "POST",
      "/transfer/create",
      {
        payeeId: params.recipientAccountId,
        amount: params.amount,
        currency: params.currency,
        referenceNo: params.reference,   // idempotency key — resubmitting same reference is a no-op
        purpose: "trade_payment",
        remark: `Platform settlement ${params.reference}`,
      }
    );

    return {
      success: true,
      transferId: data.transferId,
      amount: params.amount,
      currency: params.currency,
      status: mapTransferStatus(data.status),
    };
  },
};
