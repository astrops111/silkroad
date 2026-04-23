import { PLATFORM_MARKUP } from "@/lib/pricing";
import { sellerCovers } from "./incoterm";
import { calculateInsurancePremium } from "./insurance";
import type { FreightLaneProvider } from "./providers/lane";
import type { TariffProvider } from "./providers/tariff";
import type {
  CargoItem,
  CostBreakdown,
  CostComponent,
  FreightLaneRate,
  LandedCostInput,
  TariffMatch,
} from "./types";

export interface LandedCostProviders {
  lanes: FreightLaneProvider;
  tariffs: TariffProvider;
  /**
   * Optional FX provider. If supplied, the engine converts the freight-lane
   * main-leg amount into the input currency at quote time using the rate
   * returned. Returning `null` falls back to the legacy warning.
   */
  fx?: { getRate: (from: string, to: string) => Promise<number | null> };
}

const FCL_TYPES = new Set(["fcl_20", "fcl_40", "fcl_40hc", "fcl_45"]);
const AIR_TYPES = new Set(["air_express", "air_freight"]);

/**
 * Phase 1 landed-cost engine.
 *
 * Pure-ish: requires async providers for lane + tariff lookups. No DB or
 * network calls of its own — providers do that. Returns a stable-shape
 * `CostBreakdown` regardless of incoterm; the `includedInQuote` flag on
 * each component drives what gets summed into the buyer-facing total.
 *
 * Money is integer minor units throughout; FX is intentionally out of scope.
 */
export async function quoteLandedCost(
  input: LandedCostInput,
  providers: LandedCostProviders,
): Promise<CostBreakdown> {
  const warnings: string[] = [];

  const totals = aggregateTotals(input.items);
  const goodsMinor = input.goodsValueOverrideMinor ?? totals.goodsMinor;

  // ---- Freight: main leg from the lane provider ----
  const containerCount = input.containerCount ?? 1;
  const lane = await providers.lanes.resolve({
    origin: input.origin,
    destination: input.destination,
    shippingMethod: input.shippingMethod,
    containerType: input.containerType,
  });

  let mainLegMinor = 0;
  let laneId: string | null = null;

  if (!lane) {
    warnings.push(
      `No active freight lane found for ${input.origin.country}→${input.destination.country} ` +
        `(${input.shippingMethod}, ${input.containerType}). Main-leg cost set to 0.`,
    );
  } else {
    laneId = lane.laneId;
    mainLegMinor = computeMainLeg({
      lane,
      containerType: input.containerType,
      containerCount,
      totalWeightKg: totals.weightKg,
      totalVolumeCbm: totals.volumeCbm,
    });
    if (lane.currency !== input.currency) {
      const rate = providers.fx
        ? await providers.fx.getRate(lane.currency, input.currency)
        : null;
      if (rate && rate > 0) {
        mainLegMinor = Math.round(mainLegMinor * rate);
      } else {
        warnings.push(
          `Freight lane currency (${lane.currency}) differs from input currency (${input.currency}) ` +
            `and no FX rate is available — values added as-is.`,
        );
      }
    }
  }

  // ---- First mile / last mile (overrides only in Phase 1) ----
  const firstMileMinor = input.firstMileMinor ?? 0;
  const lastMileMinor = input.lastMileMinor ?? 0;
  if (firstMileMinor === 0 && sellerCovers(input.incoterm, "firstMile")) {
    warnings.push(
      `Incoterm ${input.incoterm.toUpperCase()} puts first-mile on the seller, but no firstMileMinor was provided.`,
    );
  }
  if (lastMileMinor === 0 && sellerCovers(input.incoterm, "lastMile")) {
    warnings.push(
      `Incoterm ${input.incoterm.toUpperCase()} puts last-mile on the seller, but no lastMileMinor was provided.`,
    );
  }

  // ---- Insurance ----
  const insurance = calculateInsurancePremium({
    goodsMinor,
    freightMinor: firstMileMinor + mainLegMinor,
    mode: input.insurance,
  });

  // ---- Tariffs (per item, weighted by item value) ----
  const tariffMatches: TariffMatch[] = [];
  let dutyMinor = 0;
  let vatMinor = 0;
  let exciseMinor = 0;
  let otherFeesMinor = 0;

  // Duty assessment basis: CIF (goods + freight + insurance) — common in most
  // African jurisdictions. Apportioned to each item by item value share.
  const cifBaseMinor = goodsMinor + firstMileMinor + mainLegMinor + insurance.premiumMinor;

  for (const item of input.items) {
    const itemValueMinor = Math.round(item.unitCostMinor * item.quantity);
    const valueShare = goodsMinor === 0 ? 0 : itemValueMinor / goodsMinor;
    const itemCifBase = Math.round(cifBaseMinor * valueShare);

    const match = await providers.tariffs.resolve({
      hsCode: item.hsCode,
      destinationCountry: input.destination.country,
      originCountry: input.origin.country,
    });

    if (!match) {
      warnings.push(
        `No tariff entry for HS ${item.hsCode} → ${input.destination.country} (item: ${item.description}). ` +
          `Duty/VAT for this line set to 0.`,
      );
      continue;
    }

    tariffMatches.push(match);
    const itemDuty = Math.round((itemCifBase * match.dutyPct) / 100);
    const dutyAndVatBase = itemCifBase + itemDuty; // VAT typically on CIF + duty
    const itemVat = Math.round((dutyAndVatBase * match.vatPct) / 100);
    const itemExcise = Math.round((dutyAndVatBase * match.excisePct) / 100);
    const itemOther = Object.values(match.otherFeesPct).reduce(
      (sum, pct) => sum + Math.round((itemCifBase * pct) / 100),
      0,
    );

    dutyMinor += itemDuty;
    vatMinor += itemVat;
    exciseMinor += itemExcise;
    otherFeesMinor += itemOther;
  }

  // ---- Handling (platform fee) ----
  const handlingMinor = input.handlingFeeMinor ?? 0;

  // ---- Assemble components with incoterm-aware inclusion flags ----
  const goods: CostComponent = { amountMinor: goodsMinor, includedInQuote: true };
  const handling: CostComponent = { amountMinor: handlingMinor, includedInQuote: true };
  const firstMile: CostComponent = {
    amountMinor: firstMileMinor,
    includedInQuote: sellerCovers(input.incoterm, "firstMile"),
  };
  const mainLeg: CostComponent = {
    amountMinor: mainLegMinor,
    includedInQuote: sellerCovers(input.incoterm, "mainLeg"),
  };
  const insuranceComp: CostComponent = {
    amountMinor: insurance.premiumMinor,
    includedInQuote: sellerCovers(input.incoterm, "insurance"),
    notes: insurance.premiumMinor > 0
      ? `${insurance.ratePct}% on insured value ${insurance.insuredValueMinor}`
      : undefined,
  };
  const duty: CostComponent = {
    amountMinor: dutyMinor,
    includedInQuote: sellerCovers(input.incoterm, "duty"),
  };
  const vat: CostComponent = {
    amountMinor: vatMinor,
    includedInQuote: sellerCovers(input.incoterm, "vat"),
  };
  const excise: CostComponent = {
    amountMinor: exciseMinor,
    includedInQuote: sellerCovers(input.incoterm, "excise"),
  };
  const otherFees: CostComponent = {
    amountMinor: otherFeesMinor,
    includedInQuote: sellerCovers(input.incoterm, "otherFees"),
  };
  const lastMile: CostComponent = {
    amountMinor: lastMileMinor,
    includedInQuote: sellerCovers(input.incoterm, "lastMile"),
  };

  const allComponents = [
    goods,
    firstMile,
    mainLeg,
    insuranceComp,
    duty,
    vat,
    excise,
    otherFees,
    lastMile,
    handling,
  ];

  const subtotalLandedMinor = allComponents.reduce((s, c) => s + c.amountMinor, 0);
  const quotedSubtotalMinor = allComponents
    .filter((c) => c.includedInQuote)
    .reduce((s, c) => s + c.amountMinor, 0);

  // Decision #4: markup applies to FULL landed cost (the quoted subtotal),
  // not goods only. Audit applyMarkup callsites before flipping production.
  const markupMultiplier = input.markupMultiplier ?? PLATFORM_MARKUP;
  const totalMinor = Math.round(quotedSubtotalMinor * markupMultiplier);
  const markupMinor = totalMinor - quotedSubtotalMinor;

  return {
    currency: input.currency,
    goods,
    firstMile,
    mainLeg,
    insurance: insuranceComp,
    duty,
    vat,
    excise,
    otherFees,
    lastMile,
    handling,
    subtotalLandedMinor,
    quotedSubtotalMinor,
    markupMultiplier,
    markupMinor,
    totalMinor,
    incoterm: input.incoterm,
    containerType: input.containerType,
    shippingMethod: input.shippingMethod,
    laneId,
    tariffMatches,
    totals: {
      weightKg: totals.weightKg,
      volumeCbm: totals.volumeCbm,
      quantity: totals.quantity,
      containerCount,
    },
    warnings,
    computedAt: new Date().toISOString(),
    source: "engine_v1",
  };
}

