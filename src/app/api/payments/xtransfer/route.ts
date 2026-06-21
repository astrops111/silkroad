import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { xtransferGateway } from "@/lib/payments/gateways/xtransfer";

/**
 * POST /api/payments/xtransfer
 *
 * Two XTransfer collection flows, selected by whether phoneNumber is in the body:
 *
 * 1. Request Money (phoneNumber + country):
 *    Calls XTransfer /request-money/create → buyer gets a push on their phone
 *    (MTN, Orange, NIBSS, Vodacom…). Frontend polls /api/payments/xtransfer/status.
 *    Webhook also updates the order when terminal.
 *
 * 2. Wire collection (no phoneNumber):
 *    Returns the platform's XTransfer virtual account details + unique order reference.
 *    Buyer does a SWIFT/domestic wire. Webhook fires when funds land.
 *
 * Body: {
 *   orderId:     string   — purchase_orders.id (UUID)
 *   amount:      number   — in minor units (cents)
 *   currency:    string   — ISO 4217 (USD for wire; auto-derived from country for Request Money)
 *   phoneNumber: string?  — triggers Request Money flow
 *   country:     string?  — ISO 3166-1 alpha-2, required when phoneNumber is set
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    orderId?: string;
    amount?: number;
    currency?: string;
    phoneNumber?: string;
    country?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, amount, currency, phoneNumber, country } = body;
  if (!orderId || !amount || !currency) {
    return NextResponse.json(
      { error: "orderId, amount, and currency are required" },
      { status: 400 }
    );
  }
  if (phoneNumber && !country) {
    return NextResponse.json(
      { error: "country is required when phoneNumber is provided" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, order_number, status, grand_total")
    .eq("id", orderId)
    .eq("buyer_user_id", profile.id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 409 });
  }

  // H2: validate client-supplied amount against DB source of truth
  const requestAmount = Number(amount);
  if (Math.abs(requestAmount - order.grand_total) > 1) {
    return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 });
  }
  // Always charge the DB-sourced amount, never the client-supplied value
  const chargeAmount = order.grand_total;

  let result: Awaited<ReturnType<typeof xtransferGateway.createPayment>>;
  try {
    result = await xtransferGateway.createPayment({
      orderId: order.order_number,
      amount: chargeAmount,
      currency,
      phoneNumber: phoneNumber ?? undefined,
      metadata: country ? { country } : undefined,
    });
  } catch (err) {
    console.error("[payments/xtransfer] createPayment error:", err);
    // H17: return a generic message — never expose internal error details to the client
    return NextResponse.json(
      { error: "Payment initiation failed. Please try again." },
      { status: 500 }
    );
  }

  // Record pending transaction
  const { error: txError } = await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "xtransfer",
    gateway_transaction_id: result.transactionId,
    amount: chargeAmount,
    currency,
    status: result.status,
    ...(phoneNumber ? { mobile_money_phone: phoneNumber } : {}),
    expires_at: result.expiresAt?.toISOString(),
    raw_response: result.rawResponse,
  });

  if (txError) {
    console.error("[payments/xtransfer] payment_transactions insert failed:", txError);
  }

  const raw = result.rawResponse as Record<string, unknown>;

  if (raw.type === "request_money") {
    // Frontend polls /api/payments/xtransfer/status?transactionId=xxx
    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      requiresAction: true,
      actionType: "ussd_push",
      expiresAt: result.expiresAt,
    });
  }

  // Wire — return bank account details for display
  return NextResponse.json({
    success: true,
    transactionId: result.transactionId,
    status: result.status,
    requiresAction: true,
    actionType: "bank_transfer_instructions",
    expiresAt: result.expiresAt,
    paymentInstructions: {
      reference:     raw.reference,
      bankName:      raw.bankName,
      accountNo:     raw.accountNo,
      swiftCode:     raw.swiftCode,
      iban:          raw.iban,
      routingNumber: raw.routingNumber,
      amount:        chargeAmount,
      currency,
      expiresAt:     raw.expiresAt,
      memo:          raw.memo,
    },
  });
}
