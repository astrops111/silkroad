import { createClient } from "@/lib/supabase/server";
import {
  getDefaultTariffApiClient,
  normalizeHsCode,
  type ExternalTariffRate,
  type TariffApiClient,
} from "@/lib/logistics/tariffs/simplyduty";
import type { TariffMatch } from "../types";
import { DBTariffProvider } from "./db-tariff";
import type { TariffLookupInput, TariffProvider } from "./tariff";

/**
 * LiveTariffProvider — two-tier duty/VAT resolution:
 *
 *   Tier 1 (DB)  — tariff_rates rows (hand-seeded tariff_db + previously
 *                  cached tariff_api). Ops-verified rates always win.
 *
 *   Tier 2 (API) — SimplyDuty lookup for HS×country pairs with no DB row.
 *                  The result is written back into tariff_rates with
 *                  source='tariff_api' (fire-and-forget) so each gap is
 *                  paid for once; /api/cron/tariff-refresh re-verifies
 *                  those rows on a schedule.
 *
 * No SIMPLYDUTY_API_KEY → behaves exactly like DBTariffProvider.
 */
export class LiveTariffProvider implements TariffProvider {
  private readonly db: TariffProvider;
  private readonly api: TariffApiClient | null;
  private readonly persist: (rate: ExternalTariffRate) => Promise<void>;

  constructor(opts?: {
    db?: TariffProvider;
    api?: TariffApiClient | null;
    persist?: (rate: ExternalTariffRate) => Promise<void>;
  }) {
    this.db = opts?.db ?? new DBTariffProvider();
    this.api = opts?.api !== undefined ? opts.api : getDefaultTariffApiClient();
    this.persist = opts?.persist ?? persistTariffApiRate;
  }

  async resolve(input: TariffLookupInput): Promise<TariffMatch | null> {
    const dbMatch = await this.db.resolve(input);
    if (dbMatch) return dbMatch;

    if (!this.api?.isConfigured()) return null;

    let rate: ExternalTariffRate | null;
    try {
      rate = await this.api.fetchRate({
        hsCode: input.hsCode,
        destinationCountry: input.destinationCountry,
        originCountry: input.originCountry,
      });
    } catch (e) {
      // API failure must never break a quote — engine warns on missing tariff.
      console.error("LiveTariffProvider API lookup failed", e);
      return null;
    }
    if (!rate) return null;

    // Write back fire-and-forget so the next lookup hits Tier 1.
    void this.persist(rate).catch((e) => {
      console.error("LiveTariffProvider.persist failed", e);
    });

    return {
      hsCode: input.hsCode,
      matchedPrefix: normalizeHsCode(input.hsCode),
      destinationCountry: input.destinationCountry,
      dutyPct: rate.dutyPct,
      vatPct: rate.vatPct,
      excisePct: rate.excisePct,
      otherFeesPct: {},
      source: "tariff_api",
      provider: this.api.providerId,
    };
  }
}

/** Upsert an API-sourced rate into tariff_rates (unique on prefix×country×from). */
async function persistTariffApiRate(rate: ExternalTariffRate): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("tariff_rates").upsert(
    {
      hs_prefix: normalizeHsCode(rate.hsCode),
      destination_country: rate.destinationCountry,
      duty_pct: rate.dutyPct,
      vat_pct: rate.vatPct,
      excise_pct: rate.excisePct,
      source: "tariff_api",
      provider: "simplyduty",
      external_ref: rate.externalRef ?? null,
      effective_from: today,
      last_verified_at: new Date().toISOString(),
      is_active: true,
      notes: rate.originCountry
        ? `Auto-cached from API; queried for origin ${rate.originCountry}`
        : "Auto-cached from API",
    },
    { onConflict: "hs_prefix,destination_country,effective_from" },
  );
  if (error) throw new Error(error.message);
}
