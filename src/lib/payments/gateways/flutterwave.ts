import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

// ---------------------------------------------------------------------------
// Flutterwave — pan-Africa payment aggregator
// Covers: MTN (RW/GH/UG/CM/CI/ZM), Airtel (KE/TZ/UG/RW/MW),
//         AirtelTigo (GH), Tigo (TZ), M-Pesa (KE/TZ), Card (all)
//
// Docs: https://developer.flutterwave.com/
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.flutterwave.com/v3";

function getHeaders(): Record<string, string> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/**
 * Map country code → Flutterwave mobile money charge type.
 * Flutterwave auto-detects operator per phone number, but we still need
 * the correct `type` parameter.
 */
function getMobileMoneyType(countryCode: string): string {
  const map: Record<string, string> = {
    GH: "mobile_money_ghana",     // MTN + AirtelTigo
    RW: "mobile_money_rwanda",    // MTN
    UG: "mobile_money_uganda",    // MTN + Airtel
    TZ: "mobile_money_tanzania",  // Tigo + Airtel + M-Pesa
    KE: "mobile_money_kenya",     // M-Pesa
    ZM: "mobile_money_zambia",    // MTN + Airtel
    CM: "mobile_money_cameroon",  // MTN + Orange
    NG: "mpesa",                  // Fallthrough — use card for Nigeria
    ZW: "mobile_money_zimbabwe",  // Ecocash
    SN: "mobile_money_senegal",   // Orange / Wave
    CI: "mobile_money_ivory_coast", // MTN / Orange
    BJ: "mobile_money_benin",     // MTN
    GN: "mobile_money_guinea",    // MTN
    CD: "mobile_money_congo",     // Airtel
    MG: "mobile_money_madagascar", // Airtel
  };
  return map[countryCode] ?? "mobile_money_ghana"; // fallback
}

