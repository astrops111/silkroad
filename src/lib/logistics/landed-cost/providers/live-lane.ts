import { createClient } from "@/lib/supabase/server";
import { selectBestRate } from "@/lib/logistics/rate-aggregator";
import type { RankedRate } from "@/lib/logistics/rate-aggregator";
import type { FreightLaneRate } from "../types";
import type { FreightLaneProvider, LaneLookupInput } from "./lane";

/**
 * LiveFreightLaneProvider — three-tier rate resolution:
 *
 *   Tier 1 (BSA)    — Block Space Agreement rates stored in freight_lanes
 *                     with rate_source = 'bsa'. Always wins when present.
 *                     These are your negotiated lanes, below market price.
 *
 *   Tier 2 (Live)   — Real-time rates from enabled carrier adapters
 *                     (Shipa Freight, Freightos, …). Cached in freight_lanes
 *                     with rate_source = 'carrier_api' for CACHE_TTL_HOURS
 *                     so repeat requests don't re-hit the APIs.
 *
 *   Tier 3 (Static) — Hand-seeded freight_lanes rows (manual_forwarder /
 *                     rate_card). Fallback when APIs return nothing.
 *
 * Wire this instead of DBFreightLaneProvider in actions that run the engine.
 */
export class LiveFreightLaneProvider implements FreightLaneProvider {
  private readonly cacheTtlHours: number;

  constructor(cacheTtlHours = 6) {
    this.cacheTtlHours = cacheTtlHours;
  }

  async resolve(input: LaneLookupInput): Promise<FreightLaneRate | null> {
    const supabase = await createClient();
    const asOf = (input.asOf ?? new Date()).toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // ---- Resolve port IDs for specificity scoring ----
    let originPortId: string | null = null;
    let destinationPortId: string | null = null;
    if (input.origin.portCode) {
      const { data } = await supabase
        .from("ports")
        .select("id")
        .eq("code", input.origin.portCode)
        .maybeSingle();
      originPortId = data?.id ?? null;
    }
    if (input.destination.portCode) {
      const { data } = await supabase
        .from("ports")
        .select("id")
        .eq("code", input.destination.portCode)
        .maybeSingle();
      destinationPortId = data?.id ?? null;
    }

    // ---- Tier 1: BSA (negotiated block space — always wins) ----
    const bsaRate = await this.queryLanes(
      supabase, input, originPortId, destinationPortId, asOf, ["bsa"],
    );
    if (bsaRate) return bsaRate;

    // ---- Tier 2a: Cached live API rate (not yet expired) ----
    const cachedRate = await this.queryCachedApiRate(
      supabase, input, originPortId, destinationPortId, now,
    );
    if (cachedRate) return cachedRate;

    // ---- Tier 2b: Live fetch from carrier adapters ----
    const liveRate = await selectBestRate({
      originPortCode: input.origin.portCode,
      originCountry: input.origin.country,
      destinationPortCode: input.destination.portCode,
      destinationCountry: input.destination.country,
      shippingMethod: input.shippingMethod,
      containerType: input.containerType,
      asOf: input.asOf,
    });

    if (liveRate) {
      // Cache result fire-and-forget — must never delay the quote response.
      void this.cacheRate(supabase, liveRate, input, originPortId, destinationPortId);
      return toFreightLaneRate(liveRate);
    }

    // ---- Tier 3: Hand-seeded static lanes ----
    return this.queryLanes(
      supabase, input, originPortId, destinationPortId, asOf,
      ["manual_forwarder", "rate_card", "tariff_db", "tariff_api"],
    );
  }

  // ============================================================
  // queryLanes — shared query for BSA tier and static tier.
  // ============================================================
  private async queryLanes(
    supabase: Awaited<ReturnType<typeof createClient>>,
    input: LaneLookupInput,
    originPortId: string | null,
    destinationPortId: string | null,
    asOf: string,
    sources: string[],
  ): Promise<FreightLaneRate | null> {
    const { data, error } = await supabase
      .from("freight_lanes")
      .select("*")
      .eq("is_active", true)
      .eq("shipping_method", input.shippingMethod)
      .eq("container_type", input.containerType)
      .in("source", sources)
      .or(`valid_from.is.null,valid_from.lte.${asOf}`)
      .or(`valid_to.is.null,valid_to.gte.${asOf}`)
      .limit(50)
      .order("updated_at", { ascending: false });

    if (error || !data || data.length === 0) return null;

    const matches = data.filter((l) => {
      const oMatch =
        (originPortId && l.origin_port_id === originPortId) ||
        (input.origin.country && l.origin_country === input.origin.country);
      const dMatch =
        (destinationPortId && l.destination_port_id === destinationPortId) ||
        (input.destination.country && l.destination_country === input.destination.country);
      return Boolean(oMatch && dMatch);
    });
    if (matches.length === 0) return null;

    const score = (l: (typeof matches)[number]) =>
      (originPortId && l.origin_port_id === originPortId ? 2 : 1) +
      (destinationPortId && l.destination_port_id === destinationPortId ? 2 : 1);

    matches.sort((a, b) => score(b) - score(a));
    const best = matches[0]!;
    return laneRowToRate(best);
  }

