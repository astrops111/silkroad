"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { addTrackingEvent } from "@/lib/actions/tracking";
import { recomputeActuals } from "@/lib/actions/cost-actuals";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type { CustomsHoldReason, CustomsStatus } from "@/lib/queries/customs";

const SHIPMENTS_PATH = "/admin/logistics/shipments";
const CUSTOMS_PATH = "/admin/logistics/customs";
const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { success: false, error: "Forbidden — admin role required" };
  }
  return { success: true, data: { userId: user!.id } };
}

// ============================================================
// Set the customs status manually. Stamps customs_filed_at on
// 'submitted' and customs_cleared_at on 'cleared' the first time
// the transition happens. Records a tracking event so the timeline
// reflects the workflow change.
// ============================================================
export async function setCustomsStatus(
  shipmentId: string,
  status: CustomsStatus,
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();

  // Read current to know whether to stamp first-transition timestamps.
  const { data: existing, error: readErr } = await supabase
    .from("b2b_shipments")
    .select("customs_status, customs_filed_at, customs_cleared_at")
    .eq("id", shipmentId)
    .maybeSingle();
  if (readErr || !existing) return { success: false, error: readErr?.message ?? "Shipment not found" };
  if (existing.customs_status === status) {
    return { success: true };          // no-op
  }

  const now = new Date().toISOString();
  const update: TablesUpdate<"b2b_shipments"> = { customs_status: status };
  if (status === "submitted" && !existing.customs_filed_at) update.customs_filed_at = now;
  if (status === "cleared" && !existing.customs_cleared_at) update.customs_cleared_at = now;

  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", shipmentId);
  if (error) return { success: false, error: error.message };

  await addTrackingEvent({
    shipmentId,
    eventType: `customs_${status}`,
    description: `Customs status: ${existing.customs_status ?? "—"} → ${status}`,
  });

  revalidatePath(`${SHIPMENTS_PATH}/${shipmentId}`);
  revalidatePath(CUSTOMS_PATH);
  return { success: true };
}

// ============================================================
// Save broker + declaration metadata. Allows partial updates so
// the form can save broker details before a declaration # exists.
// ============================================================
export interface CustomsBrokerInput {
  shipmentId: string;
  brokerName?: string;
  brokerRef?: string;
  declarationNo?: string;
  notes?: string;
}

export async function saveCustomsBroker(input: CustomsBrokerInput): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const update: TablesUpdate<"b2b_shipments"> = {
    customs_broker_name: input.brokerName?.trim() || null,
    customs_broker_ref: input.brokerRef?.trim() || null,
    customs_declaration_no: input.declarationNo?.trim() || null,
    customs_notes: input.notes?.trim() || null,
  };

  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", input.shipmentId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  return { success: true };
}

// ============================================================
// Open a hold against a shipment. Also flips customs_status to
// 'on_hold' so the queue surfaces it. Hold reason + notes required.
// ============================================================
export interface OpenHoldInput {
  shipmentId: string;
  reason: CustomsHoldReason;
  notes: string;
  externalRef?: string;
}

export async function openCustomsHold(input: OpenHoldInput): Promise<ActionResult<{ holdId: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!input.notes || input.notes.trim().length < 5) {
    return { success: false, error: "Hold notes are required (min 5 chars)" };
  }

  const supabase = await createClient();
  const insert: TablesInsert<"customs_holds"> = {
    shipment_id: input.shipmentId,
    reason: input.reason,
    notes: input.notes.trim(),
    external_ref: input.externalRef?.trim() || null,
    opened_by: gate.data!.userId,
  };

  const { data, error } = await supabase
    .from("customs_holds")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  // Flip the shipment to on_hold (don't override 'rejected' or 'cleared').
  await supabase
    .from("b2b_shipments")
    .update({ customs_status: "on_hold" })
    .eq("id", input.shipmentId)
    .not("customs_status", "in", `("cleared","rejected")`);

  await addTrackingEvent({
    shipmentId: input.shipmentId,
    eventType: "customs_hold_opened",
    description: `Customs hold (${input.reason}): ${input.notes.trim()}`,
  });

  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  revalidatePath(CUSTOMS_PATH);
  return { success: true, data: { holdId: data.id } };
}

