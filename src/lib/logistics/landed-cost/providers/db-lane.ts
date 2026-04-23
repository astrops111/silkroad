import { createClient } from "@/lib/supabase/server";
import type { FreightLaneRate } from "../types";
import type { FreightLaneProvider, LaneLookupInput } from "./lane";

/**
 * DB-backed freight-lane provider.
 *
 * Match precedence (most specific first):
 *   1. origin port → destination port
 *   2. origin port → destination country
 *   3. origin country → destination port
 *   4. origin country → destination country
 *
 * Filters by shipping_method + container_type, validity window (valid_from/valid_to),
 * and is_active = true. Returns the most-specific match; ties broken by most
 * recently updated.
 */
export class DBFreightLaneProvider implements FreightLaneProvider {
  async resolve(input: LaneLookupInput): Promise<FreightLaneRate | null> {
    const supabase = await createClient();
    const asOf = (input.asOf ?? new Date()).toISOString().slice(0, 10);

    let originPortId: string | null = null;
    let destinationPortId: string | null = null;
    if (input.origin.portCode) {
      const { data } = await supabase.from("ports").select("id").eq("code", input.origin.portCode).maybeSingle();
      originPortId = data?.id ?? null;
    }
    if (input.destination.portCode) {
      const { data } = await supabase.from("ports").select("id").eq("code", input.destination.portCode).maybeSingle();
      destinationPortId = data?.id ?? null;
    }

    const q = supabase
      .from("freight_lanes")
      .select("*")
      .eq("is_active", true)
      .eq("shipping_method", input.shippingMethod)
      .eq("container_type", input.containerType)
      .or(`valid_from.is.null,valid_from.lte.${asOf}`)
      .or(`valid_to.is.null,valid_to.gte.${asOf}`);

    // Build a `(origin) AND (dest)` filter using port-or-country on each side.
    const originIds: string[] = [];
    const destIds: string[] = [];
    if (originPortId) originIds.push(originPortId);
    if (destinationPortId) destIds.push(destinationPortId);

    // Pull a small candidate set (at most a few rows per route) and rank in TS.
    // Cheaper than expressing the precedence logic in SQL filters.
    const { data, error } = await q.limit(50).order("updated_at", { ascending: false });
    if (error) {
      console.error("DBFreightLaneProvider.resolve failed", error);
      return null;
    }

    const matches = (data ?? []).filter((l) => {
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

    return {
      laneId: best.id,
      baseMinor: best.base_rate ?? 0,
      perContainerMinor: best.per_container_rate ?? 0,
      perCbmMinor: best.per_cbm_rate ?? 0,
      perKgMinor: best.per_kg_rate ?? 0,
      minChargeMinor: best.min_charge ?? 0,
      fuelSurchargePct: best.fuel_surcharge_pct ?? 0,
      currency: best.currency ?? "USD",
      transitDaysMin: best.transit_days_min ?? undefined,
      transitDaysMax: best.transit_days_max ?? undefined,
      consolidationDays: best.consolidation_days ?? undefined,
      source: best.source,
      provider: best.provider ?? undefined,
      validUntil: best.valid_to ?? undefined,
    };
  }
}
