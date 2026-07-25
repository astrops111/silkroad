import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { sanitizeSearchTerm } from "@/lib/security/sanitize";
import { processRefund } from "@/lib/payments/refund";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/disputes — List disputes for the ops queue
 * Query params: status, search, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("disputes")
    .select(
      `
      id, title, type, description, status, resolution, resolution_note,
      disputed_amount, refund_amount, currency, blocks_settlement,
      created_at, resolved_at, evidence_urls,
      purchase_order_id, supplier_order_id,
      buyer:opened_by_company_id ( name ),
      supplier:supplier_company_id ( name ),
      openedBy:opened_by_user_id ( full_name, email ),
      order:purchase_order_id ( order_number )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (id) {
    query = query.eq("id", id);
  } else if (status) {
    query = query.eq("status", status);
  } else {
    // Default view is the active queue, not the full historical log.
    query = query.in("status", ["open", "under_review", "awaiting_evidence", "escalated"]);
  }
  if (search) {
    const safeSearch = sanitizeSearchTerm(search).replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("title", `%${safeSearch}%`);
  }

  const { data: disputes, error, count } = await query;

  if (error) {
    console.error("[admin/disputes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ disputes: disputes || [], total: count || 0, limit, offset });
}

const RESOLUTIONS = ["full_pay_supplier", "partial_refund_buyer", "full_refund_buyer", "replacement", "dismissed"] as const;
type Resolution = (typeof RESOLUTIONS)[number];

/**
 * PATCH /api/admin/disputes — Resolve a dispute
 * Body: { disputeId, resolution, resolutionNote?, refundAmount? }
 *
 * A refund resolution runs through the same processRefund() used by
 * POST /api/refunds — same cumulative cap, same gateway dispatch.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { disputeId, resolution, resolutionNote, refundAmount } = (await request.json()) as {
    disputeId?: string;
    resolution?: Resolution;
    resolutionNote?: string;
    refundAmount?: number;
  };

  if (!disputeId || !resolution || !RESOLUTIONS.includes(resolution)) {
    return NextResponse.json({ error: "disputeId and a valid resolution are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, supplier_order_id, status, title")
    .eq("id", disputeId)
    .single();

  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }
  if (dispute.status === "resolved" || dispute.status === "closed") {
    return NextResponse.json({ error: `Dispute is already ${dispute.status}` }, { status: 400 });
  }

  // Refund resolutions move money before the dispute row is marked resolved,
  // so a refund failure surfaces to the admin instead of silently closing
  // a dispute with no money actually returned.
  if (resolution === "full_refund_buyer" || resolution === "partial_refund_buyer") {
    const refundResult = await processRefund({
      supplierOrderId: dispute.supplier_order_id,
      reason: resolutionNote || `Dispute resolved: ${dispute.title}`,
      amount: resolution === "partial_refund_buyer" ? refundAmount : undefined,
      type: resolution === "full_refund_buyer" ? "full" : "partial",
      adminProfileId: auth.profile.id,
    });
    if (!refundResult.success) {
      return NextResponse.json({ error: `Refund failed: ${refundResult.error}` }, { status: refundResult.status });
    }
  }

  const { error: updateError } = await supabase
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_note: resolutionNote || null,
      resolved_by: auth.profile.id,
      resolved_at: new Date().toISOString(),
      blocks_settlement: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (updateError) {
    console.error("[admin/disputes] resolve failed:", updateError);
    return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "dispute_resolved",
    targetEntity: "disputes",
    targetId: disputeId,
    targetLabel: dispute.title,
    reason: resolutionNote,
    supportingEvidence: { resolution },
  });

  return NextResponse.json({ success: true, disputeId, status: "resolved", resolution });
}
