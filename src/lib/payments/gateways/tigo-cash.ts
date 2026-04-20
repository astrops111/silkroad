import { randomBytes } from "crypto";
import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

/**
 * Tigo Cash / Tigo Pesa (MiliCom) Gateway
 * Covers: Tanzania (TZS), Ghana (GHS), Rwanda (RWF), Senegal (XOF)
 *
 * Uses the MFS Africa / MiliCom partner API
 * Docs vary by country — this implements the common REST pattern
 */

const SANDBOX_URL = "https://sandbox.tigo.com/v1";
const PRODUCTION_URL = "https://secure.tigo.com/v1";

function getBaseUrl(): string {
  return process.env.TIGO_ENVIRONMENT === "production"
    ? PRODUCTION_URL
    : SANDBOX_URL;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${getBaseUrl()}/oauth/generate/accesstoken?grant_type=client_credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.TIGO_CLIENT_ID || process.env.TIGO_MERCHANT_ID || "",
      client_secret: process.env.TIGO_CLIENT_SECRET || process.env.TIGO_MERCHANT_PIN || "",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Tigo auth error: ${response.status}`);
  }

  const data = await response.json();
  return data.accessToken || data.access_token;
}

export const tigoCashGateway: PaymentGateway = {
  name: "tigo_cash",
  supportedCurrencies: ["TZS", "GHS", "RWF", "XOF", "SLL"],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const referenceId = `SR${Date.now()}${randomBytes(3).toString("hex")}`;
    const token = await getAccessToken();

    const countryCode = params.metadata?.country || "TZ";
    const msisdn = (params.phoneNumber || "").replace(/^\+/, "");

    const body = {
      MasterMerchant: {
        account: process.env.TIGO_MERCHANT_ID,
        pin: process.env.TIGO_MERCHANT_PIN,
        id: process.env.TIGO_MERCHANT_ID,
      },
      Subscriber: {
        account: msisdn,
        countryCode,
        country: countryCode,
      },
      redirectUri: params.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tigo`,
      callbackUrl: params.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tigo`,
      language: "en",
      originPayment: {
        amount: params.amount.toString(),
        currencyCode: params.currency,
        tax: "0",
        fee: "0",
      },
      exchangeRate: "1",
      LocalPayment: {
        amount: params.amount.toString(),
        currencyCode: params.currency,
      },
      transactionRefId: referenceId,
    };

    try {
      const response = await fetch(
        `${getBaseUrl()}/tigo/payment-auth/authorize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok && (data.authCode || data.transactionId || data.redirectUrl)) {
        return {
          success: true,
          transactionId: referenceId,
          gatewayTransactionId: data.transactionId || data.authCode || referenceId,
          status: "pending",
          requiresAction: true,
          actionType: data.redirectUrl ? "redirect" : "ussd_push",
          actionUrl: data.redirectUrl,
          expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min
          rawResponse: data,
        };
      }

      return {
        success: false,
        transactionId: referenceId,
        status: "failed",
        error: data.error || data.errorMessage || data.description || `Tigo error: ${response.status}`,
        rawResponse: data,
      };
    } catch (err) {
      return {
        success: false,
        transactionId: referenceId,
        status: "failed",
        error: `Tigo request failed: ${(err as Error).message}`,
      };
    }
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    const token = await getAccessToken();

    try {
      const response = await fetch(
        `${getBaseUrl()}/tigo/payment-auth/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      const txStatus = (data.transactionStatus || data.status || "").toUpperCase();

      const statusMap: Record<string, PaymentStatusResult["status"]> = {
        SUCCESS: "succeeded",
        SUCCESSFUL: "succeeded",
        COMPLETED: "succeeded",
        FAILED: "failed",
        EXPIRED: "expired",
        PENDING: "pending",
        PROCESSING: "processing",
      };

      return {
        transactionId,
        status: statusMap[txStatus] || "pending",
        amount: data.amount ? parseInt(data.amount, 10) : undefined,
        currency: data.currencyCode || data.currency,
        paidAt: statusMap[txStatus] === "succeeded" ? new Date() : undefined,
        rawResponse: data,
      };
    } catch (err) {
      return {
        transactionId,
        status: "failed",
        rawResponse: { error: (err as Error).message },
      };
    }
  },

  async refund(
    transactionId: string,
    amount: number,
    currency: string
  ): Promise<RefundResult> {
    // Tigo refunds via disbursement (reverse payment)
    const result = await tigoCashGateway.transfer!({
      recipientPhone: "", // Would need original payer MSISDN
      amount,
      currency,
      reference: `refund-${transactionId}`,
    });

    return {
      success: result.success,
      refundId: result.transferId,
      amount,
      currency,
      status: result.status,
      error: result.error,
    };
  },

  async handleWebhook(payload: unknown): Promise<PaymentStatusResult> {
    const data = payload as Record<string, unknown>;

    const refId = (data.transactionRefId || data.referenceId || data.MFSTransactionID) as string;
    const status = ((data.status || data.transactionStatus || "") as string).toUpperCase();

    return {
      transactionId: refId || "",
      status: status === "SUCCESS" || status === "SUCCESSFUL" || status === "COMPLETED"
        ? "succeeded"
        : "failed",
      rawResponse: data,
    };
  },

  async transfer(params): Promise<TransferResult> {
    const referenceId = `TR${Date.now()}${randomBytes(3).toString("hex")}`;
    const token = await getAccessToken();

    try {
      const response = await fetch(
        `${getBaseUrl()}/tigo/payment-auth/disburse`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            MasterMerchant: {
              account: process.env.TIGO_MERCHANT_ID,
              pin: process.env.TIGO_MERCHANT_PIN,
            },
            Subscriber: {
              account: (params.recipientPhone || "").replace(/^\+/, ""),
            },
            amount: params.amount.toString(),
            currencyCode: params.currency,
            transactionRefId: referenceId,
          }),
        }
      );

      const data = await response.json();

      return {
        success: response.ok,
        transferId: referenceId,
        amount: params.amount,
        currency: params.currency,
        status: response.ok ? "pending" : "failed",
        error: !response.ok ? (data.error || data.errorMessage) : undefined,
      };
    } catch (err) {
      return {
        success: false,
        transferId: referenceId,
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },
};
