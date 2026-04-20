import type { TaxBreakdown } from "../types";

// China VAT rates by category
const CHINA_VAT_RATES = {
  goods_general: 0.13,    // General goods
  goods_reduced: 0.09,    // Transport, agriculture, utilities, newspapers
  services: 0.06,         // Modern services, financial, digital
  small_scale: 0.03,      // Small-scale taxpayers
  export: 0,              // Zero-rated exports
} as const;

type ChinaVatCategory = keyof typeof CHINA_VAT_RATES;

/**
 * Calculate China VAT (增值税)
 * China uses tax-exclusive pricing: tax is added on top
 */
export function calculateChinaTax(
  subtotal: number,
  category: ChinaVatCategory = "goods_general"
): TaxBreakdown {
  const rate = CHINA_VAT_RATES[category];
  const vatAmount = Math.round(subtotal * rate);

  return {
    subtotal,
    taxes: [
      { name: "增值税 (VAT)", rate, amount: vatAmount },
    ],
    totalTax: vatAmount,
    effectiveRate: rate,
    grandTotal: subtotal + vatAmount,
  };
}

/**
 * Determine China VAT category from HS code or product type
 */
export function getChinaVatCategory(hsCode?: string): ChinaVatCategory {
  if (!hsCode) return "goods_general";
  const chapter = parseInt(hsCode.substring(0, 2), 10);

  // Agriculture, food, feed (chapters 01-24)
  if (chapter >= 1 && chapter <= 24) return "goods_reduced";
  // Newspapers, books (chapter 49)
  if (chapter === 49) return "goods_reduced";
  // General goods
  return "goods_general";
}

/**
 * China withholding tax for non-resident suppliers
 */
export function getChinaWithholdingRate(
  type: "goods" | "services" | "royalties"
): number {
  switch (type) {
    case "goods": return 0;       // No WHT on goods
    case "services": return 0.1;  // 10% on service fees
    case "royalties": return 0.1; // 10% on royalties
    default: return 0;
  }
}
