"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import {
  DBFreightLaneProvider,
  DBFxProvider,
  DBTariffProvider,
  quoteLandedCost,
  type CargoItem,
  type ContainerType,
  type CostBreakdown,
  type InsuranceMode,
  type LandedCostInput,
  type ShippingMethod,
  type TradeTerm,
} from "@/lib/logistics/landed-cost";
import type { Json, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type {
  OpsFreightQuoteRow,
  OpsQuoteRequesterType,
  OpsQuoteStatus,
} from "@/lib/queries/ops-freight-quotes";
import { screenOpsQuoteRequester } from "@/lib/screening/run";

const QUOTES_PATH = "/admin/logistics/quotes";
const SCREENING_PATH = "/admin/logistics/screening";
const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult<{ role: string; userId: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { success: false, error: "Forbidden — admin role required" };
  }
  return { success: true, data: { role, userId: user!.id } };
}

function quoteNumber(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `FQT-${y}${m}-${suffix}`;
}

// ============================================================
// Engine input shape used by the form (matches LandedCostInput
// but with a few extra ops-only fields so we can persist context).
// ============================================================
export interface OpsQuoteFormInput {
  // Requester
  requesterType: OpsQuoteRequesterType;
  requesterName?: string;
  requesterCompany?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterCountry?: string;
  sourceChannel?: string;
  sourceReference?: string;

  // Cargo (line items + flags)
  items: CargoItem[];
  cargoDescription?: string;
  isFragile?: boolean;
  requiresColdChain?: boolean;
  isHazardous?: boolean;
  goodsValueOverrideMinor?: number;
  goodsCurrency?: string;          // currency for goods + outputs

  // Routing
  originPortCode?: string;
  originCountry: string;
  destinationPortCode?: string;
  destinationCountry: string;
  shippingMethod: ShippingMethod;
  containerType: ContainerType;
  containerCount?: number;
  trade_term: TradeTerm;
  firstMileMinor?: number;
  lastMileMinor?: number;
  handlingFeeMinor?: number;
  insurance?: InsuranceMode;
  markupMultiplier?: number;

  // Timing
  cargoReadyDate?: string;
  requiredBy?: string;
  validUntil?: string;

  // Misc
  assignedToUserId?: string;
  notes?: string;
}

function toLandedCostInput(form: OpsQuoteFormInput): LandedCostInput {
  return {
    items: form.items,
    currency: form.goodsCurrency ?? "USD",
    origin: { portCode: form.originPortCode, country: form.originCountry },
    destination: { portCode: form.destinationPortCode, country: form.destinationCountry },
    shippingMethod: form.shippingMethod,
    containerType: form.containerType,
    incoterm: form.trade_term,
    insurance: form.insurance,
    markupMultiplier: form.markupMultiplier,
    handlingFeeMinor: form.handlingFeeMinor,
    containerCount: form.containerCount,
    goodsValueOverrideMinor: form.goodsValueOverrideMinor,
    firstMileMinor: form.firstMileMinor,
    lastMileMinor: form.lastMileMinor,
  };
}

const lanes = new DBFreightLaneProvider();
const tariffs = new DBTariffProvider();
const fx = new DBFxProvider();

