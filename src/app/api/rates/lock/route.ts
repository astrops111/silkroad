import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertToLocalCurrency } from "@/lib/payments/currency";
import { formatMoney } from "@/lib/payments/currency-config";

const DEFAULT_LOCK_MINUTES = 15;

/**
 * POST /api/rates/lock — Lock an exchange rate at checkout
 *
 * Called when buyer reaches checkout and sees local currency amount.
 * Returns a lock ID that must be passed to the payment route.
 * Lock is valid for 15 minutes.
 *
 * Body: { amount, orderCurrency, buyerCountry, validityMinutes? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { amount, orderCurrency, buyerCountry, validityMinutes } = await request.json();

  if (!amount || !orderCurrency || !buyerCountry) {
    return NextResponse.json(
      { error: "Missing amount, orderCurrency, or buyerCountry" },
      { status: 400 }
    );
  }

  const minutes = validityMinutes || DEFAULT_LOCK_MINUTES;

  // Convert at current rate
  const conversion = await convertToLocalCurrency(amount, orderCurrency, buyerCountry);

  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  // Create rate lock
  const { data: lock, error } = await supabase
    .from("rate_locks")
    .insert({
      user_id: profile.id,
      from_currency: orderCurrency,
      to_currency: conversion.localCurrency,
      exchange_rate: conversion.exchangeRate,
      original_amount: conversion.originalAmount,
      converted_amount: conversion.localAmount,
      locked_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      validity_minutes: minutes,
      rate_source: "live",
    })
    .select("id, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    lockId: lock.id,
    exchangeRate: conversion.exchangeRate,
    originalAmount: conversion.originalAmount,
    originalCurrency: orderCurrency,
    convertedAmount: conversion.localAmount,
    localCurrency: conversion.localCurrency,
    displayAmount: formatMoney(conversion.localAmount, conversion.localCurrency),
    expiresAt: lock.expires_at,
    validityMinutes: minutes,
    message: `Rate locked for ${minutes} minutes. You will be charged ${formatMoney(conversion.localAmount, conversion.localCurrency)}.`,
  });
}

/**
 * GET /api/rates/lock?lockId=xxx — Validate a rate lock is still active
 */
export async function GET(request: NextRequest) {
  const lockId = request.nextUrl.searchParams.get("lockId");
  if (!lockId) return NextResponse.json({ error: "Missing lockId" }, { status: 400 });

  const supabase = await createClient();

  const { data: lock, error } = await supabase
    .from("rate_locks")
    .select("*")
    .eq("id", lockId)
    .single();

  if (error || !lock) {
    return NextResponse.json({ error: "Lock not found" }, { status: 404 });
  }

  const isExpired = new Date(lock.expires_at) < new Date();
  const isValid = lock.status === "active" && !isExpired;

  if (isExpired && lock.status === "active") {
    await supabase
      .from("rate_locks")
      .update({ status: "expired" })
      .eq("id", lockId);
  }

  return NextResponse.json({
    lockId: lock.id,
    isValid,
    status: isExpired ? "expired" : lock.status,
    exchangeRate: lock.exchange_rate,
    originalAmount: lock.original_amount,
    originalCurrency: lock.from_currency,
    convertedAmount: lock.converted_amount,
    localCurrency: lock.to_currency,
    displayAmount: formatMoney(lock.converted_amount, lock.to_currency),
    expiresAt: lock.expires_at,
    remainingSeconds: isValid
      ? Math.max(0, Math.floor((new Date(lock.expires_at).getTime() - Date.now()) / 1000))
      : 0,
  });
}
