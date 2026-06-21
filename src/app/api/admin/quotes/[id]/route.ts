import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["submitted", "calculating", "ready", "accepted", "paid", "expired", "cancelled"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin role: get profile id, then check company_members role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", profile.id)
    .in("role", ["admin_super", "admin_moderator", "admin_support", "logistics_admin", "logistics_dispatcher"])
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.shipping_cost          !== undefined) update.shipping_cost          = body.shipping_cost;
  if (body.customs_duties         !== undefined) update.customs_duties         = body.customs_duties;
  if (body.platform_fee           !== undefined) update.platform_fee           = body.platform_fee;
  if (body.total_amount           !== undefined) update.total_amount           = body.total_amount;
  if (body.currency               !== undefined) update.currency               = body.currency;
  if (body.origin_country         !== undefined) update.origin_country         = body.origin_country;
  if (body.estimated_transit_days !== undefined) update.estimated_transit_days = body.estimated_transit_days;
  if (body.admin_notes            !== undefined) update.admin_notes            = body.admin_notes;
  if (body.expires_at             !== undefined) update.expires_at             = body.expires_at;
  if (body.cost_components        !== undefined) update.cost_components        = body.cost_components;

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    update.status = body.status;
  }

  const { error } = await supabase
    .from("buyer_quote_requests")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[admin/quotes/PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
