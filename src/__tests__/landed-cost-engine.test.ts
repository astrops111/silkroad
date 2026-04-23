import { describe, it, expect } from "vitest";
import {
  quoteLandedCost,
  StaticFreightLaneProvider,
  StaticTariffProvider,
  type CargoItem,
  type LandedCostInput,
  type LandedCostProviders,
} from "@/lib/logistics/landed-cost";
import { PLATFORM_MARKUP } from "@/lib/pricing";

// Lane fixtures (USD minor units = cents).
const lanes = new StaticFreightLaneProvider([
  {
    laneId: "LCL-CN-KE",
    originCountry: "CN",
    destinationCountry: "KE",
    shippingMethod: "platform_freight",
    containerType: "lcl",
    baseMinor: 5_000_00,        // $5,000 base
    perContainerMinor: 0,
    perCbmMinor: 80_00,         // $80/CBM
    perKgMinor: 0,
    minChargeMinor: 100_00,
    fuelSurchargePct: 10,
    currency: "USD",
    transitDaysMin: 35,
    transitDaysMax: 45,
    consolidationDays: 10,
    source: "manual_forwarder",
  },
  {
    laneId: "FCL40-CNSHA-KEMBA",
    originPortCode: "CNSHA",
    destinationPortCode: "KEMBA",
    originCountry: "CN",
    destinationCountry: "KE",
    shippingMethod: "platform_freight",
    containerType: "fcl_40",
    baseMinor: 0,
    perContainerMinor: 3_500_00, // $3,500 per 40ft
    perCbmMinor: 0,
    perKgMinor: 0,
    minChargeMinor: 3_500_00,
    fuelSurchargePct: 0,
    currency: "USD",
    source: "carrier_api",
  },
  {
    laneId: "AIR-CN-KE",
    originCountry: "CN",
    destinationCountry: "KE",
    shippingMethod: "platform_express",
    containerType: "air_freight",
    baseMinor: 50_00,            // $50 base
    perContainerMinor: 0,
    perCbmMinor: 0,
    perKgMinor: 7_50,            // $7.50/kg chargeable
    minChargeMinor: 200_00,
    fuelSurchargePct: 0,
    currency: "USD",
    source: "carrier_api",
  },
]);

// Tariff fixtures: HS 8517 (phones/comms) + a generic 85 fallback for KE.
const tariffs = new StaticTariffProvider([
  {
    matchedPrefix: "8517",
    destinationCountry: "KE",
    dutyPct: 0,
    vatPct: 16,
    excisePct: 0,
    otherFeesPct: { idf_pct: 2.5, rdl_pct: 2.0 },
    source: "tariff_db",
  },
  {
    matchedPrefix: "85",
    destinationCountry: "KE",
    dutyPct: 25,
    vatPct: 16,
    excisePct: 0,
    otherFeesPct: {},
    source: "tariff_db",
  },
  {
    matchedPrefix: "61",
    destinationCountry: "KE",
    dutyPct: 25,
    vatPct: 16,
    excisePct: 10,
    otherFeesPct: { idf_pct: 2.5 },
    preferentialRatePct: 10,
    preferentialOriginCountries: ["CN"],
    source: "tariff_db",
  },
]);

const providers: LandedCostProviders = { lanes, tariffs };

// 100 phones, $50/unit, 0.5kg + 0.002 CBM each.
const phones: CargoItem = {
  description: "Smartphone",
  hsCode: "8517.13.00",
  quantity: 100,
  unitCostMinor: 50_00,
  weightKgPerUnit: 0.5,
  volumeCbmPerUnit: 0.002,
};

function baseInput(overrides: Partial<LandedCostInput> = {}): LandedCostInput {
  return {
    items: [phones],
    currency: "USD",
    origin: { country: "CN", portCode: "CNSHA" },
    destination: { country: "KE", portCode: "KEMBA" },
    shippingMethod: "platform_freight",
    containerType: "lcl",
    incoterm: "cif",
    ...overrides,
  };
}

