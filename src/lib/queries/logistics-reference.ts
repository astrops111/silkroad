"use server";

import { createClient } from "@/lib/supabase/server";
import { shippingModeToMethod } from "@/lib/logistics/rates/config";
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

// ============================================================
// Shipping rate cards — the rates checkout actually charges.
// Keyed by (origin_country, shipping_method); origin_country NULL is the
// global default. There is no hardcoded fallback in the order route, so a
// lane with no card here cannot be checked out.
// ============================================================

export type ShippingRateRow = Tables<"shipping_rates">;

export interface ShippingRateListFilters {
  originCountry?: string;
  shippingMethod?: ShippingMethodDb;
  includeInactive?: boolean;
}

export async function listShippingRates(
  filters: ShippingRateListFilters = {}
): Promise<ShippingRateRow[]> {
  const supabase = await createClient();
  let q = supabase.from("shipping_rates").select("*");

  if (!filters.includeInactive) q = q.eq("is_active", true);
  if (filters.originCountry) q = q.eq("origin_country", filters.originCountry);
  if (filters.shippingMethod) q = q.eq("shipping_method", filters.shippingMethod);

  const { data, error } = await q
    .order("origin_country", { nullsFirst: true })
    .order("shipping_method")
    .limit(500);
  if (error) {
    console.error("listShippingRates failed", error);
    return [];
  }
  return data ?? [];
}

export interface MissingRateCard {
  originCountry: string;
  shippingMethod: ShippingMethodDb;
  productCount: number;
}

/**
 * Every (origin country, shipping method) combination that has active
 * products behind it but no active rate card — i.e. the lanes that will
 * reject checkout until ops enters a rate. Drives the alert on the
 * logistics reference page so the gap is visible before a buyer hits it.
 */
export async function listOriginsMissingRateCards(): Promise<MissingRateCard[]> {
  const supabase = await createClient();

  const [{ data: rates }, { data: suppliers }] = await Promise.all([
    supabase.from("shipping_rates").select("origin_country, shipping_method").eq("is_active", true),
    supabase.from("companies").select("id, country_code").not("country_code", "is", null),
  ]);

  const covered = new Set(
    (rates ?? []).map((r) => `${r.origin_country ?? "*"}::${r.shipping_method}`)
  );
  const countryBySupplier = new Map((suppliers ?? []).map((s) => [s.id, s.country_code]));

  const { data: products } = await supabase
    .from("products")
    .select("supplier_id, shipping_mode")
    .eq("is_active", true)
    .limit(20000);

  const counts = new Map<string, MissingRateCard>();
  for (const p of products ?? []) {
    const origin = countryBySupplier.get(p.supplier_id);
    if (!origin) continue;
    const method = shippingModeToMethod(p.shipping_mode) as ShippingMethodDb;
    if (covered.has(`${origin}::${method}`) || covered.has(`*::${method}`)) continue;

    const key = `${origin}::${method}`;
    const existing = counts.get(key);
    if (existing) existing.productCount += 1;
    else counts.set(key, { originCountry: origin, shippingMethod: method, productCount: 1 });
  }

  return [...counts.values()].sort((a, b) => b.productCount - a.productCount);
}

export async function listPortCountries(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ports").select("country").eq("is_active", true);
  const set = new Set<string>();
  for (const r of data ?? []) set.add(r.country);
  return [...set].sort();
}
