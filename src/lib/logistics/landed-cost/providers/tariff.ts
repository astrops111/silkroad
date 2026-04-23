import type { TariffMatch } from "../types";

export interface TariffLookupInput {
  hsCode: string;
  destinationCountry: string;
  originCountry?: string;       // for preferential-rate eligibility
  asOf?: Date;
}

export interface TariffProvider {
  /**
   * Resolve duty + VAT + other fees for a given HS code in a destination country.
   * Implementations match by longest HS prefix. Return `null` if no entry exists.
   */
  resolve(input: TariffLookupInput): Promise<TariffMatch | null>;
}

interface TariffEntry extends Omit<TariffMatch, "hsCode"> {
  effectiveFrom?: string;
  effectiveTo?: string;
}

/**
 * In-memory provider for tests / local dev. Picks the longest hs_prefix
 * match for the requested destination country.
 */
export class StaticTariffProvider implements TariffProvider {
  constructor(private readonly entries: TariffEntry[]) {}

  async resolve(input: TariffLookupInput): Promise<TariffMatch | null> {
    const asOf = input.asOf ?? new Date();
    const matches = this.entries.filter((e) => {
      if (e.destinationCountry !== input.destinationCountry) return false;
      if (!input.hsCode.startsWith(e.matchedPrefix)) return false;
      if (e.effectiveFrom && new Date(e.effectiveFrom) > asOf) return false;
      if (e.effectiveTo && new Date(e.effectiveTo) < asOf) return false;
      return true;
    });

    if (matches.length === 0) return null;

    matches.sort((a, b) => b.matchedPrefix.length - a.matchedPrefix.length);
    const best = matches[0]!;

    const preferentialApplies =
      best.preferentialRatePct !== undefined &&
      input.originCountry !== undefined &&
      (best.preferentialOriginCountries ?? []).includes(input.originCountry);

    return {
      hsCode: input.hsCode,
      matchedPrefix: best.matchedPrefix,
      destinationCountry: best.destinationCountry,
      dutyPct: preferentialApplies ? best.preferentialRatePct! : best.dutyPct,
      vatPct: best.vatPct,
      excisePct: best.excisePct,
      otherFeesPct: best.otherFeesPct,
      preferentialRatePct: best.preferentialRatePct,
      preferentialOriginCountries: best.preferentialOriginCountries,
      source: best.source,
      provider: best.provider,
    };
  }
}
