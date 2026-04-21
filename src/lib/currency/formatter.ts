/**
 * Locale-aware currency formatting for SilkRoad Africa.
 * All prices stored in minor units (cents). This module handles display formatting.
 */

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  fr: "fr-FR",
  sw: "sw-KE",
  pt: "pt-BR",
  ar: "ar-EG",
};

/**
 * Format a price in minor units to a display string.
 * @param amount - Amount in minor units (cents)
 * @param currency - ISO 4217 currency code
 * @param locale - User locale (en, zh, fr, sw, pt, ar)
 */
export function formatPrice(
  amount: number,
  currency: string,
  locale: string = "en"
): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale;
  const majorUnits = amount / 100;

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: hasMinorUnits(currency) ? 2 : 0,
      maximumFractionDigits: hasMinorUnits(currency) ? 2 : 0,
    }).format(majorUnits);
  } catch {
    // Fallback for unsupported currency codes
    return `${currency} ${majorUnits.toFixed(hasMinorUnits(currency) ? 2 : 0)}`;
  }
}

/**
 * Format a price with the currency code prefixed before the number,
 * e.g. "USD 8,500.00" or "RWF 11,475,000". Used in card listings where
 * we want the currency to be unambiguous to international buyers
 * regardless of the locale's default symbol.
 */
export function formatPriceWithCode(
  amount: number,
  currency: string,
  locale: string = "en"
): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale;
  const majorUnits = amount / 100;
  const fractionDigits = hasMinorUnits(currency) ? 2 : 0;

  try {
    const number = new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(majorUnits);
    return `${currency} ${number}`;
  } catch {
    return `${currency} ${majorUnits.toFixed(fractionDigits)}`;
  }
}

/**
 * Synchronous, non-async currency conversion using a static rate table.
 * Use this on the client side where we don't have access to live rates.
 * For accurate conversion at checkout, use the async converter on the server.
 */
const STATIC_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.24,
  KES: 129.5,
  GHS: 15.8,
  NGN: 1580.0,
  ZAR: 18.2,
  TZS: 2680.0,
  UGX: 3750.0,
  RWF: 1350.0,
  ETB: 57.5,
  EGP: 30.9,
  MAD: 10.1,
  XOF: 605.0,
  XAF: 605.0,
};

export function convertSync(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = STATIC_USD_RATES[fromCurrency] ?? 1;
  const toRate = STATIC_USD_RATES[toCurrency] ?? 1;
  return Math.round((amount * toRate) / fromRate);
}

/**
 * One-shot helper: convert minor-unit amount from baseCurrency to
 * displayCurrency and format as "CODE 1,234.56".
 */
export function formatConvertedPriceWithCode(
  amount: number,
  baseCurrency: string,
  displayCurrency: string,
  locale: string = "en"
): string {
  const converted = convertSync(amount, baseCurrency, displayCurrency);
  return formatPriceWithCode(converted, displayCurrency, locale);
}

/**
 * Format a price with conversion note.
 * e.g. "$1,200.00 (~KSh 155,400)"
 */
export function formatPriceWithConversion(
  amount: number,
  baseCurrency: string,
  displayCurrency: string,
  convertedAmount: number,
  locale: string = "en"
): string {
  const base = formatPrice(amount, baseCurrency, locale);
  if (baseCurrency === displayCurrency) return base;

  const converted = formatPrice(convertedAmount, displayCurrency, locale);
  return `${base} (~${converted})`;
}

/**
 * Format a compact price for cards/listings.
 * e.g. "$1.2K", "KSh 155K"
 */
export function formatCompactPrice(
  amount: number,
  currency: string,
  locale: string = "en"
): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale;
  const majorUnits = amount / 100;

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(majorUnits);
  } catch {
    return formatPrice(amount, currency, locale);
  }
}

/**
 * Format a price range.
 * e.g. "$10.00 – $25.00"
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currency: string,
  locale: string = "en"
): string {
  const min = formatPrice(minAmount, currency, locale);
  const max = formatPrice(maxAmount, currency, locale);
  return `${min} – ${max}`;
}

/**
 * Whether a currency uses minor units (cents).
 * Most African/Asian currencies use minor units, some don't (JPY, KRW).
 */
function hasMinorUnits(currency: string): boolean {
  const noMinorUnits = new Set(["JPY", "KRW", "VND", "CLP", "ISK"]);
  return !noMinorUnits.has(currency);
}