describe("quoteLandedCost — incoterm responsibility flags", () => {
  it("EXW: only goods + handling are seller-side", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "exw", handlingFeeMinor: 100_00 }), providers);
    expect(r.goods.includedInQuote).toBe(true);
    expect(r.handling.includedInQuote).toBe(true);
    expect(r.firstMile.includedInQuote).toBe(false);
    expect(r.mainLeg.includedInQuote).toBe(false);
    expect(r.insurance.includedInQuote).toBe(false);
    expect(r.duty.includedInQuote).toBe(false);
    expect(r.vat.includedInQuote).toBe(false);
    expect(r.lastMile.includedInQuote).toBe(false);
  });

  it("FOB: first-mile in scope; main-leg and onward excluded", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "fob", firstMileMinor: 200_00 }), providers);
    expect(r.firstMile.includedInQuote).toBe(true);
    expect(r.mainLeg.includedInQuote).toBe(false);
    expect(r.insurance.includedInQuote).toBe(false);
  });

  it("CIF: through main-leg + insurance; duty/VAT/last-mile excluded", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "cif" }), providers);
    expect(r.mainLeg.includedInQuote).toBe(true);
    expect(r.insurance.includedInQuote).toBe(true);
    expect(r.duty.includedInQuote).toBe(false);
    expect(r.lastMile.includedInQuote).toBe(false);
  });

  it("DAP: everything except duty/VAT/excise/otherFees", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "dap", lastMileMinor: 150_00 }), providers);
    expect(r.lastMile.includedInQuote).toBe(true);
    expect(r.insurance.includedInQuote).toBe(true);
    expect(r.duty.includedInQuote).toBe(false);
    expect(r.vat.includedInQuote).toBe(false);
  });

  it("DDP: every component is seller-side", async () => {
    const r = await quoteLandedCost(
      baseInput({ incoterm: "ddp", firstMileMinor: 200_00, lastMileMinor: 150_00 }),
      providers,
    );
    for (const c of [r.goods, r.firstMile, r.mainLeg, r.insurance, r.duty, r.vat, r.excise, r.otherFees, r.lastMile, r.handling]) {
      expect(c.includedInQuote).toBe(true);
    }
  });
});

describe("quoteLandedCost — freight rate models", () => {
  it("LCL applies per-CBM × revenue-ton + fuel surcharge", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "cif" }), providers);
    // 100 units × 0.002 CBM = 0.2 CBM; revenue-ton = max(0.2, 50kg/1000) = 0.2 CBM
    // raw = 5000_00 + 80_00 * 0.2 = 5000_00 + 16_00 = 5016_00 cents
    // fuel +10%: 5016_00 * 1.10 = 5517_60, rounded
    expect(r.mainLeg.amountMinor).toBe(Math.round(5016_00 * 1.10));
  });

  it("FCL applies per-container × count, ignores CBM", async () => {
    const r = await quoteLandedCost(
      baseInput({ containerType: "fcl_40", incoterm: "cif", containerCount: 2 }),
      providers,
    );
    expect(r.mainLeg.amountMinor).toBe(3_500_00 * 2);
    expect(r.totals.containerCount).toBe(2);
  });

  it("Air freight uses chargeable weight (max actual vs volumetric)", async () => {
    const lightBulky: CargoItem = {
      description: "Foam packing",
      hsCode: "39.21",
      quantity: 100,
      unitCostMinor: 10_00,
      weightKgPerUnit: 0.1,
      volumeCbmPerUnit: 0.05,   // total 5 CBM = 835 kg volumetric
    };
    const r = await quoteLandedCost(
      baseInput({
        items: [lightBulky],
        shippingMethod: "platform_express",
        containerType: "air_freight",
        incoterm: "cif",
      }),
      providers,
    );
    // chargeable = max(10kg actual, 5 CBM × 167 = 835kg) = 835kg
    // raw = 50_00 + 7_50 * 835 = 5000 + 626250 = 631250 cents
    expect(r.mainLeg.amountMinor).toBe(50_00 + 7_50 * 835);
  });
});