// ============================================================
// Resolve an open hold. If no other holds remain open on the
// shipment, customs_status is set back to 'submitted' so ops sees
// "filed, awaiting clearance" instead of staying stuck on 'on_hold'.
// ============================================================
export async function resolveCustomsHold(holdId: string, resolutionNotes: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!resolutionNotes || resolutionNotes.trim().length < 5) {
    return { success: false, error: "Resolution notes are required (min 5 chars)" };
  }

  const supabase = await createClient();

  const { data: hold, error: readErr } = await supabase
    .from("customs_holds")
    .select("shipment_id, resolved_at")
    .eq("id", holdId)
    .maybeSingle();
  if (readErr || !hold) return { success: false, error: readErr?.message ?? "Hold not found" };
  if (hold.resolved_at) return { success: false, error: "Hold already resolved" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("customs_holds")
    .update({
      resolved_at: now,
      resolved_by: gate.data!.userId,
      resolution_notes: resolutionNotes.trim(),
    })
    .eq("id", holdId);
  if (error) return { success: false, error: error.message };

  // Are there other open holds on this shipment?
  const { count } = await supabase
    .from("customs_holds")
    .select("*", { count: "exact", head: true })
    .eq("shipment_id", hold.shipment_id)
    .is("resolved_at", null);

  if ((count ?? 0) === 0) {
    // No more open holds — push status back to 'submitted' (assume the
    // declaration is still in flight). Ops can advance to 'cleared' explicitly.
    await supabase
      .from("b2b_shipments")
      .update({ customs_status: "submitted" })
      .eq("id", hold.shipment_id)
      .eq("customs_status", "on_hold");
  }

  await addTrackingEvent({
    shipmentId: hold.shipment_id,
    eventType: "customs_hold_resolved",
    description: `Hold resolved: ${resolutionNotes.trim()}`,
  });

  revalidatePath(`${SHIPMENTS_PATH}/${hold.shipment_id}`);
  revalidatePath(CUSTOMS_PATH);
  return { success: true };
}

// ============================================================
// Mark cleared with the actual duty / VAT / other fees paid. These
// values are also written as cost_actuals lines so the cost variance
// engine picks them up — ops doesn't have to enter them twice.
// ============================================================
export interface MarkClearedInput {
  shipmentId: string;
  declarationNo?: string;
  brokerName?: string;
  brokerRef?: string;
  dutyPaidMinor?: number;
  vatPaidMinor?: number;
  otherPaidMinor?: number;
  paidCurrency: string;
  notes?: string;
}

export async function markCustomsCleared(input: MarkClearedInput): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!input.paidCurrency || input.paidCurrency.length !== 3) {
    return { success: false, error: "Paid currency (3-letter ISO) is required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const update: TablesUpdate<"b2b_shipments"> = {
    customs_status: "cleared",
    customs_cleared_at: now,
    customs_paid_currency: input.paidCurrency.toUpperCase(),
    customs_duty_paid_minor: input.dutyPaidMinor ?? null,
    customs_vat_paid_minor: input.vatPaidMinor ?? null,
    customs_other_paid_minor: input.otherPaidMinor ?? null,
    ...(input.declarationNo && { customs_declaration_no: input.declarationNo }),
    ...(input.brokerName && { customs_broker_name: input.brokerName }),
    ...(input.brokerRef && { customs_broker_ref: input.brokerRef }),
    ...(input.notes && { customs_notes: input.notes }),
  };

  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", input.shipmentId);
  if (error) return { success: false, error: error.message };

  // Mirror duty / VAT / other into cost_actuals so the variance card
  // already shows actuals for these categories the moment cleared
  // is recorded. Ops doesn't have to also enter them in CostActualsPanel.
  const actuals: TablesInsert<"b2b_shipment_cost_actuals">[] = [];
  if (input.dutyPaidMinor) actuals.push({
    shipment_id: input.shipmentId, category: "customs_duty",
    amount_minor: input.dutyPaidMinor, currency: input.paidCurrency.toUpperCase(),
    vendor: input.brokerName ?? "Customs",
    invoice_ref: input.declarationNo ?? null,
    invoice_date: now.slice(0, 10),
    notes: "Auto-recorded on customs clearance",
    created_by: gate.data!.userId,
  });
  if (input.vatPaidMinor) actuals.push({
    shipment_id: input.shipmentId, category: "customs_vat",
    amount_minor: input.vatPaidMinor, currency: input.paidCurrency.toUpperCase(),
    vendor: input.brokerName ?? "Customs",
    invoice_ref: input.declarationNo ?? null,
    invoice_date: now.slice(0, 10),
    notes: "Auto-recorded on customs clearance",
    created_by: gate.data!.userId,
  });
  if (input.otherPaidMinor) actuals.push({
    shipment_id: input.shipmentId, category: "customs_other",
    amount_minor: input.otherPaidMinor, currency: input.paidCurrency.toUpperCase(),
    vendor: input.brokerName ?? "Customs",
    invoice_ref: input.declarationNo ?? null,
    invoice_date: now.slice(0, 10),
    notes: "Auto-recorded on customs clearance (excise / IDF / RDL / etc.)",
    created_by: gate.data!.userId,
  });
  if (actuals.length > 0) {
    const { error: actErr } = await supabase.from("b2b_shipment_cost_actuals").insert(actuals);
    if (actErr) console.error("markCustomsCleared: cost actuals insert failed", actErr);
    else await recomputeActuals(input.shipmentId);
  }

  await addTrackingEvent({
    shipmentId: input.shipmentId,
    eventType: "customs_cleared",
    description: input.declarationNo
      ? `Customs cleared (declaration ${input.declarationNo})`
      : "Customs cleared",
  });

  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  revalidatePath(CUSTOMS_PATH);
  return { success: true };
}
