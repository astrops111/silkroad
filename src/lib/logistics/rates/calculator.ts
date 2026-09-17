export interface ShippingCostRequest {
  originZoneId: string;
  destinationZoneId: string;
  shippingMethod: string;
  totalWeightKg: number;
  totalVolumeCbm?: number;
  subtotal: number; // For free shipping threshold check
  currency: string;
  isFragile?: boolean;
  requiresColdChain?: boolean;
  isHazardous?: boolean;
}

export interface ShippingCostResult {
  baseCost: number;
  weightCharge: number;
  volumeCharge: number;
  surcharges: { name: string; amount: number }[];
  totalCost: number;
  currency: string;
  isFreeShipping: boolean;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  breakdown: string;
  /** Weight actually billed — request weight floored to the carrier minimum. */
  chargeableWeightKg: number;
  /** Repack cartons the rebox fee was charged on (0 when the rate has none). */
  cartonCount: number;
}

/**
 * A rate card. The first five fields are the original zone-rate shape; the
 * optional ones below describe air-freight-style lanes (Taiwan) that bill a
 * minimum chargeable weight plus fixed per-carton and per-shipment fees.
 * Omitting them reproduces the original behaviour exactly.
 */
export interface ShippingRate {
  baseRate: number;
  perKgRate: number;
  perCbmRate: number;
  minCharge: number;
  freeShippingThreshold: number | null;
  /** Carrier minimum billable weight, e.g. air freight's MIN 100 KG. */
  minChargeableKg?: number;
  /** Round chargeable weight up to a whole kg before pricing (air freight). */
  roundUpChargeableKg?: boolean;
  /** Consolidation repack fee, per carton. Requires cartonVolumeCbm. */
  reboxFeePerCarton?: number;
  /** Volume of one repack carton, used to derive the carton count. */
  cartonVolumeCbm?: number;
  /** Flat customs-declaration charge, once per shipment. */
  documentationFee?: number;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  currency: string;
}

// Surcharge rates
const FRAGILE_SURCHARGE_RATE = 0.15;     // +15% for fragile goods
const COLD_CHAIN_SURCHARGE_RATE = 0.35;  // +35% for cold chain
const HAZARDOUS_SURCHARGE_RATE = 0.25;   // +25% for hazardous

/**
 * Calculate shipping cost based on zone-to-zone rates
 * In production, this reads from the shipping_rates database table.
 * This is the calculation logic that runs after the rate lookup.
 */
export function calculateShippingCost(
  request: ShippingCostRequest,
  rate: ShippingRate
): ShippingCostResult {
  // Free shipping check
  if (
    rate.freeShippingThreshold &&
    request.subtotal >= rate.freeShippingThreshold
  ) {
    return {
      baseCost: 0,
      weightCharge: 0,
      volumeCharge: 0,
      surcharges: [],
      totalCost: 0,
      currency: rate.currency,
      isFreeShipping: true,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      breakdown: "Free shipping (order above threshold)",
      chargeableWeightKg: 0,
      cartonCount: 0,
    };
  }

  // Base cost
  const baseCost = rate.baseRate;

  // Chargeable weight — the caller passes max(actual, volumetric); the rate
  // card can floor it to a carrier minimum (air freight bills MIN 100 KG even
  // on a lighter shipment) and round it up to a whole kg.
  let chargeableWeightKg = Math.max(
    request.totalWeightKg,
    rate.minChargeableKg ?? 0
  );
  if (rate.roundUpChargeableKg) {
    chargeableWeightKg = Math.ceil(chargeableWeightKg);
  }

  // Weight charge
  const weightCharge = Math.round(chargeableWeightKg * rate.perKgRate);

  // Volume charge (for freight — charged by cubic meter)
  const volumeCharge = request.totalVolumeCbm
    ? Math.round(request.totalVolumeCbm * rate.perCbmRate)
    : 0;

  let subtotalCost = baseCost + weightCharge + volumeCharge;

  // Apply minimum charge
  subtotalCost = Math.max(subtotalCost, rate.minCharge);

  // Surcharges
  const surcharges: { name: string; amount: number }[] = [];

  if (request.isFragile) {
    const amount = Math.round(subtotalCost * FRAGILE_SURCHARGE_RATE);
    surcharges.push({ name: "Fragile handling", amount });
  }

  if (request.requiresColdChain) {
    const amount = Math.round(subtotalCost * COLD_CHAIN_SURCHARGE_RATE);
    surcharges.push({ name: "Cold chain", amount });
  }

  if (request.isHazardous) {
    const amount = Math.round(subtotalCost * HAZARDOUS_SURCHARGE_RATE);
    surcharges.push({ name: "Hazardous goods", amount });
  }

  // Fixed pass-through fees. Added after the percentage surcharges above so
  // those percentages apply to the freight only, never to the flat fees.

  // Repack into the consolidator's own cartons, charged per carton. The count
  // comes from cargo volume, so it needs product dimensions to be non-zero.
  let cartonCount = 0;
  if (rate.reboxFeePerCarton && rate.cartonVolumeCbm && request.totalVolumeCbm) {
    cartonCount = Math.ceil(request.totalVolumeCbm / rate.cartonVolumeCbm);
    surcharges.push({
      name: "Rebox",
      amount: cartonCount * rate.reboxFeePerCarton,
    });
  }

  if (rate.documentationFee) {
    surcharges.push({ name: "Documentation", amount: rate.documentationFee });
  }

  const totalSurcharges = surcharges.reduce((sum, s) => sum + s.amount, 0);
  const totalCost = subtotalCost + totalSurcharges;

  const parts = [`Base: ${baseCost}`];
  if (weightCharge > 0) parts.push(`Weight: ${weightCharge}`);
  if (volumeCharge > 0) parts.push(`Volume: ${volumeCharge}`);
  surcharges.forEach((s) => parts.push(`${s.name}: ${s.amount}`));

  return {
    baseCost,
    weightCharge,
    volumeCharge,
    surcharges,
    totalCost,
    currency: rate.currency,
    isFreeShipping: false,
    chargeableWeightKg,
    cartonCount,
    estimatedDaysMin: rate.estimatedDaysMin,
    estimatedDaysMax: rate.estimatedDaysMax,
    breakdown: parts.join(" + ") + ` = ${totalCost} ${rate.currency}`,
  };
}
