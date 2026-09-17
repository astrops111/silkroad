"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type {
  ContainerType,
  PortType,
  RateSource,
  ShippingMethodDb,
} from "@/lib/queries/logistics-reference";

const REFERENCE_PATH = "/admin/logistics/reference";
const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult<{ role: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.find((m) => WRITE_ROLES.includes(m.role))?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { success: false, error: "Forbidden — admin role required" };
  }
  return { success: true, data: { role } };
}

function toIso2(s: string | undefined | null): string | null {
  if (!s) return null;
  const v = s.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

// ============================================================
// Ports
// ============================================================

export interface PortInput {
  id?: string;
  code: string;
  name: string;
  country: string;
  city?: string;
  portType: PortType;
  region?: string;
  latitude?: number;
  longitude?: number;
  isOrigin?: boolean;
  isDestination?: boolean;
  isActive?: boolean;
}

export async function upsertPort(input: PortInput): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const code = input.code?.trim().toUpperCase();
  const country = toIso2(input.country);
  const name = input.name?.trim();

  if (!code || code.length < 3) return { success: false, error: "Port code required (UN/LOCODE)" };
  if (!country) return { success: false, error: "Country must be a 2-letter ISO code" };
  if (!name) return { success: false, error: "Name required" };

  const supabase = await createClient();
  const row = {
    code,
    name,
    country,
    city: input.city?.trim() || null,
    port_type: input.portType,
    region: input.region ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    is_origin: input.isOrigin ?? false,
    is_destination: input.isDestination ?? false,
    is_active: input.isActive ?? true,
  };

  const op = input.id
    ? supabase.from("ports").update(row).eq("id", input.id).select("id").single()
    : supabase.from("ports").insert(row).select("id").single();

  const { data, error } = await op;
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: (data as { id: string }).id } };
}

export async function setPortActive(id: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("ports").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true };
}

// ============================================================
// Freight lanes
// ============================================================

export interface FreightLaneInput {
  id?: string;
  originPortId?: string | null;
  originCountry?: string | null;
  destinationPortId?: string | null;
  destinationCountry?: string | null;
  shippingMethod: ShippingMethodDb;
  containerType: ContainerType;
  baseRate?: number;
  perContainerRate?: number;
  perCbmRate?: number;
  perKgRate?: number;
  minCharge?: number;
  fuelSurchargePct?: number;
  currency?: string;
  transitDaysMin?: number;
  transitDaysMax?: number;
  consolidationDays?: number;
  source: RateSource;
  provider?: string;
  externalRef?: string;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

export async function upsertFreightLane(input: FreightLaneInput): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const originSpecified = Boolean(input.originPortId || toIso2(input.originCountry ?? undefined));
  const destSpecified = Boolean(input.destinationPortId || toIso2(input.destinationCountry ?? undefined));
  if (!originSpecified) return { success: false, error: "Set origin port or origin country" };
  if (!destSpecified) return { success: false, error: "Set destination port or destination country" };

  const supabase = await createClient();
  const row = {
    origin_port_id: input.originPortId ?? null,
    origin_country: toIso2(input.originCountry ?? undefined),
    destination_port_id: input.destinationPortId ?? null,
    destination_country: toIso2(input.destinationCountry ?? undefined),
    shipping_method: input.shippingMethod,
    container_type: input.containerType,
    base_rate: Math.round(input.baseRate ?? 0),
    per_container_rate: Math.round(input.perContainerRate ?? 0),
    per_cbm_rate: Math.round(input.perCbmRate ?? 0),
    per_kg_rate: Math.round(input.perKgRate ?? 0),
    min_charge: Math.round(input.minCharge ?? 0),
    fuel_surcharge_pct: input.fuelSurchargePct ?? 0,
    currency: (input.currency ?? "USD").toUpperCase(),
    transit_days_min: input.transitDaysMin ?? null,
    transit_days_max: input.transitDaysMax ?? null,
    consolidation_days: input.consolidationDays ?? null,
    source: input.source,
    provider: input.provider?.trim() || null,
    external_ref: input.externalRef?.trim() || null,
    valid_from: input.validFrom || null,
    valid_to: input.validTo || null,
    is_active: input.isActive ?? true,
  };

  const op = input.id
    ? supabase.from("freight_lanes").update(row).eq("id", input.id).select("id").single()
    : supabase.from("freight_lanes").insert(row).select("id").single();

  const { data, error } = await op;
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: (data as { id: string }).id } };
}

export async function setFreightLaneActive(id: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("freight_lanes").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true };
}

// ============================================================
// Tariff rates
// ============================================================

export interface TariffRateInput {
  id?: string;
  hsPrefix: string;
  destinationCountry: string;
  dutyPct?: number;
  vatPct?: number;
  excisePct?: number;
  otherFees?: Record<string, number>;
  preferentialRatePct?: number;
  preferentialOriginCountries?: string[];
  notes?: string;
  source: RateSource;
  provider?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export async function upsertTariffRate(input: TariffRateInput): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const hs = input.hsPrefix?.trim();
  const dest = toIso2(input.destinationCountry);
  if (!hs || hs.length < 2) return { success: false, error: "HS prefix required (≥2 digits)" };
  if (!dest) return { success: false, error: "Destination country must be 2-letter ISO" };

