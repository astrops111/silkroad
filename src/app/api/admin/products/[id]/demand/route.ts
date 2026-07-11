import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/products/[id]/demand — Demand rollup for one product:
 * RFQ/quote/order counts from the product_deal_stats view plus the most
 * recent CRM activities that reference the product (lifecycle hooks put
 * productIds into crm_activities.metadata).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const supabase = createServiceClient();

  const [statsRes, activitiesRes] = await Promise.all([
    supabase
      .from("product_deal_stats")
      .select("*")
      .eq("product_id", id)
      .maybeSingle(),
    supabase
      .from("crm_activities")
      .select("id, activity_type, actor_type, occurred_at, metadata, company_id, deal_thread_id")
      .contains("metadata", { productIds: [id] })
      .order("occurred_at", { ascending: false })
      .limit(10),
  ]);

  if (statsRes.error) {
    return NextResponse.json({ error: statsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    stats: statsRes.data ?? null,
    activities: activitiesRes.data ?? [],
  });
}
