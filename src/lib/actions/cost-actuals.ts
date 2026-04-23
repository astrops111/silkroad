"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { DBFxProvider } from "@/lib/logistics/landed-cost";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type { ShipmentCostCategory } from "@/lib/queries/cost-actuals";

const SHIPMENTS_PATH = "/admin/logistics/shipments";
const WRITE_ROLES = ["admin_super", "admin_moderator"];
const fx = new DBFxProvider();

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

export interface CostActualInput {
  shipmentId: string;
  category: ShipmentCostCategory;
  vendor?: string;
  invoiceRef?: string;
  invoiceDate?: string;             // ISO date
  amountMinor: number;
  currency: string;
  notes?: string;
  attachmentUrl?: string;
}

// Recompute the shipment's actual_total_minor by summing every line
// converted into the shipment's currency. The variance column is
// auto-derived (GENERATED ALWAYS AS) so we don't write it directly.
// Exported so other server actions (e.g. customs clearance auto-
// recording duty/VAT lines) can refresh the rollup in one call.
export async function recomputeActuals(shipmentId: string): Promise<void> {
  const supabase = await createClient();

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("currency, quoted_currency")
    .eq("id", shipmentId)
    .maybeSingle();
  // Prefer quoted_currency if set (post-Phase 2 shipments); fall back to
  // legacy `currency` column for shipments created before the snapshot
  // columns existed.
  const targetCurrency = shipment?.quoted_currency ?? shipment?.currency ?? "USD";

  const { data: lines } = await supabase
    .from("b2b_shipment_cost_actuals")
    .select("amount_minor, currency, fx_rate_to_usd")
    .eq("shipment_id", shipmentId);

  if (!lines || lines.length === 0) {
    await supabase
      .from("b2b_shipments")
      .update({ actual_total_minor: null, actual_currency: null, actual_recorded_at: null })
      .eq("id", shipmentId);
    return;
  }

  let totalInTarget = 0;
  for (const line of lines) {
    if (line.currency === targetCurrency) {
      totalInTarget += line.amount_minor;
      continue;
    }
    const rate = await fx.getRate(line.currency, targetCurrency);
    if (rate && rate > 0) {
      totalInTarget += Math.round(line.amount_minor * rate);
    } else {
      // No FX → drop the line out of the total but keep the row. Better
      // to under-report than to silently treat a foreign amount as
      // local-currency. Surface via the UI later.
      console.warn(`recomputeActuals: missing FX ${line.currency}->${targetCurrency} on ${shipmentId}`);
    }
  }

  await supabase
    .from("b2b_shipments")
    .update({
      actual_total_minor: totalInTarget,
      actual_currency: targetCurrency,
      actual_recorded_at: new Date().toISOString(),
    })
    .eq("id", shipmentId);
}

export async function addCostActual(input: CostActualInput): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!input.shipmentId || !input.category || !input.amountMinor || !input.currency) {
    return { success: false, error: "Missing required fields" };
  }

  const supabase = await createClient();
  const fxRate = input.currency === "USD" ? 1 : await fx.getRate(input.currency, "USD");

  const row: TablesInsert<"b2b_shipment_cost_actuals"> = {
    shipment_id: input.shipmentId,
    category: input.category,
    vendor: input.vendor ?? null,
    invoice_ref: input.invoiceRef ?? null,
    invoice_date: input.invoiceDate ?? null,
    amount_minor: input.amountMinor,
    currency: input.currency,
    fx_rate_to_usd: fxRate,
    notes: input.notes ?? null,
    attachment_url: input.attachmentUrl ?? null,
    created_by: gate.data!.userId,
  };

  const { data, error } = await supabase
    .from("b2b_shipment_cost_actuals")
    .insert(row)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  await recomputeActuals(input.shipmentId);
  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  return { success: true, data: { id: data.id } };
}

export async function updateCostActual(
  id: string,
  patch: Partial<Omit<CostActualInput, "shipmentId">>,
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("b2b_shipment_cost_actuals")
    .select("shipment_id, currency, fx_rate_to_usd")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !existing) return { success: false, error: readErr?.message ?? "Line not found" };

  const update: TablesUpdate<"b2b_shipment_cost_actuals"> = {
    ...(patch.category !== undefined && { category: patch.category }),
    ...(patch.vendor !== undefined && { vendor: patch.vendor || null }),
    ...(patch.invoiceRef !== undefined && { invoice_ref: patch.invoiceRef || null }),
    ...(patch.invoiceDate !== undefined && { invoice_date: patch.invoiceDate || null }),
    ...(patch.amountMinor !== undefined && { amount_minor: patch.amountMinor }),
    ...(patch.currency !== undefined && { currency: patch.currency }),
    ...(patch.notes !== undefined && { notes: patch.notes || null }),
    ...(patch.attachmentUrl !== undefined && { attachment_url: patch.attachmentUrl || null }),
  };

  // Re-snapshot FX if currency changed.
  if (patch.currency && patch.currency !== existing.currency) {
    update.fx_rate_to_usd = patch.currency === "USD" ? 1 : await fx.getRate(patch.currency, "USD");
  }

  const { error } = await supabase.from("b2b_shipment_cost_actuals").update(update).eq("id", id);
  if (error) return { success: false, error: error.message };

  await recomputeActuals(existing.shipment_id);
  revalidatePath(`${SHIPMENTS_PATH}/${existing.shipment_id}`);
  return { success: true };
}

export async function deleteCostActual(id: string): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("b2b_shipment_cost_actuals")
    .select("shipment_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("b2b_shipment_cost_actuals").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  if (existing?.shipment_id) {
    await recomputeActuals(existing.shipment_id);
    revalidatePath(`${SHIPMENTS_PATH}/${existing.shipment_id}`);
  }
  return { success: true };
}
