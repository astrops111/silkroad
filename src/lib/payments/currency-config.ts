/**
 * Currency configuration — decimals, symbols, and formatting rules
 * Critical: zero-decimal currencies (UGX, TZS, RWF, XOF, etc.) must NOT be divided by 100
 */

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number;       // 0 = no minor units, 2 = cents/pesewas
  symbolPosition: "before" | "after";
  thousandsSeparator: string;
  decimalSeparator: string;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  // === ZERO-DECIMAL currencies (store as whole units) ===
  UGX: { code: "UGX", name: "Uganda Shilling", symbol: "USh", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  TZS: { code: "TZS", name: "Tanzania Shilling", symbol: "TSh", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  RWF: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  GNF: { code: "GNF", name: "Guinean Franc", symbol: "FG", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  XOF: { code: "XOF", name: "CFA Franc BCEAO", symbol: "CFA", decimals: 0, symbolPosition: "after", thousandsSeparator: " ", decimalSeparator: "," },
  XAF: { code: "XAF", name: "CFA Franc BEAC", symbol: "FCFA", decimals: 0, symbolPosition: "after", thousandsSeparator: " ", decimalSeparator: "," },
  CDF: { code: "CDF", name: "Congolese Franc", symbol: "FC", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  MWK: { code: "MWK", name: "Malawian Kwacha", symbol: "MK", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  MGA: { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", decimals: 0, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },

  // === TWO-DECIMAL currencies (store as minor units / cents) ===
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  EUR: { code: "EUR", name: "Euro", symbol: "\u20AC", decimals: 2, symbolPosition: "before", thousandsSeparator: ".", decimalSeparator: "," },
  GBP: { code: "GBP", name: "British Pound", symbol: "\u00A3", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  GHS: { code: "GHS", name: "Ghana Cedi", symbol: "GH\u20B5", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  KES: { code: "KES", name: "Kenya Shilling", symbol: "KSh", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  EGP: { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  MAD: { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", decimals: 2, symbolPosition: "after", thousandsSeparator: ".", decimalSeparator: "," },
  ETB: { code: "ETB", name: "Ethiopian Birr", symbol: "Br", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  ZMW: { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  MZN: { code: "MZN", name: "Mozambican Metical", symbol: "MT", decimals: 2, symbolPosition: "before", thousandsSeparator: ".", decimalSeparator: "," },
  TWD: { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  AOA: { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", decimals: 2, symbolPosition: "before", thousandsSeparator: ".", decimalSeparator: "," },
  BWP: { code: "BWP", name: "Botswana Pula", symbol: "P", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
  NAD: { code: "NAD", name: "Namibian Dollar", symbol: "N$", decimals: 2, symbolPosition: "before", thousandsSeparator: ",", decimalSeparator: "." },
};

/**
 * Get currency config, defaulting to 2 decimals if unknown
 */
export function getCurrencyConfig(code: string): CurrencyConfig {
  return CURRENCY_CONFIGS[code] || {
    code,
    name: code,
    symbol: code,
    decimals: 2,
    symbolPosition: "before" as const,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  };
}

/**
 * Check if a currency uses zero decimal places (no minor units)
 */
export function isZeroDecimal(code: string): boolean {
  return getCurrencyConfig(code).decimals === 0;
}

/**
 * Convert a stored BIGINT amount to a human-readable display value
 *
 * For 2-decimal currencies: stored 50000 → display 500.00 (divide by 100)
 * For 0-decimal currencies: stored 1900000 → display 1,900,000 (no division)
 */
export function toDisplayAmount(storedAmount: number, currencyCode: string): number {
  const config = getCurrencyConfig(currencyCode);
  if (config.decimals === 0) return storedAmount;
  return storedAmount / Math.pow(10, config.decimals);
}

/**
 * Convert a human-entered amount to BIGINT for storage
 *
 * For 2-decimal currencies: input 500.00 → store 50000 (multiply by 100)
 * For 0-decimal currencies: input 1900000 → store 1900000 (no multiplication)
 */
export function toStoredAmount(displayAmount: number, currencyCode: string): number {
  const config = getCurrencyConfig(currencyCode);
  if (config.decimals === 0) return Math.round(displayAmount);
  return Math.round(displayAmount * Math.pow(10, config.decimals));
}

/**
 * Format a stored BIGINT amount for display with currency symbol
 *
 * formatMoney(50000, "USD")  → "$500.00"
 * formatMoney(7750, "GHS")   → "GH₵77.50"
 * formatMoney(1900000, "UGX") → "USh 1,900,000"
 * formatMoney(7500, "XOF")   → "7,500 CFA"
 */
export function formatMoney(storedAmount: number, currencyCode: string): string {
  const config = getCurrencyConfig(currencyCode);
  const displayValue = toDisplayAmount(storedAmount, currencyCode);

  // Format the number
  const parts = displayValue.toFixed(config.decimals).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  const formatted = config.decimals > 0 && parts[1]
    ? `${intPart}${config.decimalSeparator}${parts[1]}`
    : intPart;

  // Apply symbol position
  if (config.symbolPosition === "after") {
    return `${formatted} ${config.symbol}`;
  }
  return `${config.symbol}${formatted}`;
}

/**
 * Format for compact display (K, M suffixes)
 * formatMoneyCompact(125000000, "UGX") → "USh 125M"
 * formatMoneyCompact(50000, "USD") → "$500"
 */
export function formatMoneyCompact(storedAmount: number, currencyCode: string): string {
  const config = getCurrencyConfig(currencyCode);
  const displayValue = toDisplayAmount(storedAmount, currencyCode);

  let formatted: string;
  if (displayValue >= 1_000_000) {
    formatted = `${(displayValue / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  } else if (displayValue >= 1_000) {
    formatted = `${(displayValue / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    formatted = displayValue.toFixed(config.decimals > 0 ? 2 : 0);
  }

  if (config.symbolPosition === "after") {
    return `${formatted} ${config.symbol}`;
  }
  return `${config.symbol}${formatted}`;
}
