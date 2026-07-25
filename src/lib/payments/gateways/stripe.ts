import Stripe from "stripe";
import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export const stripeGateway: PaymentGateway = {
  name: "stripe",
  supportedCurrencies: [
    "USD", "EUR", "GBP", "CNY", "TWD", "GHS", "KES", "ZAR", "NGN",
    "TZS", "UGX", "RWF", "ETB", "EGP", "MAD", "XOF", "XAF",
  ],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const stripe = getStripe();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount, // Stripe uses smallest currency unit
        currency: params.currency.toLowerCase(),
        description: params.description,
        metadata: {
          orderId: params.orderId,
          ...params.metadata,
        },
        ...(params.paymentMethodId
          ? { payment_method: params.paymentMethodId, confirm: true }
          : {}),
        ...(params.returnUrl
          ? { return_url: params.returnUrl }
          : {}),
        automatic_payment_methods: { enabled: true },
      });

      const requiresAction =
        paymentIntent.status === "requires_action" ||
        paymentIntent.status === "requires_payment_method";

      return {
        success: true,
        transactionId: paymentIntent.id,
        gatewayTransactionId: paymentIntent.id,
        status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
        requiresAction,
        actionUrl: paymentIntent.next_action?.redirect_to_url?.url ?? undefined,
        actionType: requiresAction ? "redirect" : undefined,
        rawResponse: paymentIntent,
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        transactionId: "",
        status: "failed",
        error: error.message,
      };
    }
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(transactionId);

    const statusMap: Record<string, PaymentStatusResult["status"]> = {
      succeeded: "succeeded",
      processing: "processing",
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending",
      canceled: "failed",
    };

    return {
      transactionId: pi.id,
      status: statusMap[pi.status] || "pending",
      amount: pi.amount,
      currency: pi.currency.toUpperCase(),
      paidAt: pi.status === "succeeded" ? new Date(pi.created * 1000) : undefined,
      rawResponse: pi,
    };
  },

  async refund(
    transactionId: string,
    amount: number,
    currency: string
  ): Promise<RefundResult> {
    const stripe = getStripe();

    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount,
      });

      return {
        success: refund.status === "succeeded",
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency.toUpperCase(),
        status: refund.status === "succeeded" ? "succeeded" : "pending",
      };
    } catch (err) {
      return {
        success: false,
        refundId: "",
        amount,
        currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },

  async handleWebhook(
    payload: unknown,
    signature?: string
  ): Promise<PaymentStatusResult> {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      payload as string | Buffer,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        transactionId: pi.id,
        status: "succeeded",
        amount: pi.amount,
        currency: pi.currency.toUpperCase(),
        paidAt: new Date(),
        rawResponse: pi,
      };
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        transactionId: pi.id,
        status: "failed",
        rawResponse: pi,
      };
    }

    // A refund issued outside our own processRefund() flow (e.g. directly
    // from the Stripe dashboard) — sync payment_transactions back to it.
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      return {
        transactionId: (charge.payment_intent as string) ?? "",
        status: "refunded",
        amount: charge.amount_refunded,
        currency: charge.currency?.toUpperCase(),
        rawResponse: charge,
        eventType: event.type,
      };
    }

    // Card-network chargeback opened — reuse the buyer-dispute table +
    // settlement-blocking machinery (see src/lib/payments/webhook-events.ts).
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      return {
        transactionId: (dispute.payment_intent as string) ?? "",
        status: "disputed",
        amount: dispute.amount,
        currency: dispute.currency?.toUpperCase(),
        gatewayDisputeId: dispute.id,
        disputeReason: dispute.reason,
        rawResponse: dispute,
        eventType: event.type,
      };
    }

    // Dispute reached a terminal state. "lost" means Stripe has debited the
    // funds for good — treat exactly like a refund. "won" just means the
    // dispute record should be resolved (handled by the webhook route,
    // which sees this via disputeReason/eventType); no money moved.
    if (event.type === "charge.dispute.closed") {
      const dispute = event.data.object as Stripe.Dispute;
      const lost = dispute.status === "lost";
      return {
        transactionId: (dispute.payment_intent as string) ?? "",
        status: lost ? "refunded" : "disputed",
        amount: dispute.amount,
        currency: dispute.currency?.toUpperCase(),
        gatewayDisputeId: dispute.id,
        disputeReason: dispute.status,
        rawResponse: dispute,
        eventType: event.type,
      };
    }

    return {
      transactionId: "",
      status: "pending",
      rawResponse: event,
      eventType: event.type,
    };
  },

  // Stripe Connect transfers for supplier payouts
  async transfer(params): Promise<TransferResult> {
    const stripe = getStripe();

    try {
      const transfer = await stripe.transfers.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        destination: params.recipientAccountId!, // Stripe Connect account ID
        description: params.reference,
      });

      return {
        success: true,
        transferId: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency.toUpperCase(),
        status: "succeeded",
      };
    } catch (err) {
      return {
        success: false,
        transferId: "",
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },
};
