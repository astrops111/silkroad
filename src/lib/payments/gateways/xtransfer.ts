/**
 * XTransfer gateway — three directions:
 *
 * 1. WIRE COLLECTION (buyer → platform via SWIFT/local wire)
 *    createPayment() with no phoneNumber — returns static virtual account + order reference
 *    Required env vars: XTRANSFER_COLLECTION_BANK_NAME, XTRANSFER_COLLECTION_ACCOUNT_NO,
 *                       XTRANSFER_COLLECTION_SWIFT
 *
 * 2. REQUEST MONEY (buyer → platform via African mobile money / local network)
 *    createPayment() with phoneNumber + metadata.country — calls /request-money/create
 *    XTransfer pushes a payment request to the buyer's phone (MTN, Orange, NIBSS, Vodacom…)
 *    Supported countries: NG, CM, CI, BJ, TZ, ZA, SN, RW, UG, ZM, CD
 *    Required env vars: XTRANSFER_APP_ID, XTRANSFER_APP_SECRET
 *
 * 3. PAYOUT (platform → CN/SEA/KR/JP supplier settlement)
 *    transfer() — calls /transfer/create using supplier's registered payeeId
 *    Required env vars: XTRANSFER_APP_ID, XTRANSFER_APP_SECRET
 *
 * Common env vars:
 *   XTRANSFER_APP_ID         — XTransfer Open API App ID
 *   XTRANSFER_APP_SECRET     — XTransfer Open API App Secret
 *   XTRANSFER_WEBHOOK_SECRET — HMAC secret for verifying webhook callbacks
 *   XTRANSFER_ENV            — "sandbox" | "production" (defaults to sandbox)
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

// ── Request Money — supported African countries and local networks ─────────────

export interface XTransferRequestMoneyCountry {
  code: string;
  name: string;
  currency: string;
  networks: string;
  businessSupported: boolean;
}

export const XTRANSFER_REQUEST_MONEY_COUNTRIES: XTransferRequestMoneyCountry[] = [
  { code: "NG", name: "Nigeria",          currency: "NGN", networks: "NIBSS",              businessSupported: true  },
  { code: "CM", name: "Cameroon",          currency: "XAF", networks: "Orange, MTN",        businessSupported: true  },
  { code: "CI", name: "Côte d'Ivoire",     currency: "XOF", networks: "Orange, MTN, Moov",  businessSupported: true  },
  { code: "BJ", name: "Benin",             currency: "XOF", networks: "MTN, Moov",          businessSupported: true  },
  { code: "TZ", name: "Tanzania",          currency: "TZS", networks: "Vodacom",            businessSupported: true  },
  { code: "ZA", name: "South Africa",      currency: "ZAR", networks: "OZOW",              businessSupported: true  },
  { code: "SN", name: "Senegal",           currency: "XOF", networks: "Orange, Free Money", businessSupported: false },
  { code: "RW", name: "Rwanda",            currency: "RWF", networks: "Airtel, MTN",        businessSupported: false },
  { code: "UG", name: "Uganda",            currency: "UGX", networks: "MTN, Airtel",        businessSupported: false },
  { code: "ZM", name: "Zambia",            currency: "ZMW", networks: "MTN",               businessSupported: false },
  { code: "CD", name: "DR Congo",          currency: "CDF", networks: "Airtel, Voda",       businessSupported: false },
];

const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(
  XTRANSFER_REQUEST_MONEY_COUNTRIES.map((c) => [c.code, c.currency])
);

// ── Request Money status polling ──────────────────────────────────────────────

/** Poll the status of an XTransfer Request Money transaction (buyer mobile money payment). */
export async function checkRequestMoneyStatus(requestId: string): Promise<PaymentStatusResult> {
  const data = await request<{ requestId: string; status: string }>(
    "GET",
    `/request-money/query?requestId=${encodeURIComponent(requestId)}`
  );
  return {
    transactionId: data.requestId,
    status: mapStatus(data.status),
    rawResponse: data,
  };
}

// ── Gateway implementation ────────────────────────────────────────────────────

