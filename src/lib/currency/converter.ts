/**
 * Multi-currency converter for SilkRoad Africa.
 * Supports fetching live rates and caching them.
 * Fallback to static rates when API is unavailable.
 */

// Static fallback rates (vs USD) — updated periodically
const STATIC_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.24,
  KES: 129.50,
  GHS: 15.80,
  NGN: 1580.00,
  ZAR: 18.20,
  TZS: 2680.00,
  UGX: 3750.00,
  RWF: 1350.00,
  ETB: 57.50,
  EGP: 30.90,
  MAD: 10.10,
  XOF: 605.00,
  XAF: 605.00,
  MWK: 1720.00,
  ZMW: 26.80,
  CDF: 2780.00,
};

let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchLiveRates(): Promise<Record<string, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) return STATIC_RATES;

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return STATIC_RATES;
    const data = await response.json();

    if (data.result === "success" && data.conversion_rates) {
      return data.conversion_rates;
    }
    return STATIC_RATES;
  } catch {
    return STATIC_RATES;
  }
}

export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  cachedRates = await fetchLiveRates();
  cacheTimestamp = now;
  return cachedRates;
}

/**
 * Convert an amount from one currency to another.
 * Amount is in minor units (cents).
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ amount: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { amount, rate: 1 };
  }

  const rates = await getRates();
  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;

  const rate = toRate / fromRate;
  const converted = Math.round(amount * rate);

  return { amount: converted, rate };
}

/**
 * Get the exchange rate between two currencies.
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  const rates = await getRates();
  return (rates[toCurrency] ?? 1) / (rates[fromCurrency] ?? 1);
}

/**
 * Get all supported currencies with their rates vs USD.
 */
export function getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
  return [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "\u20AC" },
    { code: "GBP", name: "British Pound", symbol: "\u00A3" },
    { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "GH\u20B5" },
    { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
    { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
    { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
    { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
    { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3" },
    { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
    { code: "XOF", name: "West African CFA", symbol: "CFA" },
    { code: "XAF", name: "Central African CFA", symbol: "FCFA" },
  ];
}
