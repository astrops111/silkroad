import type {
  TaxCalculationRequest,
  TaxCalculationResult,
  WithholdingTaxResult,
} from "./types";
import {
  calculateAfricanTax,
  getWithholdingTaxRate,
  getCountryTaxConfig,
} from "./regions/africa";
import { calculateChinaTax, getChinaVatCategory } from "./regions/china";
import { getSharedTradeZones, getTradeZonePreference } from "./trade-zones";

/**
 * Main tax calculator — determines region and applies correct tax rules
 */
export function calculateOrderTax(
  request: TaxCalculationRequest
): TaxCalculationResult {
  const {
    subtotal,
    supplierCountry,
    buyerCountry,
    items,
    buyerTaxExempt,
  } = request;

  const notes: string[] = [];
  const isCrossBorder = supplierCountry !== buyerCountry;

  // Tax-exempt buyer
  if (buyerTaxExempt) {
    notes.push("Buyer has valid tax exemption certificate");
    return {
      breakdown: {
        subtotal,
        taxes: [],
        totalTax: 0,
        effectiveRate: 0,
        grandTotal: subtotal,
      },
      isCrossBorder,
      notes,
    };
  }

  // Cross-border: exports are generally zero-rated from supplier side
  // Import VAT is charged on the buyer's side
  if (isCrossBorder) {
    return calculateCrossBorderTax(request, notes);
  }

  // Domestic transaction
  return calculateDomesticTax(request, notes);
}

function calculateDomesticTax(
  request: TaxCalculationRequest,
  notes: string[]
): TaxCalculationResult {
  const { subtotal, buyerCountry } = request;

  // China
  if (buyerCountry === "CN") {
    const hsCode = request.items?.[0]?.hsCode;
    const category = getChinaVatCategory(hsCode);
    const breakdown = calculateChinaTax(subtotal, category);
    notes.push(`China domestic: ${category} rate applied`);

    return { breakdown, isCrossBorder: false, notes };
  }

  // African country
  const config = getCountryTaxConfig(buyerCountry);
  if (config) {
    const breakdown = calculateAfricanTax(subtotal, buyerCountry);
    notes.push(`${buyerCountry} domestic: ${config.vatName} ${(config.vatRate * 100).toFixed(1)}%`);
    if (config.additionalTaxes.length > 0) {
      const addl = config.additionalTaxes.map((t) => t.name).join(", ");
      notes.push(`Additional taxes: ${addl}`);
    }
    return { breakdown, isCrossBorder: false, notes };
  }

  // Unknown country — zero tax with warning
  notes.push(`No tax configuration for country: ${buyerCountry}`);
  return {
    breakdown: {
      subtotal,
      taxes: [],
      totalTax: 0,
      effectiveRate: 0,
      grandTotal: subtotal,
    },
    isCrossBorder: false,
    notes,
  };
}

function calculateCrossBorderTax(
  request: TaxCalculationRequest,
  notes: string[]
): TaxCalculationResult {
  const { subtotal, supplierCountry, buyerCountry } = request;

  // Check trade zones for preferential treatment
  const tradeZones = getSharedTradeZones(supplierCountry, buyerCountry);
  let tradeZoneName: string | undefined;
  let dutyReduction = 0;

  if (tradeZones.length > 0) {
    // Use the most favorable zone
    const bestZone = tradeZones.reduce((best, zone) => {
      const pref = getTradeZonePreference(zone);
      return pref > getTradeZonePreference(best) ? zone : best;
    });
    dutyReduction = getTradeZonePreference(bestZone);
    tradeZoneName = bestZone ?? undefined;
    notes.push(`Trade zone: ${bestZone} — ${(dutyReduction * 100).toFixed(0)}% duty reduction`);
  }

  // Export side: zero-rated (supplier doesn't charge VAT)
  notes.push(`Export from ${supplierCountry}: zero-rated`);

  // Import side: buyer's country VAT applies
  const buyerConfig = getCountryTaxConfig(buyerCountry);
  let importVat = 0;
  const taxes: { name: string; rate: number; amount: number }[] = [];

  if (buyerConfig) {
    importVat = Math.round(subtotal * buyerConfig.vatRate);
    taxes.push({
      name: `Import ${buyerConfig.vatName}`,
      rate: buyerConfig.vatRate,
      amount: importVat,
    });

    // Additional taxes on imports
    for (const addlTax of buyerConfig.additionalTaxes) {
      const amount = Math.round(subtotal * addlTax.rate);
      taxes.push({ name: `Import ${addlTax.name}`, rate: addlTax.rate, amount });
    }

    notes.push(`Import ${buyerConfig.vatName} in ${buyerCountry}: ${(buyerConfig.vatRate * 100).toFixed(1)}%`);
  }

  // Withholding tax
  const whtRate = getWithholdingTaxRate(buyerCountry, supplierCountry, "goods");
  let withholdingTax: WithholdingTaxResult | undefined;
  if (whtRate > 0) {
    withholdingTax = {
      rate: whtRate,
      amount: Math.round(subtotal * whtRate),
      type: "goods",
      description: `WHT ${(whtRate * 100).toFixed(1)}% deducted at source by ${buyerCountry}`,
    };
    notes.push(withholdingTax.description);
  }

  // Customs duty estimate (simplified — real implementation uses HS code lookup)
  const baseDutyRate = 0.1; // Default 10% estimate
  const effectiveDutyRate = baseDutyRate * (1 - dutyReduction);
  const customsDuty = Math.round(subtotal * effectiveDutyRate);
  if (customsDuty > 0) {
    notes.push(`Estimated customs duty: ${(effectiveDutyRate * 100).toFixed(1)}%`);
  }

  const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0);

  return {
    breakdown: {
      subtotal,
      taxes,
      totalTax,
      effectiveRate: subtotal > 0 ? Math.round((totalTax / subtotal) * 10000) / 10000 : 0,
      grandTotal: subtotal + totalTax + customsDuty,
    },
    withholdingTax,
    customsDuty,
    isCrossBorder: true,
    tradeZone: tradeZoneName,
    notes,
  };
}

/**
 * Calculate commission tax (platform charges supplier)
 */
export function calculateCommissionTax(
  commissionAmount: number,
  platformCountry: string
): { taxAmount: number; taxRate: number } {
  const config = getCountryTaxConfig(platformCountry);
  if (!config) return { taxAmount: 0, taxRate: 0 };

  const taxRate = config.vatRate;
  const taxAmount = Math.round(commissionAmount * taxRate);
  return { taxAmount, taxRate };
}
