import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSuperAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/settings — Platform-wide config (commission, limits,
 * currencies, gateway toggles, notifications, maintenance mode)
 * Any admin role may read; only admin_super may write (see PATCH).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("singleton", true)
    .single();

  if (error) {
    console.error("[admin/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ settings });
}

const WRITABLE_FIELDS = [
  "commission_rate",
  "min_order_value",
  "max_order_value",
  "quote_ttl_days",
  "dispute_window_days",
  "default_currency",
  "supported_currencies",
  "gateways",
  "notify_on_new_order",
  "notify_on_dispute",
  "notify_on_payment_fail",
  "notify_on_supplier_apply",
  "maintenance_mode",
] as const;

/**
 * PATCH /api/admin/settings — Update platform settings (admin_super only)
 * Body: a partial object of any WRITABLE_FIELDS
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (
    "commission_rate" in update &&
    (typeof update.commission_rate !== "number" || update.commission_rate < 0 || update.commission_rate > 50)
  ) {
    return NextResponse.json({ error: "commission_rate must be between 0 and 50" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("platform_settings")
    .update({ ...update, updated_by: auth.profile.id, updated_at: new Date().toISOString() })
    .eq("singleton", true)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/settings]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({ success: true, settings });
}