export const xtransferGateway: PaymentGateway = {
  name: "xtransfer",
  // Wire collection currencies + African Request Money currencies
  supportedCurrencies: [
    "CNY", "USD", "EUR", "GBP", "HKD", "SGD", "JPY", "KRW",
    "NGN", "XAF", "XOF", "TZS", "ZAR", "RWF", "UGX", "ZMW", "CDF",
  ],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // ── Request Money path: buyer pays via African mobile money / local network ──
    if (params.phoneNumber) {
      const country = params.metadata?.country;
      if (!country) throw new Error("metadata.country is required for XTransfer Request Money");

      const currency = COUNTRY_CURRENCY[country];
      if (!currency) {
        throw new Error(
          `XTransfer Request Money is not supported for country "${country}". ` +
          `Supported: ${XTRANSFER_REQUEST_MONEY_COUNTRIES.map((c) => c.code).join(", ")}`
        );
      }

      const reference = `SILK-${params.orderId.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase()}`;

      const data = await request<{ requestId: string; status: string }>(
        "POST",
        "/request-money/create",
        {
          payerPhone:  params.phoneNumber,
          country,
          amount:      params.amount,
          currency,
          referenceNo: reference,
          description: params.description ?? `Order ${params.orderId}`,
        }
      );

      return {
        success: true,
        transactionId: data.requestId,
        gatewayTransactionId: data.requestId,
        status: "pending",
        requiresAction: true,
        actionType: "ussd_push",   // buyer gets a push on their phone (MTN, Orange, NIBSS, etc.)
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10-minute window
        rawResponse: { requestId: data.requestId, reference, country, currency, type: "request_money" },
      };
    }

    // ── Wire collection path: SWIFT / local bank wire with static virtual account ──
    //
    // Platform holds ONE XTransfer business account. Buyers wire to it using
    // a unique order reference in the memo field.
    // Configure from XTransfer merchant portal → Account Details:
    //   XTRANSFER_COLLECTION_BANK_NAME   — e.g. "HSBC HK / Airwallex"
    //   XTRANSFER_COLLECTION_ACCOUNT_NO  — virtual account number
    //   XTRANSFER_COLLECTION_SWIFT       — SWIFT/BIC code
    //   XTRANSFER_COLLECTION_IBAN        — IBAN (optional, for EUR/GBP accounts)
    //   XTRANSFER_COLLECTION_ROUTING     — US routing number (optional)
    const bankName  = process.env.XTRANSFER_COLLECTION_BANK_NAME;
    const accountNo = process.env.XTRANSFER_COLLECTION_ACCOUNT_NO;
    const swiftCode = process.env.XTRANSFER_COLLECTION_SWIFT;
    const iban      = process.env.XTRANSFER_COLLECTION_IBAN ?? null;
    const routing   = process.env.XTRANSFER_COLLECTION_ROUTING ?? null;

    if (!bankName || !accountNo || !swiftCode) {
      throw new Error(
        "XTransfer collection account not configured. Set XTRANSFER_COLLECTION_BANK_NAME, " +
        "XTRANSFER_COLLECTION_ACCOUNT_NO, and XTRANSFER_COLLECTION_SWIFT in environment."
      );
    }

    const reference = `SILK-${params.orderId.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 120 * 60 * 60 * 1000); // 5 business days

    return {
      success: true,
      transactionId: reference,
      gatewayTransactionId: reference,
      status: "pending",
      requiresAction: true,
      actionType: "bank_transfer_instructions",
      expiresAt,
      rawResponse: {
        reference, bankName, accountNo, swiftCode, iban, routingNumber: routing,
        amount: params.amount, currency: params.currency,
        expiresAt: expiresAt.toISOString(),
        memo: `You MUST include "${reference}" in your wire transfer memo / payment remarks`,
        type: "wire",
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
      transferId?: string;   // payout event
      requestId?: string;    // request money event
      collectionId?: string; // wire collection event
      referenceNo?: string;
      status: string;
      amount?: number;
      currency?: string;
    };

    return {
      transactionId: p.requestId ?? p.transferId ?? p.collectionId ?? "",
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