  // ============================================================
  // queryCachedApiRate — find a non-expired carrier_api row.
  // Uses live_rate_expires_at (timestamptz) for sub-day TTL.
  // ============================================================
  private async queryCachedApiRate(
    supabase: Awaited<ReturnType<typeof createClient>>,
    input: LaneLookupInput,
    originPortId: string | null,
    destinationPortId: string | null,
    now: string,
  ): Promise<FreightLaneRate | null> {
    const { data, error } = await supabase
      .from("freight_lanes")
      .select("*")
      .eq("is_active", true)
      .eq("source", "carrier_api")
      .eq("shipping_method", input.shippingMethod)
      .eq("container_type", input.containerType)
      .gt("live_rate_expires_at", now)
      .limit(20)
      .order("live_rate_expires_at", { ascending: false });

    if (error || !data || data.length === 0) return null;

    const matches = data.filter((l) => {
      const oMatch =
        (originPortId && l.origin_port_id === originPortId) ||
        (input.origin.country && l.origin_country === input.origin.country);
      const dMatch =
        (destinationPortId && l.destination_port_id === destinationPortId) ||
        (input.destination.country && l.destination_country === input.destination.country);
      return Boolean(oMatch && dMatch);
    });
    if (matches.length === 0) return null;

    return laneRowToRate(matches[0]!);
  }

  // ============================================================
  // cacheRate — persist a live API rate into freight_lanes.
  // Evicts stale carrier_api rows for the route first.
  // ============================================================
  private async cacheRate(
    supabase: Awaited<ReturnType<typeof createClient>>,
    rate: RankedRate,
    input: LaneLookupInput,
    originPortId: string | null,
    destinationPortId: string | null,
  ): Promise<void> {
    try {
      await supabase
        .from("freight_lanes")
        .delete()
        .eq("source", "carrier_api")
        .eq("shipping_method", input.shippingMethod)
        .eq("container_type", input.containerType)
        .eq("origin_country", input.origin.country)
        .eq("destination_country", input.destination.country);

      const expiresAt = new Date(
        Date.now() + this.cacheTtlHours * 60 * 60 * 1000,
      ).toISOString();

      await supabase.from("freight_lanes").insert({
        is_active: true,
        source: "carrier_api",
        provider: `${rate.adapterId}:${rate.providerName}`,
        shipping_method: input.shippingMethod,
        container_type: input.containerType,
        origin_country: input.origin.country,
        origin_port_id: originPortId,
        destination_country: input.destination.country,
        destination_port_id: destinationPortId,
        base_rate: rate.baseMinor,
        per_container_rate: rate.perContainerMinor,
        per_cbm_rate: rate.perCbmMinor,
        per_kg_rate: rate.perKgMinor,
        min_charge: rate.minChargeMinor,
        fuel_surcharge_pct: rate.fuelSurchargePct,
        currency: rate.currency,
        transit_days_min: rate.transitDaysMin ?? null,
        transit_days_max: rate.transitDaysMax ?? null,
        valid_to: rate.validUntil ?? null,
        live_rate_expires_at: expiresAt,
        external_ref: rate.externalRef ?? null,
      });
    } catch (e) {
      // Cache failure must never break a quote.
      console.error("LiveFreightLaneProvider.cacheRate failed", e);
    }
  }
}

function laneRowToRate(row: Record<string, unknown>): FreightLaneRate {
  return {
    laneId: row.id as string,
    baseMinor: (row.base_rate as number) ?? 0,
    perContainerMinor: (row.per_container_rate as number) ?? 0,
    perCbmMinor: (row.per_cbm_rate as number) ?? 0,
    perKgMinor: (row.per_kg_rate as number) ?? 0,
    minChargeMinor: (row.min_charge as number) ?? 0,
    fuelSurchargePct: (row.fuel_surcharge_pct as number) ?? 0,
    currency: (row.currency as string) ?? "USD",
    transitDaysMin: (row.transit_days_min as number | null) ?? undefined,
    transitDaysMax: (row.transit_days_max as number | null) ?? undefined,
    consolidationDays: (row.consolidation_days as number | null) ?? undefined,
    source: row.source as string,
    provider: (row.provider as string | null) ?? undefined,
    validUntil: (row.valid_to as string | null) ?? undefined,
  };
}

function toFreightLaneRate(rate: RankedRate): FreightLaneRate {
  return {
    laneId: `live:${rate.adapterId}:${rate.externalRef ?? rate.providerName}`,
    baseMinor: rate.baseMinor,
    perContainerMinor: rate.perContainerMinor,
    perCbmMinor: rate.perCbmMinor,
    perKgMinor: rate.perKgMinor,
    minChargeMinor: rate.minChargeMinor,
    fuelSurchargePct: rate.fuelSurchargePct,
    currency: rate.currency,
    transitDaysMin: rate.transitDaysMin,
    transitDaysMax: rate.transitDaysMax,
    source: rate.adapterId,
    provider: rate.providerName,
    validUntil: rate.validUntil,
  };
}