export const flutterwaveGateway: PaymentGateway = {
  name: "flutterwave",
  supportedCurrencies: [
    "GHS", "NGN", "KES", "UGX", "TZS", "ZMW", "RWF",
    "XOF", "XAF", "USD", "EUR", "GBP", "ZAR",
  ],

  // ── Charge (collect payment) ─────────────────────────────────────────────
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const txRef = `silk-${params.orderId}-${Date.now()}`;

    // Determine payment type: mobile money or card
    const countryCode = params.metadata?.countryCode ?? "GH";
    const isMobileMoney = !!params.phoneNumber;
    const chargeType = isMobileMoney
      ? getMobileMoneyType(countryCode)
      : "card";

    const body: Record<string, unknown> = {
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/checkout/verify`,
      meta: {
        order_id: params.orderId,
        platform: "silkroad_africa",
        ...params.metadata,
      },
      customer: {
        email: params.metadata?.email ?? "buyer@silkroad.africa",
        phonenumber: params.phoneNumber,
        name: params.metadata?.buyerName ?? "Buyer",
      },
      customizations: {
        title: "SilkRoad Africa",
        description: params.description ?? `Order ${params.orderId}`,
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
    };

    // Mobile money extra fields
    if (isMobileMoney) {
      body.phone_number = params.phoneNumber;
      body.type = chargeType;

      if (params.metadata?.network) {
        body.network = params.metadata.network.toUpperCase();
      }
    }

    const endpoint = isMobileMoney
      ? `${BASE_URL}/charges?type=${chargeType}`
      : `${BASE_URL}/payments`; // hosted payment link for card

    const response = await fetch(endpoint, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.status === "success") {
      const flwRef = data.data?.flw_ref ?? txRef;
      const actionUrl = data.data?.link; // For card: hosted page redirect

      return {
        success: true,
        transactionId: txRef,
        gatewayTransactionId: flwRef,
        status: "pending",
        requiresAction: true,
        actionType: isMobileMoney ? "ussd_push" : "redirect",
        actionUrl: actionUrl,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min
        rawResponse: data,
      };
    }

    return {
      success: false,
      transactionId: txRef,
      status: "failed",
      error: data.message ?? "Flutterwave charge failed",
      rawResponse: data,
    };
  },

  // ── Check payment status ─────────────────────────────────────────────────
  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    // transactionId = our tx_ref
    const response = await fetch(
      `${BASE_URL}/transactions/verify_by_reference?tx_ref=${transactionId}`,
      { headers: getHeaders() }
    );

    const data = await response.json();

    if (data.status !== "success") {
      return {
        transactionId,
        status: "failed",
        rawResponse: data,
      };
    }

    const tx = data.data;
    const statusMap: Record<string, PaymentStatusResult["status"]> = {
      successful: "succeeded",
      failed: "failed",
      pending: "pending",
      cancelled: "failed",
    };

    return {
      transactionId,
      status: statusMap[tx.status?.toLowerCase()] ?? "pending",
      amount: tx.amount,
      currency: tx.currency,
      paidAt: tx.status?.toLowerCase() === "successful"
        ? new Date(tx.created_at)
        : undefined,
      rawResponse: tx,
    };
  },

  // ── Refund ───────────────────────────────────────────────────────────────
  async refund(
    transactionId: string,
    amount: number,
    _currency: string
  ): Promise<RefundResult> {
    // First get the numeric Flutterwave transaction ID from tx_ref
    const verifyRes = await fetch(
      `${BASE_URL}/transactions/verify_by_reference?tx_ref=${transactionId}`,
      { headers: getHeaders() }
    );
    const verifyData = await verifyRes.json();
    const flwId: number = verifyData.data?.id;

    if (!flwId) {
      return {
        success: false,
        refundId: "",
        amount,
        currency: _currency,
        status: "failed",
        error: "Could not resolve Flutterwave transaction ID for refund",
      };
    }

    const response = await fetch(`${BASE_URL}/transactions/${flwId}/refund`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    return {
      success: data.status === "success",
      refundId: data.data?.id?.toString() ?? "",
      amount,
      currency: _currency,
      status: data.status === "success" ? "pending" : "failed",
      error: data.status !== "success" ? data.message : undefined,
    };
  },

  // ── Webhook handler ───────────────────────────────────────────────────────
  async handleWebhook(
    payload: unknown,
    _signature?: string
  ): Promise<PaymentStatusResult> {
    const data = payload as Record<string, unknown>;
    const event = data.event as string;
    const tx = data.data as Record<string, unknown>;

    // Only handle charge events
    if (!event?.startsWith("charge.")) {
      return { transactionId: "", status: "pending", rawResponse: data };
    }

    const txRef = tx?.tx_ref as string;
    const statusMap: Record<string, PaymentStatusResult["status"]> = {
      successful: "succeeded",
      failed: "failed",
    };

    return {
      transactionId: txRef,
      status: statusMap[(tx?.status as string)?.toLowerCase()] ?? "pending",
      amount: tx?.amount as number,
      currency: tx?.currency as string,
      paidAt: (tx?.status as string)?.toLowerCase() === "successful"
        ? new Date(tx?.created_at as string)
        : undefined,
      rawResponse: data,
    };
  },

  // ── Payout (transfer to mobile money / bank) ─────────────────────────────
  async transfer(params): Promise<TransferResult> {
    const reference = `payout-${params.reference}-${Date.now()}`;

    // Mobile money payout
    if (params.recipientPhone) {
      const response = await fetch(`${BASE_URL}/transfers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          account_bank: params.recipientProvider ?? "MTN",
          account_number: params.recipientPhone,
          amount: params.amount,
          narration: `SilkRoad Africa payout — ${params.reference}`,
          currency: params.currency,
          reference,
          debit_currency: "USD",
        }),
      });

      const data = await response.json();

      return {
        success: data.status === "success",
        transferId: reference,
        amount: params.amount,
        currency: params.currency,
        status: data.status === "success" ? "pending" : "failed",
        error: data.status !== "success" ? data.message : undefined,
      };
    }

    // Bank account payout
    if (params.recipientAccountId) {
      const [accountNumber, bankCode] = params.recipientAccountId.split("@");

      const response = await fetch(`${BASE_URL}/transfers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          account_bank: bankCode,
          account_number: accountNumber,
          amount: params.amount,
          narration: `SilkRoad Africa payout — ${params.reference}`,
          currency: params.currency,
          reference,
          debit_currency: "USD",
        }),
      });

      const data = await response.json();

      return {
        success: data.status === "success",
        transferId: reference,
        amount: params.amount,
        currency: params.currency,
        status: data.status === "success" ? "pending" : "failed",
        error: data.status !== "success" ? data.message : undefined,
      };
    }

    return {
      success: false,
      transferId: reference,
      amount: params.amount,
      currency: params.currency,
      status: "failed",
      error: "Either recipientPhone or recipientAccountId is required",
    };
  },
};
