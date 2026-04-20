"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCallerTierStatus, PaidTierRequiredError } from "@/lib/auth/tier";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: "unauthorized" | "paid_tier_required" | "invalid_input" | "db_error";
};

function rfqNumber() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `RFQ-R-${y}${m}-${suffix}`;
}

function quotationNumber() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `QUO-R-${y}${m}-${suffix}`;
}

export interface CreateResourceRfqInput {
  title: string;
  description?: string;
  resourceCategoryId?: string;
  commodityId?: string;
  quantity: number;
  unitOfMeasure: string; // 'MT' | 'BDMT' | 'm3' | 'troy_oz' | 'kg' | 'TEU'
  targetPricePerUnitUsd?: number;
  incoterm?: "fob" | "cif" | "cfr" | "dap" | "exw";
  portOfLoading?: string;
  portOfDischarge?: string;
  shipmentWindowStart?: string; // ISO date
  shipmentWindowEnd?: string;
  paymentInstrument?: "lc_at_sight" | "lc_usance" | "tt_advance" | "tt_against_docs";
  specifications?: Record<string, unknown>;
  buyerCompanyId: string;
}

export async function createResourceRfq(
  input: CreateResourceRfqInput
): Promise<ActionResult<{ id: string; rfq_number: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }
  if (!tier.paidCompanyIds.includes(input.buyerCompanyId)) {
    return {
      success: false,
      error:
        "Requesting quotes is a paid-tier feature. Upgrade your company account to Standard or Gold to continue.",
      code: "paid_tier_required",
    };
  }
  if (!input.title || !input.quantity || !input.unitOfMeasure) {
    return { success: false, error: "Missing required fields", code: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Profile missing", code: "unauthorized" };

  // Target price is stored in minor units for compatibility with the
  // existing rfqs.target_price column (BIGINT). We use cents on the USD
  // reference price, with the numeric price kept on quotations.
  const targetPriceMinor =
    input.targetPricePerUnitUsd != null
      ? Math.round(input.targetPricePerUnitUsd * 100)
      : null;

  const { data, error } = await supabase
    .from("rfqs")
    .insert({
      rfq_number: rfqNumber(),
      buyer_user_id: profile.id,
      buyer_company_id: input.buyerCompanyId,
      title: input.title,
      description: input.description ?? null,
      resource_category_id: input.resourceCategoryId ?? null,
      commodity_id: input.commodityId ?? null,
      quantity: Math.max(1, Math.floor(input.quantity)),
      quantity_numeric: input.quantity,
      unit: input.unitOfMeasure,
      unit_of_measure: input.unitOfMeasure,
      target_price: targetPriceMinor,
      target_currency: "USD",
      trade_term: input.incoterm ?? null,
      port_of_loading: input.portOfLoading ?? null,
      port_of_discharge: input.portOfDischarge ?? null,
      shipment_window_start: input.shipmentWindowStart ?? null,
      shipment_window_end: input.shipmentWindowEnd ?? null,
      payment_instrument: input.paymentInstrument ?? null,
      specifications: input.specifications ?? {},
      is_public: true,
      status: "open",
      published_at: new Date().toISOString(),
    })
    .select("id, rfq_number")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("policy")) {
      return {
        success: false,
        error:
          "Your account tier does not permit creating RFQs. Upgrade to Standard or Gold to continue.",
        code: "paid_tier_required",
      };
    }
    return { success: false, error: error.message, code: "db_error" };
  }

  return { success: true, data };
}

export interface SubmitResourceQuoteInput {
  rfqId: string;
  supplierCompanyId: string;
  unitPriceUsd: number;
  quantity: number;
  unitOfMeasure: string;
  incoterm?: "fob" | "cif" | "cfr" | "dap" | "exw";
  portOfLoading?: string;
  portOfDischarge?: string;
  leadTimeDays?: number;
  validityDays?: number;
  paymentInstrument?: "lc_at_sight" | "lc_usance" | "tt_advance" | "tt_against_docs";
  inspectionAgency?: "SGS" | "BV" | "Intertek" | "CCIC";
  notes?: string;
}

export async function submitResourceQuote(
  input: SubmitResourceQuoteInput
): Promise<ActionResult<{ id: string; quotation_number: string }>> {
  const tier = await getCallerTierStatus();
  if (!tier.authenticated) {
    return { success: false, error: "Please sign in", code: "unauthorized" };
  }
  if (!tier.paidCompanyIds.includes(input.supplierCompanyId)) {
    return {
      success: false,
      error:
        "Sending quotes is a paid-tier feature. Upgrade your supplier account to Standard or Gold to continue.",
      code: "paid_tier_required",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", code: "unauthorized" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Profile missing", code: "unauthorized" };

  const totalAmountMinor = Math.round(input.unitPriceUsd * input.quantity * 100);

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      quotation_number: quotationNumber(),
      rfq_id: input.rfqId,
      supplier_id: input.supplierCompanyId,
      supplier_user_id: profile.id,
      total_amount: totalAmountMinor,
      currency: "USD",
      unit_price_usd: input.unitPriceUsd,
      quantity_numeric: input.quantity,
      unit_of_measure: input.unitOfMeasure,
      trade_term: input.incoterm ?? null,
      port_of_loading: input.portOfLoading ?? null,
      port_of_discharge: input.portOfDischarge ?? null,
      lead_time_days: input.leadTimeDays ?? null,
      validity_days: input.validityDays ?? 30,
      payment_instrument: input.paymentInstrument ?? null,
      inspection_agency: input.inspectionAgency ?? null,
      notes: input.notes ?? null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id, quotation_number")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("policy")) {
      return {
        success: false,
        error:
          "Your supplier account tier does not permit submitting quotes. Upgrade to Standard or Gold to continue.",
        code: "paid_tier_required",
      };
    }
    return { success: false, error: error.message, code: "db_error" };
  }

  return { success: true, data };
}

export { PaidTierRequiredError };
