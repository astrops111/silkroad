import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/audit-logs — Six queryable log streams for the admin
 * audit page.
 * Query: type (admin|system|errors|email|jobs|ai|all), actionType?
 * (doubles as the status/severity/job-name filter on the non-admin
 * streams), resolved? (errors only), page?, pageSize?
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

  // Errors (error_logs — severity filter via actionType, optional resolved filter)
  if (type === "errors") {
    let q = supabase
      .from("error_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (actionType) q = q.eq("severity", actionType);
    const resolved = searchParams.get("resolved");
    if (resolved === "true" || resolved === "false") q = q.eq("resolved", resolved === "true");

    const { data, count, error } = await q;
    results.errorLogs = data || [];
    results.errorTotal = count || 0;
    if (error) results.errorError = error.message;
  }

  // Email delivery log (status filter via actionType)
  if (type === "email") {
    let q = supabase
      .from("email_delivery_log")
      .select("id, recipient_email, subject, template, status, error_message, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (actionType) q = q.eq("status", actionType);

    const { data, count, error } = await q;
    results.emailLogs = data || [];
    results.emailTotal = count || 0;
    if (error) results.emailError = error.message;
  }

  // Scheduled job runs (job name filter via actionType)
  if (type === "jobs") {
    let q = supabase
      .from("scheduled_job_runs")
      .select("id, job_name, job_type, status, duration_ms, rows_affected, error_message, started_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (actionType) q = q.eq("job_name", actionType);

    const { data, count, error } = await q;
    results.jobLogs = data || [];
    results.jobTotal = count || 0;
    if (error) results.jobError = error.message;
  }

  // AI email skill runs (status filter via actionType)
  if (type === "ai") {
    let q = supabase
      .from("email_skill_runs")
      .select(
        "id, skill_id, email_message_id, status, actions_taken, error_message, input_tokens, output_tokens, created_at, email_skills ( name )",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (actionType) q = q.eq("status", actionType);

    const { data, count, error } = await q;
    results.aiLogs = data || [];
    results.aiTotal = count || 0;
    if (error) results.aiError = error.message;
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

/**
 * PATCH /api/admin/audit-logs — Toggle an error_logs row's resolved flag.
 * Body: { errorId, resolved }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { errorId, resolved } = rawBody as { errorId?: string; resolved?: boolean };
  if (!errorId || typeof resolved !== "boolean") {
    return NextResponse.json({ error: "errorId and resolved required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("error_logs")
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? auth.profile.id : null,
    })
    .eq("id", errorId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: resolved ? "error_resolved" : "error_reopened",
    targetEntity: "error_log",
    targetId: errorId,
  });

  return NextResponse.json({ success: true });
}
