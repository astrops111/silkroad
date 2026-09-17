"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import {
  computeRfqFreight,
  normaliseExpenses,
  type RfqExpenseLine,
} from "@/lib/logistics/rates/rfq-freight";
import type { ShippingMethodDb } from "@/lib/queries/logistics-reference";
import type { Tables } from "@/lib/supabase/database.types";

const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type RfqShippingConfirmationRow = Tables<"rfq_shipping_confirmations">;
export type ShippingRateCardRow = Tables<"shipping_rates">;

async function requireAdminWrite(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.find((m) => WRITE_ROLES.includes(m.role))?.role;
  if (!user || !role) return { success: false, error: "Forbidden — admin role required" };
  return { success: true, data: { userId: user.id } };
}

function toIso2(s: string | undefined | null): string | null {
  if (!s) return null;
  const v = s.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

/** Empty string from a date input must become NULL, not an invalid date. */
function toDateOrNull(s: string | undefined | null): string | null {
  const v = s?.trim();
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export interface RfqShippingConfirmationInput {
  rfqId: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  shippingMethod: ShippingMethodDb;
  forwarder?: string;
  quoteReference?: string;
  /** ISO YYYY-MM-DD */
  quoteReceivedAt?: string;
  /** ISO YYYY-MM-DD */
  validUntil?: string;
  chargeableWeightKg?: number;
  volumeCbm?: number;
  cartonCount?: number;
  perKgRate?: number;
  perCbmRate?: number;
  minChargeableKg?: number;
  reboxFeePerCarton?: number;
  documentationFee?: number;
  expenses?: RfqExpenseLine[];
  currency?: string;
  sourceShippingRateId?: string | null;
  notes?: string;
  /** true = sign it off; false/omitted = save as draft. */
  confirm?: boolean;
}

/**
 * The confirmation for an RFQ plus the standing rate card matching its lane,
 * so a first-time form can prefill from the card ops already entered.
 */
export async function getRfqShippingContext(rfqId: string): Promise<
  ActionResult<{
    confirmation: RfqShippingConfirmationRow | null;
    suggestedRate: ShippingRateCardRow | null;
    originCountry: string | null;
    destinationCountry: string | null;
  }>
> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();

  const { data: confirmation } = await supabase
    .from("rfq_shipping_confirmations")
    .select("*")
    .eq("rfq_id", rfqId)
    .maybeSingle();

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, delivery_country")
    .eq("id", rfqId)
    .maybeSingle();

  // Origin comes from whichever suppliers have quoted this RFQ. When they
  // disagree there is no single origin to prefill, so leave it for ops.
  const { data: quotes } = await supabase
    .from("quotations")
    .select("supplier_id")
    .eq("rfq_id", rfqId);

  let originCountry: string | null = confirmation?.origin_country ?? null;
  if (!originCountry) {
    const supplierIds = [...new Set((quotes ?? []).map((q) => q.supplier_id).filter(Boolean))];
    if (supplierIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("country_code")
        .in("id", supplierIds as string[]);
      const codes = [...new Set((companies ?? []).map((c) => c.country_code).filter(Boolean))];
      if (codes.length === 1) originCountry = codes[0];
    }
  }

  const destinationCountry = confirmation?.destination_country ?? rfq?.delivery_country ?? null;

  let suggestedRate: ShippingRateCardRow | null = null;
  if (originCountry) {
    const method = confirmation?.shipping_method ?? "platform_express";
    const { data: rate } = await supabase
      .from("shipping_rates")
      .select("*")
      .eq("is_active", true)
      .eq("origin_country", originCountry)
      .eq("shipping_method", method)
      .maybeSingle();
    suggestedRate = rate ?? null;
  }

  return {
    success: true,
    data: { confirmation: confirmation ?? null, suggestedRate, originCountry, destinationCountry },
  };
}

/**
 * Save (and optionally confirm) the freight rates and expenses for an RFQ.
 * Totals are always recomputed here from the entered rates — the client's
 * previewed figures are never trusted.
 */
export async function saveRfqShippingConfirmation(
  input: RfqShippingConfirmationInput
): Promise<ActionResult<{ id: string; total: number }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const userId = gate.data!.userId;

  if (!input.rfqId) return { success: false, error: "Missing RFQ" };

  const expenses = normaliseExpenses(input.expenses);
  const totals = computeRfqFreight({
    chargeableWeightKg: input.chargeableWeightKg,
    volumeCbm: input.volumeCbm,
    cartonCount: input.cartonCount,
    perKgRate: input.perKgRate,
    perCbmRate: input.perCbmRate,
    minChargeableKg: input.minChargeableKg,
    reboxFeePerCarton: input.reboxFeePerCarton,
    documentationFee: input.documentationFee,
    expenses,
  });

  if (input.confirm && totals.total <= 0) {
    return {
      success: false,
      error: "Enter a freight rate or an expense before confirming — the total is zero.",
    };
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const row = {
    rfq_id: input.rfqId,
    origin_country: toIso2(input.originCountry),
    destination_country: toIso2(input.destinationCountry),
    shipping_method: input.shippingMethod,
    forwarder: input.forwarder?.trim() || null,
    quote_reference: input.quoteReference?.trim() || null,
    quote_received_at: toDateOrNull(input.quoteReceivedAt),
    valid_until: toDateOrNull(input.validUntil),
    chargeable_weight_kg: Number(input.chargeableWeightKg ?? 0),
    volume_cbm: Number(input.volumeCbm ?? 0),
    carton_count: Math.max(0, Math.round(Number(input.cartonCount ?? 0))),
    per_kg_rate: Math.max(0, Math.round(Number(input.perKgRate ?? 0))),
    per_cbm_rate: Math.max(0, Math.round(Number(input.perCbmRate ?? 0))),
    min_chargeable_kg: Number(input.minChargeableKg ?? 0),
    rebox_fee_per_carton: Math.max(0, Math.round(Number(input.reboxFeePerCarton ?? 0))),
    documentation_fee: Math.max(0, Math.round(Number(input.documentationFee ?? 0))),
    expenses: expenses.map((e) => ({ label: e.label, amount_minor: e.amountMinor })),
    freight_total: totals.freightTotal,
    expenses_total: totals.expensesTotal,
    total: totals.total,
    currency: (input.currency?.trim().toUpperCase() || "USD").slice(0, 3),
    source_shipping_rate_id: input.sourceShippingRateId || null,
    notes: input.notes?.trim() || null,
    created_by_user_id: userId,
    ...(input.confirm
      ? { status: "confirmed" as const, confirmed_by_user_id: userId, confirmed_at: nowIso }
      : { status: "draft" as const }),
  };

  // One row per RFQ (UNIQUE rfq_id) — upsert so re-saving edits in place.
  const { data, error } = await supabase
    .from("rfq_shipping_confirmations")
    .upsert(row, { onConflict: "rfq_id" })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/rfqs/${input.rfqId}`);
  return { success: true, data: { id: (data as { id: string }).id, total: totals.total } };
}

/** Reopen a confirmed row for editing without wiping the entered figures. */
export async function reopenRfqShippingConfirmation(rfqId: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const { error } = await supabase
    .from("rfq_shipping_confirmations")
    .update({ status: "draft", confirmed_by_user_id: null, confirmed_at: null })
    .eq("rfq_id", rfqId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/rfqs/${rfqId}`);
  return { success: true };
}
