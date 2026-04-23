import type { InsuranceMode } from "./types";

// Standard marine cargo: cover 110% of CIF value (goods + freight) at a small percent.
// Default tuned to typical China→Africa LCL/FCL marine cargo policies.
export const DEFAULT_INSURANCE_RATE_PCT = 0.3;
export const DEFAULT_INSURED_VALUE_UPLIFT = 1.1;
export const DEFAULT_MIN_PREMIUM_USD_MINOR = 5_000; // $50.00

export interface InsuranceInputs {
  goodsMinor: number;
  freightMinor: number;        // first-mile + main-leg, used in the insured-value base
  mode: InsuranceMode | undefined;
}

export function calculateInsurancePremium({
  goodsMinor,
  freightMinor,
  mode,
}: InsuranceInputs): { premiumMinor: number; ratePct: number; insuredValueMinor: number } {
  const effective = mode ?? { mode: "auto" as const };

  if (effective.mode === "none") {
    return { premiumMinor: 0, ratePct: 0, insuredValueMinor: 0 };
  }

  const ratePct = effective.mode === "manual" ? effective.ratePct : DEFAULT_INSURANCE_RATE_PCT;
  const minPremium = effective.mode === "manual"
    ? (effective.minPremiumMinor ?? 0)
    : DEFAULT_MIN_PREMIUM_USD_MINOR;

  const insuredValueMinor = Math.round((goodsMinor + freightMinor) * DEFAULT_INSURED_VALUE_UPLIFT);
  const rawPremium = Math.round((insuredValueMinor * ratePct) / 100);
  const premiumMinor = Math.max(rawPremium, minPremium);

  return { premiumMinor, ratePct, insuredValueMinor };
}
