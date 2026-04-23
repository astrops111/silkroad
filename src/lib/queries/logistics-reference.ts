"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type PortType = Enums<"port_type">;
export type ContainerType = Enums<"container_type">;
export type ShippingMethodDb = Enums<"shipping_method">;
export type RateSource = Enums<"rate_source">;

export type PortRow = Tables<"ports">;
export type FreightLaneRow = Tables<"freight_lanes">;
export type TariffRateRow = Tables<"tariff_rates">;

// `other_fees` and `preferential_origin_countries` come back from PostgREST as
// `Json` / `string[]` respectively but the engine expects narrowed shapes.
// Use this view type at the read boundary; the row type is still the source of truth.
export type TariffRateRowView = Omit<TariffRateRow, "other_fees" | "preferential_origin_countries"> & {
  other_fees: Record<string, number> | null;
  preferential_origin_countries: string[] | null;
};

export interface PortListFilters {
  query?: string;
  country?: string;
  type?: PortType;
  side?: "origin" | "destination" | "both";
  includeInactive?: boolean;
}

export async function listPorts(filters: PortListFilters = {}): Promise<PortRow[]> {
  const supabase = await createClient();
  let q = supabase.from("ports").select("*");

  if (!filters.includeInactive) q = q.eq("is_active", true);
  if (filters.country) q = q.eq("country", filters.country);
  if (filters.type) q = q.eq("port_type", filters.type);
  if (filters.side === "origin") q = q.eq("is_origin", true);
  if (filters.side === "destination") q = q.eq("is_destination", true);
  if (filters.query) {
    const escaped = filters.query.replace(/[%_]/g, (m) => `\\${m}`);
    q = q.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%,city.ilike.%${escaped}%`);
  }

  const { data, error } = await q.order("country").order("code");
  if (error) {
    console.error("listPorts failed", error);
    return [];
  }
  return data ?? [];
}

export interface FreightLaneListFilters {
  originCountry?: string;
  destinationCountry?: string;
  shippingMethod?: ShippingMethodDb;
  containerType?: ContainerType;
  source?: RateSource;
  includeInactive?: boolean;
  expiringWithinDays?: number;
}

export async function listFreightLanes(filters: FreightLaneListFilters = {}): Promise<FreightLaneRow[]> {
  const supabase = await createClient();
  let q = supabase.from("freight_lanes").select("*");

  if (!filters.includeInactive) q = q.eq("is_active", true);
  if (filters.originCountry) q = q.eq("origin_country", filters.originCountry);
  if (filters.destinationCountry) q = q.eq("destination_country", filters.destinationCountry);
  if (filters.shippingMethod) q = q.eq("shipping_method", filters.shippingMethod);
  if (filters.containerType) q = q.eq("container_type", filters.containerType);
  if (filters.source) q = q.eq("source", filters.source);

  if (filters.expiringWithinDays !== undefined) {
    const cutoff = new Date(Date.now() + filters.expiringWithinDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    q = q.lte("valid_to", cutoff);
  }

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(500);
  if (error) {
    console.error("listFreightLanes failed", error);
    return [];
  }
  return data ?? [];
}

export interface TariffRateListFilters {
  destinationCountry?: string;
  hsPrefix?: string;
  source?: RateSource;
  includeInactive?: boolean;
}

export async function listTariffRates(filters: TariffRateListFilters = {}): Promise<TariffRateRowView[]> {
  const supabase = await createClient();
  let q = supabase.from("tariff_rates").select("*");

  if (!filters.includeInactive) q = q.eq("is_active", true);
  if (filters.destinationCountry) q = q.eq("destination_country", filters.destinationCountry);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.hsPrefix) q = q.ilike("hs_prefix", `${filters.hsPrefix}%`);

  const { data, error } = await q
    .order("destination_country")
    .order("hs_prefix")
    .limit(500);
  if (error) {
    console.error("listTariffRates failed", error);
    return [];
  }
  return (data ?? []) as TariffRateRowView[];
}

export async function listPortCountries(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ports").select("country").eq("is_active", true);
  const set = new Set<string>();
  for (const r of data ?? []) set.add(r.country);
  return [...set].sort();
}
