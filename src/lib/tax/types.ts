export interface TaxLineItem {
  name: string;
  rate: number;
  amount: number;
}

export interface TaxBreakdown {
  subtotal: number;
  taxes: TaxLineItem[];
  totalTax: number;
  effectiveRate: number;
  grandTotal: number;
}

export interface WithholdingTaxResult {
  rate: number;
  amount: number;
  type: "goods" | "services";
  description: string;
}

export interface TaxCalculationRequest {
  subtotal: number;
  currency: string;
  supplierCountry: string;
  buyerCountry: string;
  items?: { name: string; amount: number; hsCode?: string; category?: string }[];
  isCrossBorder?: boolean;
  buyerTaxExempt?: boolean;
}

export interface TaxCalculationResult {
  breakdown: TaxBreakdown;
  withholdingTax?: WithholdingTaxResult;
  customsDuty?: number;
  isCrossBorder: boolean;
  tradeZone?: string;
  notes: string[];
}

export interface CountryTaxConfig {
  countryCode: string;
  vatRate: number;
  vatName: string;
  additionalTaxes: { name: string; rate: number }[];
  isInclusive: boolean; // true = tax-inclusive pricing (rare in Africa)
  whtGoods: number;
  whtServices: number;
  whtNonResident: number;
  threshold?: { amount: number; currency: string };
  eInvoiceRequired: boolean;
  eInvoiceSystem?: string;
}
