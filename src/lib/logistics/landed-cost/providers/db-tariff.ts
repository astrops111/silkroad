import { createClient } from "@/lib/supabase/server";
import type { TariffMatch } from "../types";
import type { TariffLookupInput, TariffProvider } from "./tariff";

/**
 * DB-backed tariff provider. Picks the longest `hs_prefix` whose value is a
 * prefix of the requested HS code, scoped to destination country and validity
 * window. Applies preferential rate when origin country is on the FTA list.
 */
export class DBTariffProvider implements TariffProvider {
  async resolve(input: TariffLookupInput): Promise<TariffMatch | null> {
    const supabase = await createClient();
    const asOf = (input.asOf ?? new Date()).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("tariff_rates")
      .select("*")
      .eq("destination_country", input.destinationCountry)
      .eq("is_active", true)
      .or(`effective_from.is.null,effective_from.lte.${asOf}`)
      .or(`effective_to.is.null,effective_to.gte.${asOf}`);

    if (error) {
      console.error("DBTariffProvider.resolve failed", error);
      return null;
    }

    const candidates = (data ?? []).filter((row) => input.hsCode.startsWith(row.hs_prefix));
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.hs_prefix.length - a.hs_prefix.length);
    const best = candidates[0]!;

    const otherFeesPct =
      best.other_fees && typeof best.other_fees === "object" && !Array.isArray(best.other_fees)
        ? (best.other_fees as Record<string, number>)
        : {};

    const preferentialOrigins = best.preferential_origin_countries ?? [];
    const preferentialApplies =
      best.preferential_rate_pct !== null &&
      input.originCountry !== undefined &&
      preferentialOrigins.includes(input.originCountry);

    return {
      hsCode: input.hsCode,
      matchedPrefix: best.hs_prefix,
      destinationCountry: best.destination_country,
      dutyPct: preferentialApplies ? (best.preferential_rate_pct as number) : (best.duty_pct ?? 0),
      vatPct: best.vat_pct ?? 0,
      excisePct: best.excise_pct ?? 0,
      otherFeesPct,
      preferentialRatePct: best.preferential_rate_pct ?? undefined,
      preferentialOriginCountries: preferentialOrigins,
      source: best.source,
      provider: best.provider ?? undefined,
    };
  }
}
