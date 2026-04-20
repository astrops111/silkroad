import { createClient } from "@/lib/supabase/server";
import { isZeroDecimal, toDisplayAmount, toStoredAmount } from "./currency-config";

/**
 * Country → local currency mapping
 * Mobile money MUST charge in local currency
 */
const COUNTRY_CURRENCIES: Record<string, string> = {
  GH: "GHS", NG: "NGN", KE: "KES", UG: "UGX", TZ: "TZS",
  RW: "RWF", ET: "ETB", ZA: "ZAR", CM: "XAF", SN: "XOF",
  CI: "XOF", CD: "CDF", MZ: "MZN", ZM: "ZMW", ZW: "USD",
  MW: "MWK", EG: "EGP", MA: "MAD", ML: "XOF", BF: "XOF",
  GN: "GNF", BJ: "XOF", TG: "XOF", NE: "XOF", AO: "AOA",
  BW: "BWP", NA: "NAD", MG: "MGA", CN: "CNY", TW: "TWD",
  US: "USD", GB: "GBP",
};

/**
 * Get local currency for a country
 */
export function getLocalCurrency(countryCode: string): string {
  return COUNTRY_CURRENCIES[countryCode] || "USD";
}

/**
 * Convert amount between currencies using exchange_rates table
 * All exchange rates stored as USD-based (1 USD = X local currency)
 *
 * CRITICAL: Handles zero-decimal currencies correctly.
 * - USD $500 stored as 50000 (cents). 2 decimals.
 * - UGX 1,900,000 stored as 1900000 (whole shillings). 0 decimals.
 * - Exchange rates are in DISPLAY units (1 USD = 3800 UGX)
 *
 * Flow: stored amount → display amount → apply rate → stored amount in target
 *
 * @param amount Amount in source currency (STORED format — BIGINT)
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Converted amount in target currency (STORED format — BIGINT)
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; exchangeRate: number; source: string }> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, exchangeRate: 1, source: "same_currency" };
  }

  // Step 1: Convert stored amount to display value
  const displayAmount = toDisplayAmount(amount, fromCurrency);

  // Step 2: Get exchange rate (rates are in display units)
  const { rate, source } = await getExchangeRate(fromCurrency, toCurrency);

  // Step 3: Apply rate in display units
  const convertedDisplay = displayAmount * rate;

  // Step 4: Convert back to stored format for target currency
  const convertedStored = toStoredAmount(convertedDisplay, toCurrency);

  return {
    convertedAmount: convertedStored,
    exchangeRate: rate,
    source,
  };
}

/**
 * Look up exchange rate from database
 * Returns rate in DISPLAY units (1 USD = 3800 UGX, 1 USD = 15.5 GHS)
 */
async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<{ rate: number; source: string }> {
  const supabase = await createClient();

  // Try direct rate
  const { data: direct } = await supabase
    .from("exchange_rates")
    .select("rate, source")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .single();

  if (direct) {
    return { rate: Number(direct.rate), source: `direct:${direct.source}` };
  }

  // Convert via USD: fromCurrency → USD → toCurrency
  const { data: fromToUsd } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", "USD")
    .single();

  const { data: usdToTarget } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", "USD")
    .eq("to_currency", toCurrency)
    .single();

  if (fromToUsd && usdToTarget) {
    const effectiveRate = Number(fromToUsd.rate) * Number(usdToTarget.rate);
    return { rate: effectiveRate, source: "via_usd" };
  }

  // Try inverse: USD → fromCurrency (invert), then USD → toCurrency
  const { data: usdToFrom } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", "USD")
    .eq("to_currency", fromCurrency)
    .single();

  if (usdToFrom && usdToTarget) {
    const effectiveRate = Number(usdToTarget.rate) / Number(usdToFrom.rate);
    return { rate: effectiveRate, source: "via_usd_inverse" };
  }

  console.warn(`[currency] No exchange rate found for ${fromCurrency} → ${toCurrency}`);
  return { rate: 1, source: "fallback_no_rate" };
}

/**
 * Convert an order amount to the buyer's local currency for mobile money payment
 * Returns the local amount + rate info for the transaction record
 */
export async function convertToLocalCurrency(
  amount: number,
  orderCurrency: string,
  buyerCountryCode: string
): Promise<{
  localAmount: number;
  localCurrency: string;
  exchangeRate: number;
  originalAmount: number;
  originalCurrency: string;
}> {
  const localCurrency = getLocalCurrency(buyerCountryCode);

  if (orderCurrency === localCurrency) {
    return {
      localAmount: amount,
      localCurrency,
      exchangeRate: 1,
      originalAmount: amount,
      originalCurrency: orderCurrency,
    };
  }

  const { convertedAmount, exchangeRate } = await convertCurrency(
    amount,
    orderCurrency,
    localCurrency
  );

  return {
    localAmount: convertedAmount,
    localCurrency,
    exchangeRate,
    originalAmount: amount,
    originalCurrency: orderCurrency,
  };
}
