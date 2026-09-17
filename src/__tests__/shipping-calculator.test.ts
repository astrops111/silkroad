import { describe, it, expect } from "vitest";
import { calculateShippingCost } from "@/lib/logistics/rates/calculator";

describe("calculateShippingCost", () => {
  const baseRate = {
    baseRate: 500,
    perKgRate: 150,
    perCbmRate: 5000,
    minCharge: 500,
    freeShippingThreshold: 100000,
    currency: "USD",
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
  };

  it("calculates base + weight charge", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 10,
        subtotal: 5000,
        currency: "USD",
      },
      baseRate
    );

    expect(result.baseCost).toBe(500);
    expect(result.weightCharge).toBe(1500); // 10kg * 150
    expect(result.totalCost).toBe(2000);
    expect(result.isFreeShipping).toBe(false);
  });

  it("applies free shipping above threshold", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 50,
        subtotal: 150000, // above 100000 threshold
        currency: "USD",
      },
      baseRate
    );

    expect(result.totalCost).toBe(0);
    expect(result.isFreeShipping).toBe(true);
  });

  it("enforces minimum charge", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 0.1, // very light
        subtotal: 1000,
        currency: "USD",
      },
      baseRate
    );

    // base(500) + weight(15) = 515, but minCharge is 500 so no adjustment
    expect(result.totalCost).toBeGreaterThanOrEqual(500);
  });

  it("adds fragile surcharge", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 10,
        subtotal: 5000,
        currency: "USD",
        isFragile: true,
      },
      baseRate
    );

    expect(result.surcharges.length).toBe(1);
    expect(result.surcharges[0].name).toBe("Fragile handling");
    expect(result.totalCost).toBeGreaterThan(2000); // base+weight=2000 + 15% surcharge
  });

  it("adds cold chain surcharge", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 10,
        subtotal: 5000,
        currency: "USD",
        requiresColdChain: true,
      },
      baseRate
    );

    expect(result.surcharges.length).toBe(1);
    expect(result.surcharges[0].name).toBe("Cold chain");
    // 35% of 2000 = 700
    expect(result.totalCost).toBe(2700);
  });

  it("stacks multiple surcharges", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_standard",
        totalWeightKg: 10,
        subtotal: 5000,
        currency: "USD",
        isFragile: true,
        requiresColdChain: true,
        isHazardous: true,
      },
      baseRate
    );

    expect(result.surcharges.length).toBe(3);
  });

  it("includes volume charge for freight", () => {
    const result = calculateShippingCost(
      {
        originZoneId: "z1",
        destinationZoneId: "z2",
        shippingMethod: "platform_freight",
        totalWeightKg: 100,
        totalVolumeCbm: 2.5,
        subtotal: 50000,
        currency: "USD",
      },
      baseRate
    );

    expect(result.volumeCharge).toBe(12500); // 2.5 * 5000
  });
});

describe("calculateShippingCost — Taiwan air freight rate card", () => {
  // Mirrors the seeded shipping_rates row from migration 00139:
  // USD 15/chargeable kg, min 100 kg, USD 3 per 0.12 CBM rebox carton,
  // USD 100 documentation fee per shipment, freight never waived.
  const twRate = {
    baseRate: 0,
    perKgRate: 1500,
    perCbmRate: 0,
    minCharge: 0,
    minChargeableKg: 100,
    roundUpChargeableKg: true,
    reboxFeePerCarton: 300,
    cartonVolumeCbm: 0.12,
    documentationFee: 10000,
    freeShippingThreshold: null,
    currency: "USD",
  };

  const req = (over: Partial<Parameters<typeof calculateShippingCost>[0]> = {}) => ({
    originZoneId: "TW",
    destinationZoneId: "RW",
    shippingMethod: "platform_express",
    totalWeightKg: 0,
    subtotal: 100000,
    currency: "USD",
    ...over,
  });

  it("bills the 100 kg minimum on a lighter shipment", () => {
    const result = calculateShippingCost(req({ totalWeightKg: 60 }), twRate);

    expect(result.chargeableWeightKg).toBe(100);
    expect(result.weightCharge).toBe(150000); // 100kg * $15
    // no volume given, so no rebox cartons — just freight + documentation
    expect(result.cartonCount).toBe(0);
    expect(result.totalCost).toBe(160000); // $1,500 + $100 doc
  });

  it("rounds chargeable weight up to a whole kg above the minimum", () => {
    const result = calculateShippingCost(req({ totalWeightKg: 120.4 }), twRate);

    expect(result.chargeableWeightKg).toBe(121);
    expect(result.weightCharge).toBe(181500); // 121kg * $15
  });

  it("charges rebox per 60x50x40cm carton, rounding partial cartons up", () => {
    const result = calculateShippingCost(
      req({ totalWeightKg: 100, totalVolumeCbm: 0.3 }),
      twRate
    );

    expect(result.cartonCount).toBe(3); // ceil(0.30 / 0.12)
    const rebox = result.surcharges.find((s) => s.name === "Rebox");
    expect(rebox?.amount).toBe(900); // 3 * $3
    // $1,500 freight + $9 rebox + $100 documentation
    expect(result.totalCost).toBe(160900);
  });

  it("always charges the documentation fee once per shipment", () => {
    const result = calculateShippingCost(req({ totalWeightKg: 500 }), twRate);

    const doc = result.surcharges.filter((s) => s.name === "Documentation");
    expect(doc).toHaveLength(1);
    expect(doc[0].amount).toBe(10000);
  });

  it("never waives freight, however large the order", () => {
    const result = calculateShippingCost(
      req({ totalWeightKg: 100, subtotal: 50_000_000 }),
      twRate
    );

    expect(result.isFreeShipping).toBe(false);
    expect(result.totalCost).toBe(160000);
  });

  it("leaves other origins on their own rate card", () => {
    // A rate row without the air-freight fields behaves exactly as before:
    // no weight floor, no rounding, no rebox or documentation fees.
    const genericRate = {
      baseRate: 500,
      perKgRate: 150,
      perCbmRate: 0,
      minCharge: 500,
      freeShippingThreshold: 100000,
      currency: "USD",
    };
    const result = calculateShippingCost(req({ totalWeightKg: 10, subtotal: 5000 }), genericRate);

    expect(result.chargeableWeightKg).toBe(10);
    expect(result.cartonCount).toBe(0);
    expect(result.surcharges).toHaveLength(0);
    expect(result.totalCost).toBe(2000); // 500 + 10kg*150
  });
});
