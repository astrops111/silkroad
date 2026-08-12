import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase/server";
import { toStoredAmount } from "@/lib/payments/currency-config";
import { nextStep, isTerminal, STEP_DEFS } from "@/lib/trade-flow/steps";
import { notifyTradeFlowStep } from "@/lib/trade-flow/notify";

/**
 * POST /api/admin/trade-flows/[id]/advance
 *
 * Body: {
 *   toStep:  string   — must be the flow's single valid next step, or "cancelled"
 *   note?:   string   — free text included in the step's notifications
 *   fields?: object   — step payload written onto the flow before notifying
 *                       (whitelisted; money fields arrive as display amounts)
 * }
 *
 * Records the transition in trade_flow_events (payload + which notifications
 * were dispatched) and fires buyer/supplier email + ops Telegram + in-app.
 */

const TEXT_FIELDS = new Set([
  "supplier_name",
  "supplier_email",
  "consignee_company_name",
  "consignee_tin",
  "consignee_phone",
  "consignee_email",
  "destination_port",
  "goods_summary",
  "currency",
  "payment_instructions",
  "shipping_payment_instructions",
  "vessel_name",
  "seaway_bill_number",
  "etd",
  "eta",
]);
const MONEY_FIELDS = new Set(["goods_total", "shipping_cost", "grand_total", "shipping_fee_due"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const {
    toStep,
    note,
    fields,
  }: { toStep?: string; note?: string; fields?: Record<string, unknown> } = body;

  if (!toStep || !STEP_DEFS[toStep]) {
    return NextResponse.json({ error: "A valid toStep is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: flow } = await supabase
    .from("trade_flows")
    .select("id, flow_number, current_step, currency")
    .eq("id", id)
    .maybeSingle();
  if (!flow) return NextResponse.json({ error: "Trade flow not found" }, { status: 404 });

  if (isTerminal(flow.current_step)) {
    return NextResponse.json(
      { error: `Flow is ${flow.current_step} — no further transitions` },
      { status: 400 }
    );
  }

  const expected = nextStep(flow.current_step);
  if (toStep !== "cancelled" && toStep !== expected) {
    return NextResponse.json(
      { error: `Invalid transition: ${flow.current_step} → ${toStep} (expected ${expected})` },
      { status: 400 }
    );
  }

  // Apply step payload fields (whitelisted) together with the step change.
  const updates: Record<string, unknown> = { current_step: toStep };
  const cleanPayload: Record<string, unknown> = {};
  if (fields && typeof fields === "object") {
    const currency =
      typeof fields.currency === "string" && fields.currency ? fields.currency : flow.currency;
    for (const [key, raw] of Object.entries(fields)) {
      if (TEXT_FIELDS.has(key)) {
        updates[key] = raw === "" || raw === undefined ? null : raw;
        cleanPayload[key] = updates[key];
      } else if (MONEY_FIELDS.has(key)) {
        const v =
          raw === "" || raw === null || raw === undefined || isNaN(Number(raw))
            ? null
            : toStoredAmount(Number(raw), currency);
        updates[key] = v;
        cleanPayload[key] = v;
      }
    }
  }
  if (toStep === "completed") updates.completed_at = new Date().toISOString();
  if (toStep === "cancelled") updates.cancelled_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("trade_flows")
    .update(updates)
    .eq("id", id)
    .eq("current_step", flow.current_step); // guard against concurrent transitions

  if (updateError) {
    console.error("[admin/trade-flows/advance] update failed:", updateError);
    return NextResponse.json({ error: "Failed to advance trade flow" }, { status: 500 });
  }

  // Notifications — after the write; failures are recorded, never blocking.
  const notified = await notifyTradeFlowStep(id, toStep, note ?? null);

  const { error: eventError } = await supabase.from("trade_flow_events").insert({
    trade_flow_id: id,
    from_step: flow.current_step,
    to_step: toStep,
    actor_user_id: admin.profile.id,
    note: note || null,
    payload: cleanPayload,
    notified,
  });
  if (eventError) console.error("[admin/trade-flows/advance] event insert failed:", eventError);

  return NextResponse.json({
    success: true,
    flowNumber: flow.flow_number,
    fromStep: flow.current_step,
    toStep,
    notified,
  });
}
