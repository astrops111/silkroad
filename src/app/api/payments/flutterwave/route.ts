import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flutterwaveGateway } from "@/lib/payments/gateways/flutterwave";
import { convertToLocalCurrency } from "@/lib/payments/currency";
import { formatMoney, toDisplayAmount } from "@/lib/payments/currency-config";

/**
 * POST /api/payments/flutterwave — Initiate a Flutterwave charge
 *
 * Flutterwave is the primary payment connector for African buyers, covering
 * card, MTN Mobile Money, and Airtel Money through a single aggregator.
 *
 * - Card (no phoneNumber): charges the order currency, returns a hosted
 *   checkout redirect.
 * - Mobile money (phoneNumber + network "MTN" | "AIRTEL"): always converts
 *   to the buyer's local currency and sends a USSD push.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, amount, currency, phoneNumber, network, buyerCountry, returnUrl } = await request.json();

  if (!orderId || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: orderId, amount" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, country_code")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, status, grand_total")
    .eq("id", orderId)
    .eq("buyer_user_id", profile.id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment")
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 400 });

  // Validate client-supplied amount against DB source of truth
  const requestAmount = Number(amount);
  if (Math.abs(requestAmount - order.grand_total) > 1) {
    return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 });
  }
  // Always charge the DB-sourced amount, never the client-supplied value
  const chargeAmount = order.grand_total;

  const countryCode = buyerCountry || profile.country_code || "GH";
  const isMobileMoney = !!phoneNumber;

  const conversion = isMobileMoney
    ? await convertToLocalCurrency(chargeAmount, currency || "USD", countryCode)
    : null;

  const chargeCurrency = conversion ? conversion.localCurrency : (currency || "USD");
  const apiAmount = toDisplayAmount(conversion ? conversion.localAmount : chargeAmount, chargeCurrency);

  const result = await flutterwaveGateway.createPayment({
    orderId,
    amount: apiAmount,
    currency: chargeCurrency,
    phoneNumber,
    returnUrl,
    description: `Silk Road Africa Order ${orderId}`,
    metadata: {
      countryCode,
      ...(network ? { network } : {}),
    },
  });

  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "flutterwave",
    gateway_transaction_id: result.transactionId,
    ...(isMobileMoney ? {
      mobile_money_phone: phoneNumber,
      mobile_money_provider: network ? network.toLowerCase() : "flutterwave",
      mobile_money_reference: result.transactionId,
    } : {}),
    amount: conversion ? conversion.localAmount : chargeAmount,
    currency: chargeCurrency,
    exchange_rate: conversion?.exchangeRate ?? 1,
    amount_in_usd: currency === "USD" ? chargeAmount : null,
    status: result.status,
    raw_response: result.rawResponse,
    raw_request: conversion ? {
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      localAmount: conversion.localAmount,
      localCurrency: conversion.localCurrency,
      exchangeRate: conversion.exchangeRate,
      buyerCountry: countryCode,
    } : null,
    expires_at: result.expiresAt?.toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    transactionId: result.transactionId,
    status: result.status,
    requiresAction: result.requiresAction,
    actionType: result.actionType,
    actionUrl: result.actionUrl,
    expiresAt: result.expiresAt,
    ...(conversion ? {
      chargedAmount: conversion.localAmount,
      chargedCurrency: conversion.localCurrency,
      exchangeRate: conversion.exchangeRate,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
    } : {}),
    message: !result.success
      ? result.error
      : (conversion
          ? `Payment of ${formatMoney(conversion.localAmount, conversion.localCurrency)} sent to your phone. Enter your PIN to confirm.`
          : undefined),
  });
}