describe("quoteLandedCost — tariffs", () => {
  it("matches longest HS prefix and computes duty on CIF base", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "ddp" }), providers);
    expect(r.tariffMatches).toHaveLength(1);
    expect(r.tariffMatches[0]!.matchedPrefix).toBe("8517"); // beats "85"
    expect(r.tariffMatches[0]!.dutyPct).toBe(0);
    // HS 8517: 0% duty, so duty = 0
    expect(r.duty.amountMinor).toBe(0);
    // VAT 16% on (CIF + 0 duty)
    expect(r.vat.amountMinor).toBeGreaterThan(0);
  });

  it("applies preferential rate when origin matches FTA list", async () => {
    const apparel: CargoItem = {
      description: "T-shirts",
      hsCode: "61.09.10",
      quantity: 1000,
      unitCostMinor: 5_00,
      weightKgPerUnit: 0.2,
      volumeCbmPerUnit: 0.001,
    };
    const r = await quoteLandedCost(baseInput({ items: [apparel], incoterm: "ddp" }), providers);
    expect(r.tariffMatches[0]!.dutyPct).toBe(10); // preferential, not 25
  });

  it("warns when no tariff entry exists for the HS code", async () => {
    const obscure: CargoItem = {
      description: "Mystery good",
      hsCode: "99.99.99",
      quantity: 1,
      unitCostMinor: 100_00,
      weightKgPerUnit: 1,
      volumeCbmPerUnit: 0.01,
    };
    const r = await quoteLandedCost(baseInput({ items: [obscure], incoterm: "ddp" }), providers);
    expect(r.duty.amountMinor).toBe(0);
    expect(r.warnings.some((w) => w.includes("99.99.99"))).toBe(true);
  });
});

describe("quoteLandedCost — insurance", () => {
  it("auto mode: 0.3% of 110% × (goods + freight), with $50 minimum", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "cif" }), providers);
    expect(r.insurance.amountMinor).toBeGreaterThanOrEqual(50_00);
  });

  it("none mode: zero premium", async () => {
    const r = await quoteLandedCost(
      baseInput({ incoterm: "cif", insurance: { mode: "none" } }),
      providers,
    );
    expect(r.insurance.amountMinor).toBe(0);
  });

  it("manual mode: applies given rate", async () => {
    const r = await quoteLandedCost(
      baseInput({ incoterm: "cif", insurance: { mode: "manual", ratePct: 0.5, minPremiumMinor: 0 } }),
      providers,
    );
    // goods 5000_00 + freight ~5500_00 = 10500_00, ×1.10 = 11550_00, ×0.5% = 57_75
    expect(r.insurance.amountMinor).toBeGreaterThan(50_00);
  });
});

describe("quoteLandedCost — markup on full landed cost (decision #4)", () => {
  it("applies platform markup to quotedSubtotal, not just goods", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "ddp", lastMileMinor: 100_00, firstMileMinor: 50_00 }), providers);
    expect(r.markupMultiplier).toBe(PLATFORM_MARKUP);
    expect(r.totalMinor).toBe(Math.round(r.quotedSubtotalMinor * PLATFORM_MARKUP));
    expect(r.markupMinor).toBe(r.totalMinor - r.quotedSubtotalMinor);
    // For DDP the quoted subtotal must include duty/VAT, so markup base > goods alone
    expect(r.quotedSubtotalMinor).toBeGreaterThan(r.goods.amountMinor);
  });

  it("subtotalLanded always reflects the full breakdown regardless of incoterm", async () => {
    const fob = await quoteLandedCost(baseInput({ incoterm: "fob", firstMileMinor: 200_00 }), providers);
    const ddp = await quoteLandedCost(baseInput({ incoterm: "ddp", firstMileMinor: 200_00, lastMileMinor: 150_00 }), providers);
    // Goods + freight + insurance + duty + VAT components are computed under both
    expect(fob.subtotalLandedMinor).toBeGreaterThan(fob.quotedSubtotalMinor);
    expect(ddp.subtotalLandedMinor).toBeGreaterThanOrEqual(ddp.quotedSubtotalMinor);
  });

  it("custom markupMultiplier overrides platform default", async () => {
    const r = await quoteLandedCost(
      baseInput({ incoterm: "ddp", markupMultiplier: 1.2 }),
      providers,
    );
    expect(r.markupMultiplier).toBe(1.2);
    expect(r.totalMinor).toBe(Math.round(r.quotedSubtotalMinor * 1.2));
  });
});

