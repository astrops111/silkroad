// Platform-wide shipping group minimums (minor units / cents)
export const PLATFORM_MIN_GROUP_ORDER_VALUE = 30000; // $300.00 minimum per shipping group

// Maps the free-text shipping_mode field on products to the shipping_method DB enum.
// Unrecognised values fall back to platform_standard.
const MODE_TO_METHOD: Record<string, string> = {
  sea_lcl:      "platform_freight",
  sea_fcl:      "platform_freight",
  ocean_lcl:    "platform_freight",
  ocean_fcl:    "platform_freight",
  air:          "platform_express",
  air_express:  "platform_express",
  cold_chain:   "platform_cold_chain",
  refrigerated: "platform_cold_chain",
};

export function shippingModeToMethod(mode: string | null | undefined): string {
  return (mode && MODE_TO_METHOD[mode.toLowerCase()]) ?? "platform_standard";
}

// Stable key identifying a shipping group within an order
export function shippingGroupKey(supplierId: string, shippingMode: string | null | undefined): string {
  return `${supplierId}::${shippingMode ?? "default"}`;
}

// Volumetric-weight conversion factors (kg per CBM) by shipping method.
// Sea uses the W/M (weight-or-measurement) ton: 1 CBM = 1,000 kg equivalent.
// Air uses the IATA divisor of 6,000 cm³/kg → ~167 kg/CBM.
const VOL_KG_PER_CBM: Record<string, number> = {
  platform_freight:    1000,
  platform_express:     167,
  platform_cold_chain:  167,
  platform_standard:    167,
};

/**
 * Returns the chargeable weight for a shipment group — the greater of actual
 * weight and volumetric (dimensional) weight. Carriers bill whichever is higher.
 */
export function chargeableWeightKg(
  totalActualKg: number,
  totalVolumeCbm: number,
  shippingMode?: string | null
): number {
  const method = shippingModeToMethod(shippingMode);
  const kgPerCbm = VOL_KG_PER_CBM[method] ?? 167;
  return Math.max(totalActualKg, totalVolumeCbm * kgPerCbm);
}

const MODE_LABELS: Record<string, string> = {
  sea_lcl:      "Sea freight · LCL",
  sea_fcl:      "Sea freight · FCL",
  ocean_lcl:    "Sea freight · LCL",
  ocean_fcl:    "Sea freight · FCL",
  air:          "Air freight",
  air_express:  "Air express",
  cold_chain:   "Cold chain",
  refrigerated: "Refrigerated",
};

export function shippingModeLabel(mode: string | undefined): string | null {
  if (!mode) return null;
  return MODE_LABELS[mode.toLowerCase()] ?? mode;
}

/**
 * Derives CBM from a product's dimensions_cm JSONB field.
 * Accepts {l,w,h} or {length,width,height} shapes (values in cm).
 * Returns undefined when dimensions are missing or incomplete.
 */
export function volumeCbmFromDimensions(dimensionsCm: unknown): number | undefined {
  if (!dimensionsCm || typeof dimensionsCm !== "object" || Array.isArray(dimensionsCm)) return undefined;
  const d = dimensionsCm as Record<string, unknown>;
  const l = Number(d.l ?? d.length ?? 0);
  const w = Number(d.w ?? d.width ?? 0);
  const h = Number(d.h ?? d.height ?? 0);
  if (l <= 0 || w <= 0 || h <= 0) return undefined;
  return (l * w * h) / 1_000_000;
}
