import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/exchange-rates — Update exchange rates from external API
 *
 * Called by pg_cron or Vercel Cron every hour.
 * Uses Open Exchange Rates (free tier: 1000 req/month = ~1.4/hour)
 * Fallback: ExchangeRate-API or hardcoded stale rates
 *
 * Cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/exchange-rates", "schedule": "0 * * * *" }] }
 */

const SUPPORTED_CURRENCIES = [
  "GHS", "NGN", "KES", "UGX", "TZS", "RWF", "ETB", "ZAR",
  "XOF", "XAF", "CDF", "MZN", "ZMW", "MWK", "EGP", "MAD",
  "GNF", "AOA", "BWP", "NAD", "MGA", "CNY", "EUR", "GBP", "TWD",
];

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without secret in dev
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const supabase = createServiceClient();

  let rates: Record<string, number> = {};
  let source = "manual";

  // Try Open Exchange Rates
  if (apiKey) {
    try {
      const res = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD`,
        { next: { revalidate: 0 } }
      );

      if (res.ok) {
        const data = await res.json();
        rates = data.rates;
        source = "openexchangerates";
      }
    } catch (err) {
      console.error("[cron/exchange-rates] OXR fetch failed:", err);
    }
  }

  // Fallback: ExchangeRate-API (free, no key needed, limited)
  if (Object.keys(rates).length === 0) {
    try {
      const res = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD",
        { next: { revalidate: 0 } }
      );

      if (res.ok) {
        const data = await res.json();
        rates = data.rates;
        source = "exchangerate-api";
      }
    } catch (err) {
      console.error("[cron/exchange-rates] Fallback fetch failed:", err);
    }
  }

  if (Object.keys(rates).length === 0) {
    return NextResponse.json({
      success: false,
      error: "Failed to fetch rates from all providers",
      timestamp: new Date().toISOString(),
    });
  }

  // Upsert rates into exchange_rates table
  let updated = 0;
  let errors = 0;

  for (const currency of SUPPORTED_CURRENCIES) {
    const rate = rates[currency];
    if (!rate) continue;

    // USD → currency
    const { error } = await supabase
      .from("exchange_rates")
      .upsert(
        {
          from_currency: "USD",
          to_currency: currency,
          rate,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "from_currency,to_currency" }
      );

    if (error) {
      console.error(`[cron/exchange-rates] Failed to upsert USD→${currency}:`, error.message);
      errors++;
    } else {
      updated++;
    }

    // Also store inverse: currency → USD
    const { error: invError } = await supabase
      .from("exchange_rates")
      .upsert(
        {
          from_currency: currency,
          to_currency: "USD",
          rate: 1 / rate,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "from_currency,to_currency" }
      );

    if (invError) {
      errors++;
    } else {
      updated++;
    }
  }

  // Cross-rates for common Africa-China pairs
  const cnyRate = rates["CNY"];
  if (cnyRate) {
    for (const currency of ["GHS", "NGN", "KES", "UGX", "TZS", "ZAR"]) {
      const localRate = rates[currency];
      if (!localRate) continue;

      // CNY → African currency
      await supabase
        .from("exchange_rates")
        .upsert(
          {
            from_currency: "CNY",
            to_currency: currency,
            rate: localRate / cnyRate,
            source: `${source}_cross`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "from_currency,to_currency" }
        );

      // African currency → CNY
      await supabase
        .from("exchange_rates")
        .upsert(
          {
            from_currency: currency,
            to_currency: "CNY",
            rate: cnyRate / localRate,
            source: `${source}_cross`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "from_currency,to_currency" }
        );

      updated += 2;
    }
  }

  return NextResponse.json({
    success: true,
    source,
    updated,
    errors,
    currencies: SUPPORTED_CURRENCIES.length,
    timestamp: new Date().toISOString(),
  });
}
