import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { airtelMoneyGateway } from "@/lib/payments";
import { convertToLocalCurrency } from "@/lib/payments/currency";
import { formatMoney, toDisplayAmount } from "@/lib/payments/currency-config";

/**
 * POST /api/payments/airtel — Initiate Airtel Money payment
 * Always charges in buyer's local currency, converts from order currency
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, phoneNumber, currency, amount, buyerCountry } = await request.json();

  if (!orderId || !phoneNumber || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: orderId, phoneNumber, amount" },
      { status: 400 }
    );
  }

  // Determine buyer's country
  let countryCode = buyerCountry;
  if (!countryCode) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("country_code")
      .eq("auth_id", user.id)
      .single();
    countryCode = profile?.country_code || "KE";
  }

  // Convert to local currency
  const conversion = await convertToLocalCurrency(
    amount,
    currency || "USD",
    countryCode
  );

  // Airtel API expects display units (same as MoMo)
  const apiAmount = toDisplayAmount(conversion.localAmount, conversion.localCurrency);

  const result = await airtelMoneyGateway.createPayment({
    orderId,
    amount: apiAmount,
    currency: conversion.localCurrency,
    phoneNumber,
    description: `Silk Road Africa Order ${orderId}`,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/airtel`,
    metadata: { country: countryCode },
  });

  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "airtel_money",
    gateway_transaction_id: result.transactionId,
    mobile_money_phone: phoneNumber,
    mobile_money_provider: "airtel",
    mobile_money_reference: result.transactionId,
    amount: conversion.localAmount,
    currency: conversion.localCurrency,
    exchange_rate: conversion.exchangeRate,
    amount_in_usd: currency === "USD" ? amount : null,
    status: result.status,
    raw_response: result.rawResponse,
    raw_request: {
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      localAmount: conversion.localAmount,
      localCurrency: conversion.localCurrency,
      exchangeRate: conversion.exchangeRate,
      buyerCountry: countryCode,
    },
    expires_at: result.expiresAt?.toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    transactionId: result.transactionId,
    status: result.status,
    actionType: result.actionType,
    expiresAt: result.expiresAt,
    chargedAmount: conversion.localAmount,
    chargedCurrency: conversion.localCurrency,
    exchangeRate: conversion.exchangeRate,
    originalAmount: conversion.originalAmount,
    originalCurrency: conversion.originalCurrency,
    message: result.success
      ? `Payment of ${formatMoney(conversion.localAmount, conversion.localCurrency)} sent to your phone. Enter your PIN to confirm.`
      : result.error,
  });
}
