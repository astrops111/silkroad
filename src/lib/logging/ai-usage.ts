"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logAiUsage(params: {
  featureType: string;
  companyId?: string;
  userId?: string;
  modelUsed?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
  requestDurationMs?: number;
  status?: "success" | "error" | "partial" | "timeout";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  await supabase.from("ai_usage_log").insert({
    feature_type: params.featureType,
    company_id: params.companyId ?? null,
    user_id: params.userId ?? null,
    model_used: params.modelUsed ?? null,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.inputTokens + params.outputTokens,
    estimated_cost_usd: params.estimatedCostUsd ?? 0,
    request_duration_ms: params.requestDurationMs ?? null,
    status: params.status ?? "success",
    error_message: params.errorMessage ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function getAiUsageLogs(filters: {
  featureType?: string;
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
    .from("ai_usage_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.featureType) query = query.eq("feature_type", filters.featureType);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getAiUsageStats() {
  const supabase = createServiceClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [monthUsage, weekUsage, weekErrors] = await Promise.all([
    supabase.from("ai_usage_log").select("total_tokens, estimated_cost_usd, feature_type").gte("created_at", monthStart),
    supabase.from("ai_usage_log").select("total_tokens, estimated_cost_usd, feature_type").gte("created_at", weekAgo),
    supabase.from("ai_usage_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "error"),
  ]);

  let monthTokens = 0;
  let monthCost = 0;
  const featureCounts: Record<string, number> = {};

  for (const row of monthUsage.data ?? []) {
    monthTokens += (row as { total_tokens: number }).total_tokens;
    monthCost += Number((row as { estimated_cost_usd: number }).estimated_cost_usd);
    const ft = (row as { feature_type: string }).feature_type;
    featureCounts[ft] = (featureCounts[ft] ?? 0) + 1;
  }

  let weekTokens = 0;
  let weekCost = 0;
  for (const row of weekUsage.data ?? []) {
    weekTokens += (row as { total_tokens: number }).total_tokens;
    weekCost += Number((row as { estimated_cost_usd: number }).estimated_cost_usd);
  }

  return {
    monthTokens,
    monthCost: monthCost.toFixed(4),
    monthRequests: monthUsage.data?.length ?? 0,
    weekTokens,
    weekCost: weekCost.toFixed(4),
    weekRequests: weekUsage.data?.length ?? 0,
    weekErrors: weekErrors.count ?? 0,
    featureBreakdown: Object.entries(featureCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([feature, count]) => ({ feature, count })),
  };
}
