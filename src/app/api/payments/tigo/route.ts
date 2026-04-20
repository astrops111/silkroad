import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tigoCashGateway } from "@/lib/payments";
import { convertToLocalCurrency } from "@/lib/payments/currency";
import { formatMoney, toDisplayAmount } from "@/lib/payments/currency-config";

/**
 * POST /api/payments/tigo — Initiate Tigo Cash payment
 * Always charges in buyer's local currency
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, phoneNumber, currency, amount, buyerCountry, rateLockId } = await request.json();

  if (!orderId || !phoneNumber || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: orderId, phoneNumber, amount" },
      { status: 400 }
    );
  }

  let countryCode = buyerCountry;
  if (!countryCode) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("country_code")
      .eq("auth_id", user.id)
      .single();
    countryCode = profile?.country_code || "TZ";
  }

  let conversion;

  if (rateLockId) {
    const { data: lock } = await supabase
      .from("rate_locks")
      .select("*")
      .eq("id", rateLockId)
      .eq("status", "active")
      .single();

    if (!lock) return NextResponse.json({ error: "Rate lock not found or used" }, { status: 400 });
    if (new Date(lock.expires_at) < new Date()) {
      await supabase.from("rate_locks").update({ status: "expired" }).eq("id", rateLockId);
      return NextResponse.json({ error: "Rate lock expired", expired: true }, { status: 410 });
    }

    conversion = {
      localAmount: lock.converted_amount as number,
      localCurrency: lock.to_currency as string,
      exchangeRate: Number(lock.exchange_rate),
      originalAmount: lock.original_amount as number,
      originalCurrency: lock.from_currency as string,
    };

    await supabase
      .from("rate_locks")
      .update({ status: "used", used_at: new Date().toISOString(), purchase_order_id: orderId })
      .eq("id", rateLockId);
  } else {
    conversion = await convertToLocalCurrency(amount, currency || "USD", countryCode);
  }

  const apiAmount = toDisplayAmount(conversion.localAmount, conversion.localCurrency);

  const result = await tigoCashGateway.createPayment({
    orderId,
    amount: apiAmount,
    currency: conversion.localCurrency,
    phoneNumber,
    description: `Silk Road Africa Order ${orderId}`,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tigo`,
    metadata: { country: countryCode },
  });

  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "tigo_cash",
    gateway_transaction_id: result.transactionId,
    mobile_money_phone: phoneNumber,
    mobile_money_provider: "tigo",
    mobile_money_reference: result.transactionId,
    amount: conversion.localAmount,
    currency: conversion.localCurrency,
    exchange_rate: conversion.exchangeRate,
    amount_in_usd: currency === "USD" ? amount : null,
    status: result.status,
    raw_response: result.rawResponse,
    expires_at: result.expiresAt?.toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    transactionId: result.transactionId,
    status: result.status,
    actionType: result.actionType,
    actionUrl: result.actionUrl,
    expiresAt: result.expiresAt,
    chargedAmount: conversion.localAmount,
    chargedCurrency: conversion.localCurrency,
    exchangeRate: conversion.exchangeRate,
    message: result.success
      ? `Payment of ${formatMoney(conversion.localAmount, conversion.localCurrency)} sent to your phone. Enter your PIN to confirm.`
      : result.error,
  });
}
