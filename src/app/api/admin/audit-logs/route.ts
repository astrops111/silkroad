import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/audit-logs — Fetch admin audit logs + system activity
 * Query: type (admin|system|all), actionType?, page?, pageSize?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") || "all";
  const actionType = searchParams.get("actionType");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const results: Record<string, unknown> = {};

  // Admin action audit
  if (type === "admin" || type === "all") {
    let adminQuery = supabase
      .from("admin_action_audit")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (actionType) adminQuery = adminQuery.eq("action_type", actionType);

    const { data, count, error } = await adminQuery;
    results.adminLogs = data || [];
    results.adminTotal = count || 0;
    if (error) results.adminError = error.message;
  }

  // System activity log
  if (type === "system" || type === "all") {
    let sysQuery = supabase
      .from("system_activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (actionType) sysQuery = sysQuery.eq("activity_type", actionType);

    const { data, count, error } = await sysQuery;
    results.systemLogs = data || [];
    results.systemTotal = count || 0;
    if (error) results.systemError = error.message;
  }

  // Stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [adminWeek, systemWeek, errorCount] = await Promise.all([
    supabase.from("admin_action_audit").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("system_activity_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);

  results.stats = {
    adminActionsThisWeek: adminWeek.count || 0,
    systemEventsThisWeek: systemWeek.count || 0,
    unresolvedErrors: errorCount.count || 0,
  };
  results.page = page;
  results.pageSize = pageSize;

  return NextResponse.json(results);
}
