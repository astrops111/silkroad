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
  rate: {
    baseRate: number;
    perKgRate: number;
    perCbmRate: number;
    minCharge: number;
    freeShippingThreshold: number | null;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    currency: string;
  }
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
    };
  }

  // Base cost
  const baseCost = rate.baseRate;

  // Weight charge
  const weightCharge = Math.round(request.totalWeightKg * rate.perKgRate);

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
    estimatedDaysMin: rate.estimatedDaysMin,
    estimatedDaysMax: rate.estimatedDaysMax,
    breakdown: parts.join(" + ") + ` = ${totalCost} ${rate.currency}`,
  };
}
