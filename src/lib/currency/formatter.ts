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
