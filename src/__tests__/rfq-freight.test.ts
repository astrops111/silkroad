import { describe, it, expect } from "vitest";
import { computeRfqFreight, normaliseExpenses } from "@/lib/logistics/rates/rfq-freight";

describe("computeRfqFreight", () => {
  // The Taiwan air card: $15/kg, min 100 kg, $3/carton, $100 documentation.
  const twRates = {
    perKgRate: 1500,
    minChargeableKg: 100,
    reboxFeePerCarton: 300,
    documentationFee: 10000,
  };

  it("floors chargeable weight to the carrier minimum", () => {
    const t = computeRfqFreight({ ...twRates, chargeableWeightKg: 62, cartonCount: 0 });

    expect(t.chargeableWeightKg).toBe(100);
    expect(t.weightCharge).toBe(150000); // 100kg * $15
    expect(t.freightTotal).toBe(160000); // + $100 documentation
    expect(t.total).toBe(160000);
  });

  it("bills actual weight once it exceeds the minimum", () => {
    const t = computeRfqFreight({ ...twRates, chargeableWeightKg: 240 });

    expect(t.chargeableWeightKg).toBe(240);
    expect(t.weightCharge).toBe(360000); // 240kg * $15
  });

  it("charges rebox per carton entered", () => {
    const t = computeRfqFreight({ ...twRates, chargeableWeightKg: 150, cartonCount: 12 });

    expect(t.reboxCharge).toBe(3600); // 12 * $3
    expect(t.freightTotal).toBe(225000 + 3600 + 10000);
  });

  it("adds expense lines on top of freight and reports them separately", () => {
    const t = computeRfqFreight({
      ...twRates,
      chargeableWeightKg: 100,
      expenses: [
        { label: "Customs inspection", amountMinor: 5000 },
        { label: "Storage", amountMinor: 2500 },
      ],
    });

    expect(t.freightTotal).toBe(160000);
    expect(t.expensesTotal).toBe(7500);
    expect(t.total).toBe(167500);
  });

  it("supports a negative expense line as a rebate", () => {
    const t = computeRfqFreight({
      ...twRates,
      chargeableWeightKg: 100,
      expenses: [{ label: "Volume rebate", amountMinor: -5000 }],
    });

    expect(t.expensesTotal).toBe(-5000);
    expect(t.total).toBe(155000);
  });

  it("prices sea freight per CBM", () => {
    const t = computeRfqFreight({ perCbmRate: 20000, volumeCbm: 3.5, documentationFee: 5000 });

    expect(t.volumeCharge).toBe(70000); // 3.5 CBM * $200
    expect(t.weightCharge).toBe(0);
    expect(t.total).toBe(75000);
  });

  it("returns zeros for an empty confirmation", () => {
    const t = computeRfqFreight({});

    expect(t.chargeableWeightKg).toBe(0);
    expect(t.freightTotal).toBe(0);
    expect(t.expensesTotal).toBe(0);
    expect(t.total).toBe(0);
  });

  it("ignores negative or non-finite cargo figures", () => {
    const t = computeRfqFreight({
      ...twRates,
      chargeableWeightKg: -50,
      cartonCount: Number.NaN,
    });

    // falls back to the 100kg minimum, and no rebox for an unusable count
    expect(t.chargeableWeightKg).toBe(100);
    expect(t.reboxCharge).toBe(0);
  });
});

describe("normaliseExpenses", () => {
  it("drops unlabelled rows and trims labels", () => {
    const out = normaliseExpenses([
      { label: "  Trucking  ", amountMinor: 1200 },
      { label: "", amountMinor: 9999 },
      { label: "   ", amountMinor: 1 },
    ]);

    expect(out).toEqual([{ label: "Trucking", amountMinor: 1200 }]);
  });

  it("accepts the snake_case shape stored in JSONB", () => {
    const out = normaliseExpenses([{ label: "Insurance", amount_minor: 4200 }]);

    expect(out).toEqual([{ label: "Insurance", amountMinor: 4200 }]);
  });

  it("coerces bad amounts to zero rather than dropping the line", () => {
    const out = normaliseExpenses([{ label: "Misc", amountMinor: "abc" }]);

    expect(out).toEqual([{ label: "Misc", amountMinor: 0 }]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normaliseExpenses(null)).toEqual([]);
    expect(normaliseExpenses("nope")).toEqual([]);
  });
});
