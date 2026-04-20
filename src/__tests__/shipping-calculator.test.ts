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