function aggregateTotals(items: CargoItem[]): {
  weightKg: number;
  volumeCbm: number;
  quantity: number;
  goodsMinor: number;
} {
  let weightKg = 0;
  let volumeCbm = 0;
  let quantity = 0;
  let goodsMinor = 0;
  for (const item of items) {
    weightKg += item.weightKgPerUnit * item.quantity;
    volumeCbm += (item.volumeCbmPerUnit ?? 0) * item.quantity;
    quantity += item.quantity;
    goodsMinor += Math.round(item.unitCostMinor * item.quantity);
  }
  return {
    weightKg: round2(weightKg),
    volumeCbm: round4(volumeCbm),
    quantity,
    goodsMinor,
  };
}

function computeMainLeg({
  lane,
  containerType,
  containerCount,
  totalWeightKg,
  totalVolumeCbm,
}: {
  lane: FreightLaneRate;
  containerType: string;
  containerCount: number;
  totalWeightKg: number;
  totalVolumeCbm: number;
}): number {
  const isFcl = FCL_TYPES.has(containerType);
  const isAir = AIR_TYPES.has(containerType);

  let raw: number;
  if (isFcl) {
    raw = lane.baseMinor + lane.perContainerMinor * containerCount;
  } else if (isAir) {
    // Chargeable weight: max(actual weight, volumetric weight).
    // IATA volumetric divisor = 6000 cm^3/kg → 1 CBM = 167 kg chargeable.
    const chargeableKg = Math.max(totalWeightKg, totalVolumeCbm * 167);
    raw = lane.baseMinor + Math.round(lane.perKgMinor * chargeableKg);
  } else {
    // LCL: per CBM (with a 1 CBM = 1000 kg revenue-ton fallback if heavier).
    const revenueTon = Math.max(totalVolumeCbm, totalWeightKg / 1000);
    raw = lane.baseMinor + Math.round(lane.perCbmMinor * revenueTon);
  }

  raw = Math.max(raw, lane.minChargeMinor);
  if (lane.fuelSurchargePct > 0) {
    raw += Math.round((raw * lane.fuelSurchargePct) / 100);
  }
  return raw;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
