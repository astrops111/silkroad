import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

const SANDBOX_URL = "https://openapiuat.airtel.africa";
const PRODUCTION_URL = "https://openapi.airtel.africa";

function getBaseUrl(): string {
  return process.env.AIRTEL_ENVIRONMENT === "production"
    ? PRODUCTION_URL
    : SANDBOX_URL;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${getBaseUrl()}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) throw new Error(`Airtel auth error: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

export const airtelMoneyGateway: PaymentGateway = {
  name: "airtel_money",
  supportedCurrencies: ["KES", "TZS", "UGX", "XOF", "XAF", "MWK", "ZMW", "RWF", "CDF"],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const token = await getAccessToken();
    const referenceId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);

    const body = {
      reference: referenceId,
      subscriber: {
        country: params.metadata?.country || "KE",
        currency: params.currency,
        msisdn: params.phoneNumber!.replace(/^\+/, ""),
      },
      transaction: {
        amount: params.amount,
        country: params.metadata?.country || "KE",
        currency: params.currency,
        id: referenceId,
      },
    };

    const response = await fetch(
      `${getBaseUrl()}/merchant/v1/payments/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Country": params.metadata?.country || "KE",
          "X-Currency": params.currency,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (data.status?.code === "200" || data.status?.success) {
      return {
        success: true,
        transactionId: referenceId,
        gatewayTransactionId: data.data?.transaction?.id,
        status: "pending",
        requiresAction: true,
        actionType: "ussd_push",
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        rawResponse: data,
      };
    }

    return {
      success: false,
      transactionId: referenceId,
      status: "failed",
      error: data.status?.message || "Airtel Money payment failed",
      rawResponse: data,
    };
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    const token = await getAccessToken();

    const response = await fetch(
      `${getBaseUrl()}/standard/v1/payments/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Country": "KE",
          "X-Currency": "KES",
        },
      }
    );

    const data = await response.json();
    const txStatus = data.data?.transaction?.status;

    const statusMap: Record<string, PaymentStatusResult["status"]> = {
      TS: "succeeded",
      TF: "failed",
      TP: "pending",
      TIP: "processing",
    };

    return {
      transactionId,
      status: statusMap[txStatus] || "pending",
      amount: data.data?.transaction?.amount,
      currency: data.data?.transaction?.currency,
      paidAt: txStatus === "TS" ? new Date() : undefined,
      rawResponse: data,
    };
  },

  async refund(transactionId: string, amount: number, currency: string): Promise<RefundResult> {
    const token = await getAccessToken();
    const refundId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);

    const response = await fetch(`${getBaseUrl()}/standard/v1/payments/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Country": "KE",
        "X-Currency": currency,
      },
      body: JSON.stringify({
        transaction: { airtel_money_id: transactionId },
      }),
    });

    const data = await response.json();
    return {
      success: data.status?.success || false,
      refundId,
      amount,
      currency,
      status: data.status?.success ? "succeeded" : "failed",
      error: data.status?.message,
    };
  },

  async handleWebhook(payload: unknown): Promise<PaymentStatusResult> {
    const data = payload as Record<string, unknown>;
    const transaction = data.transaction as Record<string, unknown> | undefined;

    return {
      transactionId: (transaction?.id as string) || "",
      status: transaction?.status_code === "TS" ? "succeeded" : "failed",
      rawResponse: data,
    };
  },

  async transfer(params): Promise<TransferResult> {
    const token = await getAccessToken();
    const referenceId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);

    const response = await fetch(`${getBaseUrl()}/standard/v1/disbursements/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Country": "KE",
        "X-Currency": params.currency,
      },
      body: JSON.stringify({
        payee: {
          msisdn: params.recipientPhone!.replace(/^\+/, ""),
        },
        reference: params.reference,
        pin: process.env.AIRTEL_DISBURSEMENT_PIN,
        transaction: {
          amount: params.amount,
          id: referenceId,
        },
      }),
    });

    const data = await response.json();
    return {
      success: data.status?.success || false,
      transferId: referenceId,
      amount: params.amount,
      currency: params.currency,
      status: data.status?.success ? "pending" : "failed",
      error: data.status?.message,
    };
  },
};
