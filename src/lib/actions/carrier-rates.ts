"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { fetchRatesFromAll } from "@/lib/logistics/carriers/registry";
import type {
  AggregatedRateResponse,
  CarrierRateQuote,
  CarrierRateQuoteRequest,
} from "@/lib/logistics/carriers/types";
import type { TablesInsert } from "@/lib/supabase/database.types";

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

export async function fetchCarrierRates(
  request: CarrierRateQuoteRequest,
): Promise<ActionResult<AggregatedRateResponse>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!request.originCountry || !request.destinationCountry) {
    return { success: false, error: "Origin and destination country are required" };
  }
  try {
    const data = await fetchRatesFromAll(request);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Persist one carrier quote as a freight_lanes row (source = carrier_api).
 * Resolves port codes to port IDs. Safe to call repeatedly for the same
 * external_ref — creates a new row each time (no upsert); ops can deactivate
 * stale ones via the FreightLanesManager.
 */
export async function saveCarrierQuoteAsLane(args: {
  quote: CarrierRateQuote;
  request: CarrierRateQuoteRequest;
}): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const { quote, request } = args;
  const supabase = await createClient();

  let originPortId: string | null = null;
  let destinationPortId: string | null = null;
  if (request.originPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", request.originPortCode).maybeSingle();
    originPortId = data?.id ?? null;
  }
  if (request.destinationPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", request.destinationPortCode).maybeSingle();
    destinationPortId = data?.id ?? null;
  }

  const row: TablesInsert<"freight_lanes"> = {
    origin_port_id: originPortId,
    origin_country: originPortId ? null : request.originCountry,
    destination_port_id: destinationPortId,
    destination_country: destinationPortId ? null : request.destinationCountry,
    shipping_method: request.shippingMethod,
    container_type: request.containerType,
    base_rate: quote.baseMinor,
    per_container_rate: quote.perContainerMinor,
    per_cbm_rate: quote.perCbmMinor,
    per_kg_rate: quote.perKgMinor,
    min_charge: quote.minChargeMinor,
    fuel_surcharge_pct: quote.fuelSurchargePct,
    currency: quote.currency,
    transit_days_min: quote.transitDaysMin ?? null,
    transit_days_max: quote.transitDaysMax ?? null,
    source: "carrier_api",
    provider: quote.providerName,
    external_ref: quote.externalRef ?? null,
    valid_to: quote.validUntil ?? null,
    is_active: true,
  };

  const { data, error } = await supabase.from("freight_lanes").insert(row).select("id").single();
  if (error) return { success: false, error: error.message };

  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: data.id } };
}
