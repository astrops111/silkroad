import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { computeQuotationLandedCost } from "@/lib/logistics/landed-cost/from-quotation";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * POST /api/admin/quotations/[id]/landed-cost — Recompute the landed-cost
 * snapshot for a quotation on demand. Quote revisions recompute
 * automatically on submit; this is the manual lever for ops when product
 * data (HS codes, weights) or tariff rates changed after the fact.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  await computeQuotationLandedCost(id);

  const supabase = createServiceClient();
  const { data: quotation } = await supabase
    .from("quotations")
    .select("id, landed_cost_status, landed_cost_computed_at")
    .eq("id", id)
    .maybeSingle();

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "landed_cost_recomputed",
    targetEntity: "quotation",
    targetId: id,
    reason: `result: ${quotation.landed_cost_status}`,
  });

  return NextResponse.json({
    success: true,
    status: quotation.landed_cost_status,
    computedAt: quotation.landed_cost_computed_at,
  });
}
