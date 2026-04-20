"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logGatewayTransaction(params: {
  gateway: string;
  paymentId?: string;
  operation: string;
  amount?: number;
  currency?: string;
  status: "success" | "failed" | "timeout" | "pending";
  responseTimeMs?: number;
  errorCode?: string;
  errorMessage?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  await supabase.from("gateway_transaction_log").insert({
    gateway: params.gateway,
    payment_id: params.paymentId ?? null,
    operation: params.operation,
    amount: params.amount ?? null,
    currency: params.currency ?? null,
    status: params.status,
    response_time_ms: params.responseTimeMs ?? null,
    error_code: params.errorCode ?? null,
    error_message: params.errorMessage ?? null,
    external_ref: params.externalRef ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function logGatewayHealthCheck(params: {
  gateway: string;
  isAvailable: boolean;
  responseTimeMs?: number;
  errorMessage?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("gateway_health_checks").insert({
    gateway: params.gateway,
    is_available: params.isAvailable,
    response_time_ms: params.responseTimeMs ?? null,
    error_message: params.errorMessage ?? null,
  });
}

export async function getGatewayTransactions(filters: {
  gateway?: string;
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
    .from("gateway_transaction_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.gateway) query = query.eq("gateway", filters.gateway);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getGatewayStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [txWeek, healthChecks] = await Promise.all([
    supabase.from("gateway_transaction_log").select("gateway, status, response_time_ms").gte("created_at", weekAgo),
    supabase.from("gateway_health_checks").select("gateway, is_available, response_time_ms, checked_at").gte("checked_at", dayAgo).order("checked_at", { ascending: false }),
  ]);

  // Per-gateway stats
  const gateways: Record<string, { total: number; success: number; failed: number; avgTime: number; times: number[] }> = {};
  for (const row of txWeek.data ?? []) {
    const r = row as { gateway: string; status: string; response_time_ms: number | null };
    if (!gateways[r.gateway]) gateways[r.gateway] = { total: 0, success: 0, failed: 0, avgTime: 0, times: [] };
    gateways[r.gateway].total++;
    if (r.status === "success") gateways[r.gateway].success++;
    if (r.status === "failed") gateways[r.gateway].failed++;
    if (r.response_time_ms) gateways[r.gateway].times.push(r.response_time_ms);
  }

  const gatewayMetrics = Object.entries(gateways).map(([gateway, stats]) => ({
    gateway,
    total: stats.total,
    success: stats.success,
    failed: stats.failed,
    successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : "100.0",
    avgResponseMs: stats.times.length > 0 ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length) : 0,
  }));

  // Latest health check per gateway
  const latestHealth: Record<string, { isAvailable: boolean; responseTimeMs: number | null; checkedAt: string }> = {};
  for (const row of healthChecks.data ?? []) {
    const r = row as { gateway: string; is_available: boolean; response_time_ms: number | null; checked_at: string };
    if (!latestHealth[r.gateway]) {
      latestHealth[r.gateway] = { isAvailable: r.is_available, responseTimeMs: r.response_time_ms, checkedAt: r.checked_at };
    }
  }

  return { gatewayMetrics, latestHealth };
}
