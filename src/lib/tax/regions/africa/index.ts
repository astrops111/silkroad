import type { TaxBreakdown, CountryTaxConfig } from "../../types";

// Complete African tax configuration — all major countries
export const AFRICA_TAX_CONFIG: Record<string, CountryTaxConfig> = {
  // ============ WEST AFRICA ============
  NG: {
    countryCode: "NG",
    vatRate: 0.075,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.1,
    whtServices: 0.1,
    whtNonResident: 0.1,
    threshold: { amount: 25_000_000, currency: "NGN" },
    eInvoiceRequired: false,
    eInvoiceSystem: "FIRS",
  },
  GH: {
    countryCode: "GH",
    vatRate: 0.15,
    vatName: "VAT",
    additionalTaxes: [
      { name: "NHIL", rate: 0.025 },
      { name: "GETFund Levy", rate: 0.025 },
      { name: "COVID-19 Levy", rate: 0.01 },
      { name: "Emissions Levy", rate: 0.01 },
    ],
    isInclusive: false,
    whtGoods: 0.03,
    whtServices: 0.15,
    whtNonResident: 0.15,
    threshold: { amount: 200_000, currency: "GHS" },
    eInvoiceRequired: false,
  },
  SN: {
    countryCode: "SN",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.2,
    whtNonResident: 0.2,
    eInvoiceRequired: false,
  },
  CI: {
    countryCode: "CI",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [{ name: "AIRSI", rate: 0.015 }],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.2,
    whtNonResident: 0.2,
    eInvoiceRequired: false,
  },
  CM: {
    countryCode: "CM",
    vatRate: 0.175,
    vatName: "TVA",
    additionalTaxes: [{ name: "Communal Surtax", rate: 0.0175 }], // 10% of 17.5% = 1.75%
    isInclusive: false,
    whtGoods: 0.055,
    whtServices: 0.055,
    whtNonResident: 0.155,
    threshold: { amount: 50_000_000, currency: "XAF" },
    eInvoiceRequired: false,
  },
  ML: {
    countryCode: "ML",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  BF: {
    countryCode: "BF",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.2,
    whtNonResident: 0.2,
    eInvoiceRequired: false,
  },
  GN: {
    countryCode: "GN",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  BJ: {
    countryCode: "BJ",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  TG: {
    countryCode: "TG",
    vatRate: 0.18,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  NE: {
    countryCode: "NE",
    vatRate: 0.19,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.1,
    whtNonResident: 0.1,
    eInvoiceRequired: false,
  },
  SL: {
    countryCode: "SL",
    vatRate: 0.15,
    vatName: "GST",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.055,
    whtServices: 0.055,
    whtNonResident: 0.1,
    eInvoiceRequired: false,
  },
  LR: {
    countryCode: "LR",
    vatRate: 0.1,
    vatName: "GST",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.06,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },

  // ============ EAST AFRICA ============
  KE: {
    countryCode: "KE",
    vatRate: 0.16,
    vatName: "VAT",
    additionalTaxes: [{ name: "Digital Service Tax", rate: 0.015 }],
    isInclusive: false,
    whtGoods: 0.03,
    whtServices: 0.2,
    whtNonResident: 0.2,
    threshold: { amount: 5_000_000, currency: "KES" },
    eInvoiceRequired: true,
    eInvoiceSystem: "ETIMS",
  },
  TZ: {
    countryCode: "TZ",
    vatRate: 0.18,
    vatName: "VAT",
    additionalTaxes: [{ name: "Skills Dev Levy", rate: 0.045 }],
    isInclusive: false,
    whtGoods: 0.02,
    whtServices: 0.15,
    whtNonResident: 0.15,
    threshold: { amount: 200_000_000, currency: "TZS" },
    eInvoiceRequired: false,
    eInvoiceSystem: "EFD",
  },
  UG: {
    countryCode: "UG",
    vatRate: 0.18,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.06,
    whtServices: 0.15,
    whtNonResident: 0.15,
    threshold: { amount: 150_000_000, currency: "UGX" },
    eInvoiceRequired: true,
    eInvoiceSystem: "EFRIS",
  },
  RW: {
    countryCode: "RW",
    vatRate: 0.18,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.03,
    whtServices: 0.15,
    whtNonResident: 0.15,
    threshold: { amount: 20_000_000, currency: "RWF" },
    eInvoiceRequired: true,
    eInvoiceSystem: "EBM",
  },
  ET: {
    countryCode: "ET",
    vatRate: 0.15,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.02,
    whtServices: 0.02,
    whtNonResident: 0.1,
    threshold: { amount: 1_000_000, currency: "ETB" },
    eInvoiceRequired: false,
  },
  CD: {
    countryCode: "CD",
    vatRate: 0.16,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.14,
    whtNonResident: 0.14,
    eInvoiceRequired: false,
  },

  // ============ SOUTHERN AFRICA ============
  ZA: {
    countryCode: "ZA",
    vatRate: 0.15,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0,
    whtServices: 0.15,
    whtNonResident: 0.15,
    threshold: { amount: 1_000_000, currency: "ZAR" },
    eInvoiceRequired: false,
    eInvoiceSystem: "SARS",
  },
  MZ: {
    countryCode: "MZ",
    vatRate: 0.16,
    vatName: "IVA",
    additionalTaxes: [{ name: "Municipal Tax", rate: 0.01 }],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.2,
    whtNonResident: 0.2,
    eInvoiceRequired: false,
  },
  ZM: {
    countryCode: "ZM",
    vatRate: 0.16,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.06,
    whtServices: 0.15,
    whtNonResident: 0.2,
    threshold: { amount: 800_000, currency: "ZMW" },
    eInvoiceRequired: false,
  },
  ZW: {
    countryCode: "ZW",
    vatRate: 0.15,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.1,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  MW: {
    countryCode: "MW",
    vatRate: 0.165,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.1,
    whtNonResident: 0.15,
    threshold: { amount: 30_000_000, currency: "MWK" },
    eInvoiceRequired: false,
  },
  BW: {
    countryCode: "BW",
    vatRate: 0.14,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  NA: {
    countryCode: "NA",
    vatRate: 0.15,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0,
    whtServices: 0.1,
    whtNonResident: 0.25,
    eInvoiceRequired: false,
  },
  AO: {
    countryCode: "AO",
    vatRate: 0.14,
    vatName: "IVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.065,
    whtServices: 0.065,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  MG: {
    countryCode: "MG",
    vatRate: 0.2,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.1,
    whtNonResident: 0.1,
    eInvoiceRequired: false,
  },

  // ============ NORTH AFRICA ============
  EG: {
    countryCode: "EG",
    vatRate: 0.14,
    vatName: "VAT",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0,
    whtServices: 0.2,
    whtNonResident: 0.2,
    threshold: { amount: 500_000, currency: "EGP" },
    eInvoiceRequired: true,
    eInvoiceSystem: "ETA",
  },
  MA: {
    countryCode: "MA",
    vatRate: 0.2,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0,
    whtServices: 0.1,
    whtNonResident: 0.15,
    threshold: { amount: 500_000, currency: "MAD" },
    eInvoiceRequired: false,
  },
  TN: {
    countryCode: "TN",
    vatRate: 0.19,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.15,
    whtNonResident: 0.15,
    eInvoiceRequired: false,
  },
  DZ: {
    countryCode: "DZ",
    vatRate: 0.19,
    vatName: "TVA",
    additionalTaxes: [],
    isInclusive: false,
    whtGoods: 0.05,
    whtServices: 0.24,
    whtNonResident: 0.24,
    eInvoiceRequired: false,
  },
};

/**
 * Calculate domestic VAT + additional taxes for an African country
 */
export function calculateAfricanTax(
  subtotal: number,
  countryCode: string
): TaxBreakdown {
  const config = AFRICA_TAX_CONFIG[countryCode];
  if (!config) {
    // Unknown country — return zero tax with warning
    return {
      subtotal,
      taxes: [],
      totalTax: 0,
      effectiveRate: 0,
      grandTotal: subtotal,
    };
  }

  const taxes: { name: string; rate: number; amount: number }[] = [];

  // Primary VAT/GST/TVA
  const vatAmount = Math.round(subtotal * config.vatRate);
  taxes.push({ name: config.vatName, rate: config.vatRate, amount: vatAmount });

  // Additional taxes (NHIL, GETFL, levies, etc.)
  for (const addlTax of config.additionalTaxes) {
    const amount = Math.round(subtotal * addlTax.rate);
    taxes.push({ name: addlTax.name, rate: addlTax.rate, amount });
  }

  const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0);
  const effectiveRate = subtotal > 0 ? totalTax / subtotal : 0;

  return {
    subtotal,
    taxes,
    totalTax,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    grandTotal: subtotal + totalTax,
  };
}

/**
 * Get withholding tax rate for cross-border B2B transaction
 */
export function getWithholdingTaxRate(
  buyerCountry: string,
  supplierCountry: string,
  type: "goods" | "services"
): number {
  if (buyerCountry === supplierCountry) return 0;

  const config = AFRICA_TAX_CONFIG[buyerCountry];
  if (!config) return 0;

  // Non-resident WHT applies when supplier is foreign
  if (type === "goods") return config.whtGoods;
  return config.whtNonResident;
}

/**
 * Get tax config for a country
 */
export function getCountryTaxConfig(
  countryCode: string
): CountryTaxConfig | undefined {
  return AFRICA_TAX_CONFIG[countryCode];
}