describe("quoteLandedCost — ops freight-only quote (no SKU breakdown)", () => {
  it("accepts goodsValueOverrideMinor for forwarder-style requests", async () => {
    const filler: CargoItem = {
      description: "Mixed cargo",
      hsCode: "85.17",
      quantity: 1,
      unitCostMinor: 0,             // value carried by override
      weightKgPerUnit: 5_000,       // 5 tonnes
      volumeCbmPerUnit: 25,         // 25 CBM
    };
    const r = await quoteLandedCost(
      baseInput({
        items: [filler],
        incoterm: "ddp",
        goodsValueOverrideMinor: 50_000_00,  // $50k cargo
      }),
      providers,
    );
    expect(r.goods.amountMinor).toBe(50_000_00);
    expect(r.totals.weightKg).toBe(5_000);
    expect(r.totals.volumeCbm).toBe(25);
  });
});

describe("quoteLandedCost — diagnostics", () => {
  it("warns when no freight lane matches", async () => {
    const r = await quoteLandedCost(
      baseInput({ origin: { country: "ZZ" }, destination: { country: "KE" } }),
      providers,
    );
    expect(r.mainLeg.amountMinor).toBe(0);
    expect(r.laneId).toBeNull();
    expect(r.warnings.some((w) => w.includes("No active freight lane"))).toBe(true);
  });

  it("warns when seller-covered first/last mile is missing", async () => {
    const r = await quoteLandedCost(baseInput({ incoterm: "ddp" }), providers);
    expect(r.warnings.some((w) => w.includes("first-mile"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("last-mile"))).toBe(true);
  });
});

describe("quoteLandedCost — FX conversion when lane currency mismatches input", () => {
  // Lane priced in CNY, input in USD.
  const cnyLane = new StaticFreightLaneProvider([
    {
      laneId: "FCL40-CNSHA-KEMBA-CNY",
      originPortCode: "CNSHA",
      destinationPortCode: "KEMBA",
      originCountry: "CN",
      destinationCountry: "KE",
      shippingMethod: "platform_freight",
      containerType: "fcl_40",
      baseMinor: 0,
      perContainerMinor: 25_000_00,   // ¥25,000 per 40ft
      perCbmMinor: 0,
      perKgMinor: 0,
      minChargeMinor: 25_000_00,
      fuelSurchargePct: 0,
      currency: "CNY",
      source: "carrier_api",
    },
  ]);

  it("converts mainLeg into input currency when fx provider returns a rate", async () => {
    const fx = { getRate: async (from: string, to: string) => (from === "CNY" && to === "USD" ? 0.14 : null) };
    const r = await quoteLandedCost(
      baseInput({ containerType: "fcl_40", incoterm: "cif" }),
      { lanes: cnyLane, tariffs, fx },
    );
    // ¥25,000 × 0.14 = $3,500 (350,000 cents)
    expect(r.mainLeg.amountMinor).toBe(Math.round(25_000_00 * 0.14));
    expect(r.warnings.some((w) => w.includes("Freight lane currency"))).toBe(false);
  });

  it("falls back to as-is + warning when no fx provider is supplied", async () => {
    const r = await quoteLandedCost(
      baseInput({ containerType: "fcl_40", incoterm: "cif" }),
      { lanes: cnyLane, tariffs },
    );
    expect(r.mainLeg.amountMinor).toBe(25_000_00);
    expect(r.warnings.some((w) => w.includes("Freight lane currency"))).toBe(true);
  });

  it("falls back to as-is + warning when fx provider returns null", async () => {
    const fx = { getRate: async () => null };
    const r = await quoteLandedCost(
      baseInput({ containerType: "fcl_40", incoterm: "cif" }),
      { lanes: cnyLane, tariffs, fx },
    );
    expect(r.mainLeg.amountMinor).toBe(25_000_00);
    expect(r.warnings.some((w) => w.includes("no FX rate is available"))).toBe(true);
  });
});
