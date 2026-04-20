import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

const SANDBOX_URL = "https://sandbox.momodeveloper.mtn.com";
const PRODUCTION_URL = "https://proxy.momoapi.mtn.com";

function getBaseUrl(): string {
  return process.env.MTN_MOMO_ENVIRONMENT === "production"
    ? PRODUCTION_URL
    : SANDBOX_URL;
}

async function getAccessToken(product: "collection" | "disbursement"): Promise<string> {
  const response = await fetch(
    `${getBaseUrl()}/${product}/token/`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.MTN_MOMO_API_USER}:${process.env.MTN_MOMO_API_KEY}`
        ).toString("base64")}`,
        "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`MTN MoMo token error: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export const mtnMomoGateway: PaymentGateway = {
  name: "mtn_momo",
  supportedCurrencies: ["GHS", "UGX", "XOF", "XAF", "EUR", "RWF", "ZMW"],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const referenceId = crypto.randomUUID();
    const token = await getAccessToken("collection");

    const body = {
      amount: params.amount.toString(),
      currency: params.currency,
      externalId: params.orderId,
      payer: {
        partyIdType: "MSISDN",
        partyId: params.phoneNumber!,
      },
      payerMessage: params.description || "Silk Road Africa Payment",
      payeeNote: `Order ${params.orderId}`,
    };

    const response = await fetch(
      `${getBaseUrl()}/collection/v1_0/requesttopay`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": referenceId,
          "X-Target-Environment": process.env.MTN_MOMO_ENVIRONMENT || "sandbox",
          "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
          "Content-Type": "application/json",
          ...(params.callbackUrl
            ? { "X-Callback-Url": params.callbackUrl }
            : {}),
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 202) {
      // 202 Accepted — USSD push sent to payer's phone
      return {
        success: true,
        transactionId: referenceId,
        status: "pending",
        requiresAction: true,
        actionType: "ussd_push",
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min timeout
        rawResponse: { referenceId, statusCode: 202 },
      };
    }

    return {
      success: false,
      transactionId: referenceId,
      status: "failed",
      error: `MTN MoMo request failed: ${response.status} ${response.statusText}`,
      rawResponse: await response.text(),
    };
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    const token = await getAccessToken("collection");

    const response = await fetch(
      `${getBaseUrl()}/collection/v1_0/requesttopay/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": process.env.MTN_MOMO_ENVIRONMENT || "sandbox",
          "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
        },
      }
    );

    if (!response.ok) {
      return {
        transactionId,
        status: "failed",
        rawResponse: await response.text(),
      };
    }

    const data = await response.json();

    const statusMap: Record<string, PaymentStatusResult["status"]> = {
      SUCCESSFUL: "succeeded",
      FAILED: "failed",
      PENDING: "pending",
      EXPIRED: "expired",
    };

    return {
      transactionId,
      status: statusMap[data.status] || "pending",
      amount: parseInt(data.amount, 10),
      currency: data.currency,
      paidAt: data.status === "SUCCESSFUL" ? new Date() : undefined,
      rawResponse: data,
    };
  },

  async refund(
    transactionId: string,
    amount: number,
    currency: string
  ): Promise<RefundResult> {
    // MTN MoMo refunds are done via disbursement API
    const result = await mtnMomoGateway.transfer!({
      recipientPhone: "", // Would need to look up original payer
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
    const referenceId = data.externalId as string || data.financialTransactionId as string;

    return {
      transactionId: referenceId,
      status: data.status === "SUCCESSFUL" ? "succeeded" : "failed",
      rawResponse: data,
    };
  },

  async transfer(params): Promise<TransferResult> {
    const referenceId = crypto.randomUUID();
    const token = await getAccessToken("disbursement");

    const body = {
      amount: params.amount.toString(),
      currency: params.currency,
      externalId: params.reference,
      payee: {
        partyIdType: "MSISDN",
        partyId: params.recipientPhone!,
      },
      payerMessage: "Silk Road Africa Payout",
      payeeNote: params.reference,
    };

    const response = await fetch(
      `${getBaseUrl()}/disbursement/v1_0/transfer`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": referenceId,
          "X-Target-Environment": process.env.MTN_MOMO_ENVIRONMENT || "sandbox",
          "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    return {
      success: response.status === 202,
      transferId: referenceId,
      amount: params.amount,
      currency: params.currency,
      status: response.status === 202 ? "pending" : "failed",
      error: response.status !== 202
        ? `Transfer failed: ${response.status}`
        : undefined,
    };
  },
};
