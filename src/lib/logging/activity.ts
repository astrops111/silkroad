"use server";

import { createServiceClient } from "@/lib/supabase/server";

// All pipeline + legacy activity types the enum supports
export type ActivityType =
  | "order_created" | "payment_received" | "shipment_created"
  // Pipeline
  | "pipeline_event_enqueued" | "pipeline_event_processed"
  | "pipeline_event_failed"   | "pipeline_event_dead"
  | "supplier_order_confirmed"
  | "customs_entry_filed"     | "customs_cleared"
  | "customs_hold_opened"     | "customs_hold_resolved"
  | "delivery_confirmed"
  | "dispute_window_opened"   | "dispute_window_closed"
  | "settlement_processed"
  | "order_stalled"           | "error_logged";

export type LogLevel   = "debug" | "info" | "warn" | "error" | "fatal";
export type ErrorSeverity = "warning" | "error" | "critical";

// ── system_activity_log ───────────────────────────────────────────────────────

export async function logActivity(params: {
  activityType: ActivityType;
  description: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  actorId?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("system_activity_log")
    .insert({
      activity_type: params.activityType,
      description:   params.description,
      target_type:   params.targetType  ?? null,
      target_id:     params.targetId    ?? null,
      target_label:  params.targetLabel ?? null,
      actor_id:      params.actorId     ?? null,
      actor_email:   params.actorEmail  ?? null,
      metadata:      params.metadata    ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[logging/activity] logActivity failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getActivityLog(filters: {
  targetId?: string;
  targetType?: string;
  activityType?: ActivityType;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  let query = supabase
    .from("system_activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.targetId)     query = query.eq("target_id",     filters.targetId);
  if (filters.targetType)   query = query.eq("target_type",   filters.targetType);
  if (filters.activityType) query = query.eq("activity_type", filters.activityType);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

// ── error_logs ────────────────────────────────────────────────────────────────

export async function logError(params: {
  errorCode: string;
  message: string;
  source: string;
  severity?: ErrorSeverity;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("error_logs")
    .insert({
      error_code:  params.errorCode,
      message:     params.message,
      source:      params.source,
      severity:    params.severity   ?? "error",
      stack_trace: params.stackTrace ?? null,
      request_id:  params.requestId  ?? null,
      user_id:     params.userId     ?? null,
      metadata:    params.metadata   ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[logging/activity] logError failed:", error.message);
    return null;
  }
  // DB trigger (trg_error_log_activity) auto-mirrors this into system_activity_log
  return data?.id ?? null;
}

export async function getErrorLog(filters: {
  severity?: ErrorSeverity;
  resolved?: boolean;
  source?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  let query = supabase
    .from("error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.severity !== undefined) query = query.eq("severity", filters.severity);
  if (filters.resolved !== undefined) query = query.eq("resolved", filters.resolved);
  if (filters.source)                 query = query.eq("source",   filters.source);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

// ── system_logs (general-purpose operational log) ─────────────────────────────

export async function logSystemEvent(params: {
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("system_logs").insert({
    level:      params.level,
    source:     params.source,
    message:    params.message,
    metadata:   params.metadata  ?? {},
    request_id: params.requestId ?? null,
    user_id:    params.userId    ?? null,
  });
  if (error) {
    console.error("[logging/activity] logSystemEvent failed:", error.message);
  }
}