// ============================================================
// previewLandedCost — runs the engine without persisting anything.
// The form calls this on demand so ops can iterate before saving.
// ============================================================
export async function previewLandedCost(form: OpsQuoteFormInput): Promise<ActionResult<CostBreakdown>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!form.items || form.items.length === 0) {
    return { success: false, error: "At least one cargo line is required" };
  }
  if (!form.originCountry || !form.destinationCountry) {
    return { success: false, error: "Origin and destination country are required" };
  }
  try {
    const breakdown = await quoteLandedCost(toLandedCostInput(form), { lanes, tariffs, fx });
    return { success: true, data: breakdown };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// createOpsQuote — persists a new quote + computed cost_components.
//
// Screening runs after the engine and before the insert. The quote
// ID is generated client-side so the screening_checks row can
// reference it in the same flow. Hits land the quote in
// 'pending_screening' for the admin queue; clears proceed to
// 'draft' as before. Either way an audit row is written.
// ============================================================
export async function createOpsQuote(
  form: OpsQuoteFormInput,
): Promise<ActionResult<{ id: string; quoteNumber: string; status: OpsQuoteStatus; screeningCheckId?: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!form.originCountry || !form.destinationCountry) {
    return { success: false, error: "Origin and destination country are required" };
  }

  const breakdown = form.items.length > 0
    ? await quoteLandedCost(toLandedCostInput(form), { lanes, tariffs, fx })
    : null;

  const supabase = await createClient();
  const number = quoteNumber();
  const quoteId = randomUUID();

  // Run screening before persisting the quote. Provider failures
  // ('error' result) are treated as clear at the quote level — the
  // audit row records the error so compliance can manually re-screen.
  const screening = await screenOpsQuoteRequester(supabase, quoteId, {
    name: form.requesterName,
    company: form.requesterCompany,
    country: form.requesterCountry,
    email: form.requesterEmail,
    phone: form.requesterPhone,
  });
  const initialStatus: OpsQuoteStatus = screening.result === "hit" ? "pending_screening" : "draft";

  const row: TablesInsert<"ops_freight_quotes"> = {
    id: quoteId,
    quote_number: number,
    created_by_user_id: gate.data!.userId,
    assigned_to_user_id: form.assignedToUserId ?? gate.data!.userId,
    requester_type: form.requesterType,
    requester_name: form.requesterName ?? null,
    requester_company: form.requesterCompany ?? null,
    requester_email: form.requesterEmail ?? null,
    requester_phone: form.requesterPhone ?? null,
    requester_country: form.requesterCountry ?? null,
    source_channel: form.sourceChannel ?? null,
    source_reference: form.sourceReference ?? null,

    cargo_description: form.cargoDescription ?? null,
    hs_codes: form.items.map((i) => i.hsCode),
    total_weight_kg: breakdown?.totals.weightKg ?? null,
    total_volume_cbm: breakdown?.totals.volumeCbm ?? null,
    package_count: form.items.reduce((s, i) => s + i.quantity, 0) || null,
    is_fragile: form.isFragile ?? false,
    requires_cold_chain: form.requiresColdChain ?? false,
    is_hazardous: form.isHazardous ?? false,

    goods_value: form.goodsValueOverrideMinor
      ?? form.items.reduce((s, i) => s + Math.round(i.unitCostMinor * i.quantity), 0)
      ?? null,
    goods_currency: form.goodsCurrency ?? "USD",

    origin_country: form.originCountry,
    destination_country: form.destinationCountry,
    shipping_method: form.shippingMethod,
    container_type: form.containerType,
    trade_term: form.trade_term,

    cargo_ready_date: form.cargoReadyDate || null,
    required_by: form.requiredBy || null,
    valid_until: form.validUntil || null,

    cost_components: (breakdown ?? null) as Json | null,
    quoted_amount: breakdown?.totalMinor ?? null,
    quoted_currency: breakdown?.currency ?? form.goodsCurrency ?? "USD",

    status: initialStatus,
    screening_check_id: screening.checkId,
    notes: form.notes ?? null,
    metadata: { lineItems: form.items as unknown as Json } as Json,
  };

  // Resolve port IDs if codes given
  if (form.originPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", form.originPortCode).maybeSingle();
    row.origin_port_id = data?.id ?? null;
  }
  if (form.destinationPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", form.destinationPortCode).maybeSingle();
    row.destination_port_id = data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("ops_freight_quotes")
    .insert(row)
    .select("id, quote_number, status")
    .single();
  if (error) return { success: false, error: error.message };

  revalidatePath(QUOTES_PATH);
  if (initialStatus === "pending_screening") revalidatePath(SCREENING_PATH);
  return {
    success: true,
    data: {
      id: data.id,
      quoteNumber: data.quote_number,
      status: data.status as OpsQuoteStatus,
      screeningCheckId: screening.checkId ?? undefined,
    },
  };
}

// ============================================================
// updateOpsQuote — re-runs the engine with the latest form input
// and overwrites the persisted breakdown + quoted_amount.
// ============================================================
export async function updateOpsQuote(
  id: string,
  form: OpsQuoteFormInput,
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const breakdown = form.items.length > 0
    ? await quoteLandedCost(toLandedCostInput(form), { lanes, tariffs, fx })
    : null;

  const supabase = await createClient();
  const update: TablesUpdate<"ops_freight_quotes"> = {
    requester_type: form.requesterType,
    requester_name: form.requesterName ?? null,
    requester_company: form.requesterCompany ?? null,
    requester_email: form.requesterEmail ?? null,
    requester_phone: form.requesterPhone ?? null,
    requester_country: form.requesterCountry ?? null,
    source_channel: form.sourceChannel ?? null,
    source_reference: form.sourceReference ?? null,
    assigned_to_user_id: form.assignedToUserId ?? undefined,

    cargo_description: form.cargoDescription ?? null,
    hs_codes: form.items.map((i) => i.hsCode),
    total_weight_kg: breakdown?.totals.weightKg ?? null,
    total_volume_cbm: breakdown?.totals.volumeCbm ?? null,
    package_count: form.items.reduce((s, i) => s + i.quantity, 0) || null,
    is_fragile: form.isFragile ?? false,
    requires_cold_chain: form.requiresColdChain ?? false,
    is_hazardous: form.isHazardous ?? false,

    goods_value: form.goodsValueOverrideMinor
      ?? form.items.reduce((s, i) => s + Math.round(i.unitCostMinor * i.quantity), 0)
      ?? null,
    goods_currency: form.goodsCurrency ?? "USD",

    origin_country: form.originCountry,
    destination_country: form.destinationCountry,
    shipping_method: form.shippingMethod,
    container_type: form.containerType,
    trade_term: form.trade_term,

    cargo_ready_date: form.cargoReadyDate || null,
    required_by: form.requiredBy || null,
    valid_until: form.validUntil || null,

    cost_components: (breakdown ?? null) as Json | null,
    quoted_amount: breakdown?.totalMinor ?? null,
    quoted_currency: breakdown?.currency ?? form.goodsCurrency ?? "USD",

    notes: form.notes ?? null,
    metadata: { lineItems: form.items as unknown as Json } as Json,
  };

  if (form.originPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", form.originPortCode).maybeSingle();
    update.origin_port_id = data?.id ?? null;
  } else {
    update.origin_port_id = null;
  }
  if (form.destinationPortCode) {
    const { data } = await supabase.from("ports").select("id").eq("code", form.destinationPortCode).maybeSingle();
    update.destination_port_id = data?.id ?? null;
  } else {
    update.destination_port_id = null;
  }

  const { error } = await supabase.from("ops_freight_quotes").update(update).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(QUOTES_PATH);
  revalidatePath(`${QUOTES_PATH}/${id}`);
  return { success: true };
}

// ============================================================
// setOpsQuoteStatus — lifecycle transitions. Stamps sent_at/responded_at.
// ============================================================
export async function setOpsQuoteStatus(
  id: string,
  status: OpsQuoteStatus,
  notes?: string,
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const update: TablesUpdate<"ops_freight_quotes"> = { status };
  if (status === "sent") update.sent_at = new Date().toISOString();
  if (status === "accepted" || status === "declined") update.responded_at = new Date().toISOString();
  if (notes) update.outcome_notes = notes;

  const { error } = await supabase.from("ops_freight_quotes").update(update).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(QUOTES_PATH);
  revalidatePath(`${QUOTES_PATH}/${id}`);
  return { success: true };
}

// Convenience: pull the cost_components JSONB back as a CostBreakdown.
// Stored shape is identical so the cast is safe.
export function readCostBreakdown(row: OpsFreightQuoteRow): CostBreakdown | null {
  if (!row.cost_components) return null;
  return row.cost_components as unknown as CostBreakdown;
}

// ============================================================
// convertOpsQuoteToShipment — materialize a b2b_shipments row
// from an accepted ops freight quote. Carries the cost_components
// forward into shipment.cost_breakdown so the shipment inherits
// the engine's pricing context.
// ============================================================
export async function convertOpsQuoteToShipment(
  quoteId: string,
): Promise<ActionResult<{ shipmentId: string; shipmentNumber: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();

  const { data: quote, error: qErr } = await supabase
    .from("ops_freight_quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (qErr || !quote) return { success: false, error: qErr?.message ?? "Quote not found" };
  if (quote.status !== "accepted") {
    return { success: false, error: `Quote must be 'accepted' to convert (current: ${quote.status})` };
  }
  if (quote.converted_shipment_id) {
    return { success: false, error: "Quote is already converted to a shipment" };
  }
  if (!quote.shipping_method) {
    return { success: false, error: "Quote is missing shipping method" };
  }

  const shipmentNumber = `SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const breakdown = quote.cost_components as unknown as CostBreakdown | null;
  const quotedCurrency = quote.quoted_currency ?? "USD";

  // Snapshot the FX rate to USD at conversion time so accounting
  // reconciles invoices against the rate the price was set on, not
  // the rate weeks later when the carrier invoice arrives.
  const fxToUsd = quotedCurrency === "USD" ? 1 : await fx.getRate(quotedCurrency, "USD");

  const row: TablesInsert<"b2b_shipments"> = {
    supplier_order_id: null,
    ops_freight_quote_id: quote.id,
    shipment_number: shipmentNumber,
    shipping_method: quote.shipping_method,

    pickup_country: quote.origin_country,
    delivery_country: quote.destination_country,
    delivery_contact_name: quote.requester_name,
    delivery_contact_phone: quote.requester_phone,

    package_count: quote.package_count ?? 1,
    total_weight_kg: quote.total_weight_kg,
    total_volume_cbm: quote.total_volume_cbm,
    is_fragile: quote.is_fragile ?? false,
    requires_cold_chain: quote.requires_cold_chain ?? false,
    is_hazardous: quote.is_hazardous ?? false,
    package_description: quote.cargo_description,

    shipping_cost: quote.quoted_amount ?? 0,
    currency: quotedCurrency,
    cost_breakdown: (breakdown ?? null) as Json | null,

    quoted_total_minor: quote.quoted_amount ?? 0,
    quoted_currency: quotedCurrency,
    quoted_fx_rate_to_usd: fxToUsd,
    quoted_at: new Date().toISOString(),

    trade_term: quote.trade_term,
    hs_codes: quote.hs_codes,

    status: "pending",
  };

  const { data: inserted, error: sErr } = await supabase
    .from("b2b_shipments")
    .insert(row)
    .select("id, shipment_number")
    .single();
  if (sErr) return { success: false, error: sErr.message };

  // Link the quote back to the new shipment.
  const { error: linkErr } = await supabase
    .from("ops_freight_quotes")
    .update({ converted_shipment_id: inserted.id })
    .eq("id", quote.id);
  if (linkErr) {
    // Shipment exists but link failed — surface but don't unwind.
    console.error("convertOpsQuoteToShipment: shipment created, link failed", linkErr);
  }

  revalidatePath(QUOTES_PATH);
  revalidatePath(`${QUOTES_PATH}/${quote.id}`);
  revalidatePath(`/admin/logistics/shipments/${inserted.id}`);
  return { success: true, data: { shipmentId: inserted.id, shipmentNumber: inserted.shipment_number } };
}
