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
  const role = user?.company_members?.[0]?.role;
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