  const prefOrigins = (input.preferentialOriginCountries ?? [])
    .map((c) => toIso2(c))
    .filter((c): c is string => c !== null);

  const supabase = await createClient();
  const row = {
    hs_prefix: hs,
    destination_country: dest,
    duty_pct: input.dutyPct ?? 0,
    vat_pct: input.vatPct ?? 0,
    excise_pct: input.excisePct ?? 0,
    other_fees: input.otherFees ?? {},
    preferential_rate_pct: input.preferentialRatePct ?? null,
    preferential_origin_countries: prefOrigins.length > 0 ? prefOrigins : null,
    notes: input.notes?.trim() || null,
    source: input.source,
    provider: input.provider?.trim() || null,
    effective_from: input.effectiveFrom || null,
    effective_to: input.effectiveTo || null,
    is_active: input.isActive ?? true,
  };

  const op = input.id
    ? supabase.from("tariff_rates").update(row).eq("id", input.id).select("id").single()
    : supabase.from("tariff_rates").insert(row).select("id").single();

  const { data, error } = await op;
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: (data as { id: string }).id } };
}

export async function setTariffRateActive(id: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("tariff_rates").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true };
}

// ============================================================
// Shipping rate cards
// These are what checkout charges. POST /api/orders has no hardcoded
// fallback, so a lane with no active card here cannot be ordered — ops
// enters the card once the forwarder quote comes back.
// ============================================================

export interface ShippingRateInput {
  id?: string;
  /** null = global default applied to every origin without its own card. */
  originCountry?: string | null;
  shippingMethod: ShippingMethodDb;
  baseRate?: number;
  perKgRate?: number;
  perCbmRate?: number;
  minCharge?: number;
  /** Carrier minimum billable weight, e.g. air freight's MIN 100 KG. */
  minChargeableKg?: number;
  roundUpChargeableKg?: boolean;
  reboxFeePerCarton?: number;
  cartonVolumeCbm?: number | null;
  documentationFee?: number;
  /** null = freight is never waived on this lane. */
  freeShippingThreshold?: number | null;
  currency?: string;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  notes?: string;
  isActive?: boolean;
}

/** Money must be a whole, non-negative count of minor units. */
function minorUnits(value: number | undefined, fallback = 0): number {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export async function upsertShippingRate(
  input: ShippingRateInput
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  // null originCountry is meaningful (the global default), so only reject a
  // non-empty value that isn't a valid ISO-2 code.
  const rawOrigin = input.originCountry?.trim();
  const originCountry = rawOrigin ? toIso2(rawOrigin) : null;
  if (rawOrigin && !originCountry) {
    return {
      success: false,
      error: "Origin country must be a 2-letter ISO code, or blank for the global default",
    };
  }

  const reboxFee = minorUnits(input.reboxFeePerCarton);
  const cartonVolumeCbm =
    input.cartonVolumeCbm != null && Number(input.cartonVolumeCbm) > 0
      ? Number(input.cartonVolumeCbm)
      : null;
  if (reboxFee > 0 && !cartonVolumeCbm) {
    return {
      success: false,
      error: "A rebox fee needs a carton volume (CBM) to derive the carton count from",
    };
  }

  const minChargeableKg = Number(input.minChargeableKg ?? 0);
  if (!Number.isFinite(minChargeableKg) || minChargeableKg < 0) {
    return { success: false, error: "Minimum chargeable weight must be zero or more" };
  }

  const row = {
    origin_country: originCountry,
    shipping_method: input.shippingMethod,
    base_rate: minorUnits(input.baseRate),
    per_kg_rate: minorUnits(input.perKgRate),
    per_cbm_rate: minorUnits(input.perCbmRate),
    min_charge: minorUnits(input.minCharge),
    min_chargeable_kg: minChargeableKg,
    round_up_chargeable_kg: input.roundUpChargeableKg ?? false,
    rebox_fee_per_carton: reboxFee,
    carton_volume_cbm: cartonVolumeCbm,
    documentation_fee: minorUnits(input.documentationFee),
    free_shipping_threshold:
      input.freeShippingThreshold == null ? null : minorUnits(input.freeShippingThreshold),
    currency: (input.currency?.trim().toUpperCase() || "USD").slice(0, 3),
    estimated_days_min: input.estimatedDaysMin ?? null,
    estimated_days_max: input.estimatedDaysMax ?? null,
    notes: input.notes?.trim() || null,
    is_active: input.isActive ?? true,
  };

  const supabase = await createClient();
  const op = input.id
    ? supabase.from("shipping_rates").update(row).eq("id", input.id).select("id").single()
    : supabase.from("shipping_rates").insert(row).select("id").single();

  const { data, error } = await op;
  if (error) {
    // Migration 00139 enforces one active card per (origin, method).
    if (error.code === "23505") {
      return {
        success: false,
        error: `An active rate card already exists for ${originCountry ?? "the global default"} · ${input.shippingMethod}. Edit that one instead.`,
      };
    }
    return { success: false, error: error.message };
  }
  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: (data as { id: string }).id } };
}

export async function setShippingRateActive(id: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rates")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true };
}
