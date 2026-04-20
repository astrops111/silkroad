export type GatewayType =
  | "flutterwave"   // pan-Africa aggregator (preferred)
  | "mtn_momo"      // direct MTN API
  | "airtel_money"  // direct Airtel API
  | "tigo_cash"
  | "mpesa"
  | "stripe"
  | "alipay"
  | "wechat_pay"
  | "bank_transfer"
  | "platform_wallet";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  // Mobile money specific
  phoneNumber?: string;
  mobileProvider?: string;
  // Stripe specific
  paymentMethodId?: string;
  customerId?: string;
  // Return URLs
  callbackUrl?: string;
  returnUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  requiresAction?: boolean;
  actionUrl?: string;      // Redirect URL for WeChat/Alipay
  actionType?: "redirect" | "ussd_push" | "qr_code" | "poll";
  expiresAt?: Date;
  rawResponse?: unknown;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  error?: string;
}

export interface TransferResult {
  success: boolean;
  transferId: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  error?: string;
}

export interface PaymentStatusResult {
  transactionId: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "expired";
  amount?: number;
  currency?: string;
  paidAt?: Date;
  rawResponse?: unknown;
}

export interface PaymentGateway {
  name: GatewayType;
  supportedCurrencies: string[];

  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  checkStatus(transactionId: string): Promise<PaymentStatusResult>;
  refund(transactionId: string, amount: number, currency: string): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature?: string): Promise<PaymentStatusResult>;

  // Disbursement (for supplier payouts)
  transfer?(params: {
    recipientPhone?: string;
    recipientProvider?: string;
    recipientAccountId?: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<TransferResult>;
}
