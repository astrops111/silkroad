import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase/server";
import { toStoredAmount } from "@/lib/payments/currency-config";

/**
 * GET   /api/admin/trade-flows/[id] — flow + events + documents.
 * PATCH /api/admin/trade-flows/[id] — edit flow details (no step change;
 *        step transitions go through /advance).
 */

/** Editable text/date columns (verbatim). */
const TEXT_FIELDS = [
  "buyer_company_name",
  "supplier_company_id",
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
  "notes",
] as const;

/** Money columns — accepted as display amounts, stored in minor units. */
const MONEY_FIELDS = ["goods_total", "shipping_cost", "grand_total", "shipping_fee_due"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: flow } = await supabase.from("trade_flows").select("*").eq("id", id).maybeSingle();
  if (!flow) return NextResponse.json({ error: "Trade flow not found" }, { status: 404 });

  const [{ data: events }, { data: documents }] = await Promise.all([
    supabase
      .from("trade_flow_events")
      .select("id, from_step, to_step, actor_user_id, note, payload, notified, created_at")
      .eq("trade_flow_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("trade_flow_documents")
      .select("id, kind, file_url, file_name, note, created_at")
      .eq("trade_flow_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ flow, events: events ?? [], documents: documents ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = createServiceClient();
  const { data: flow } = await supabase
    .from("trade_flows")
    .select("id, currency")
    .eq("id", id)
    .maybeSingle();
  if (!flow) return NextResponse.json({ error: "Trade flow not found" }, { status: 404 });

  const currency: string = typeof body.currency === "string" && body.currency ? body.currency : flow.currency;
  const updates: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (field in body) {
      const v = body[field];
      updates[field] = v === "" || v === undefined ? null : v;
    }
  }
  for (const field of MONEY_FIELDS) {
    if (field in body) {
      const v = body[field];
      updates[field] =
        v === "" || v === null || v === undefined || isNaN(Number(v))
          ? null
          : toStoredAmount(Number(v), currency);
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { error } = await supabase.from("trade_flows").update(updates).eq("id", id);
  if (error) {
    console.error("[admin/trade-flows] update failed:", error);
    return NextResponse.json({ error: "Failed to update trade flow" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
