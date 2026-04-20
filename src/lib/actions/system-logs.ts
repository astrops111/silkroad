"use server";

import { createServiceClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ActivityFilter = {
  activityType?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type LogFilter = {
  level?: string;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type ErrorFilter = {
  severity?: string;
  source?: string;
  resolved?: boolean | null;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

/* ------------------------------------------------------------------ */
/*  Activities                                                         */
/* ------------------------------------------------------------------ */

export async function getSystemActivities(filters: ActivityFilter = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("system_activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.activityType) {
    query = query.eq("activity_type", filters.activityType);
  }
  if (filters.targetType) {
    query = query.eq("target_type", filters.targetType);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

/* ------------------------------------------------------------------ */
/*  Application Logs                                                   */
/* ------------------------------------------------------------------ */

export async function getSystemLogs(filters: LogFilter = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("system_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.level) {
    query = query.eq("level", filters.level);
  }
  if (filters.source) {
    query = query.ilike("source", `%${filters.source}%`);
  }
  if (filters.search) {
    query = query.ilike("message", `%${filters.search}%`);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

/* ------------------------------------------------------------------ */
/*  Error Logs                                                         */
/* ------------------------------------------------------------------ */

export async function getErrorLogs(filters: ErrorFilter = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters.source) {
    query = query.ilike("source", `%${filters.source}%`);
  }
  if (filters.resolved !== null && filters.resolved !== undefined) {
    query = query.eq("resolved", filters.resolved);
  }
  if (filters.search) {
    query = query.ilike("message", `%${filters.search}%`);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function resolveError(
  errorId: string,
  resolvedBy: string,
  note?: string
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("error_logs")
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_note: note ?? null,
    })
    .eq("id", errorId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Analytics / Aggregate Counts                                       */
/* ------------------------------------------------------------------ */

export async function getSystemAnalytics() {
  const supabase = createServiceClient();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    totalUsersRes,
    totalCompaniesRes,
    activeOrdersRes,
    errorsToday,
    errorsWeek,
    unresolvedErrors,
    activitiesToday,
    activitiesWeek,
    logsByLevel,
    recentErrorSources,
    paymentsTodayRes,
    paymentsWeekRes,
  ] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).not("status", "in", '("completed","cancelled")'),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("resolved", false),
    supabase.from("system_activity_log").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("system_activity_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("system_logs").select("level").gte("created_at", weekAgo),
    supabase.from("error_logs").select("source, severity").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(200),
    supabase.from("payments").select("id", { count: "exact", head: true }).gte("created_at", today).eq("status", "succeeded"),
    supabase.from("payments").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "succeeded"),
  ]);

  // Compute log level distribution
  const levelCounts: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
  if (logsByLevel.data) {
    for (const row of logsByLevel.data) {
      const lvl = (row as { level: string }).level;
      levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
    }
  }

  // Compute error source distribution
  const sourceCounts: Record<string, number> = {};
  if (recentErrorSources.data) {
    for (const row of recentErrorSources.data) {
      const src = (row as { source: string }).source;
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    }
  }
  const topErrorSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  return {
    totalUsers: totalUsersRes.count ?? 0,
    totalCompanies: totalCompaniesRes.count ?? 0,
    activeOrders: activeOrdersRes.count ?? 0,
    errorsToday: errorsToday.count ?? 0,
    errorsThisWeek: errorsWeek.count ?? 0,
    unresolvedErrors: unresolvedErrors.count ?? 0,
    activitiesToday: activitiesToday.count ?? 0,
    activitiesThisWeek: activitiesWeek.count ?? 0,
    paymentsToday: paymentsTodayRes.count ?? 0,
    paymentsThisWeek: paymentsWeekRes.count ?? 0,
    logLevelDistribution: levelCounts,
    topErrorSources,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: Log a system activity (call from other server actions)     */
/* ------------------------------------------------------------------ */

export async function logActivity(params: {
  activityType: string;
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("system_activity_log").insert({
    activity_type: params.activityType,
    actor_id: params.actorId ?? null,
    actor_email: params.actorEmail ?? null,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    target_label: params.targetLabel ?? null,
    description: params.description,
    metadata: params.metadata ?? {},
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });
}

/* ------------------------------------------------------------------ */
/*  Helper: Log an error (call from catch blocks)                      */
/* ------------------------------------------------------------------ */

export async function logError(params: {
  errorCode?: string;
  message: string;
  stackTrace?: string;
  source: string;
  severity?: "warning" | "error" | "critical";
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  await supabase.from("error_logs").insert({
    error_code: params.errorCode ?? null,
    message: params.message,
    stack_trace: params.stackTrace ?? null,
    source: params.source,
    severity: params.severity ?? "error",
    request_id: params.requestId ?? null,
    user_id: params.userId ?? null,
    metadata: params.metadata ?? {},
  });
}
