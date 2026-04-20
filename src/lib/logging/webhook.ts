"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logWebhookDelivery(params: {
  webhookType: string;
  eventType: string;
  externalEventId?: string;
  httpStatusCode?: number;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  processingTimeMs?: number;
  status: "pending" | "delivered" | "failed" | "expired";
}) {
  const supabase = createServiceClient();
  await supabase.from("webhook_deliveries").insert({
    webhook_type: params.webhookType,
    event_type: params.eventType,
    external_event_id: params.externalEventId ?? null,
    http_status_code: params.httpStatusCode ?? null,
    request_payload: params.requestPayload ?? {},
    response_payload: params.responsePayload ?? {},
    error_message: params.errorMessage ?? null,
    processing_time_ms: params.processingTimeMs ?? null,
    status: params.status,
  });
}

export async function getWebhookDeliveries(filters: {
  webhookType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("webhook_deliveries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.webhookType) query = query.eq("webhook_type", filters.webhookType);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getWebhookStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, delivered, failed] = await Promise.all([
    supabase.from("webhook_deliveries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("webhook_deliveries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "delivered"),
    supabase.from("webhook_deliveries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "failed"),
  ]);

  return {
    totalWeek: total.count ?? 0,
    deliveredWeek: delivered.count ?? 0,
    failedWeek: failed.count ?? 0,
    successRate: (total.count ?? 0) > 0 ? (((delivered.count ?? 0) / (total.count ?? 1)) * 100).toFixed(1) : "100.0",
  };
}
