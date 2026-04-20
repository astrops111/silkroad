"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function startJobRun(params: {
  jobName: string;
  jobType?: string;
  nextScheduledRun?: string;
}): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("scheduled_job_runs").insert({
    job_name: params.jobName,
    job_type: params.jobType ?? "api_cron",
    next_scheduled_run: params.nextScheduledRun ?? null,
  }).select("id").single();
  return data?.id ?? null;
}

export async function completeJobRun(jobRunId: string, result: {
  status: "success" | "failed" | "partial" | "timeout";
  rowsAffected?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("scheduled_job_runs")
    .select("started_at")
    .eq("id", jobRunId)
    .single();

  const duration = existing?.started_at
    ? Date.now() - new Date(existing.started_at).getTime()
    : null;

  await supabase.from("scheduled_job_runs").update({
    status: result.status,
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    rows_affected: result.rowsAffected ?? 0,
    error_message: result.errorMessage ?? null,
    metadata: result.metadata ?? {},
  }).eq("id", jobRunId);
}

export async function getJobRuns(filters: {
  jobName?: string;
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
    .from("scheduled_job_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.jobName) query = query.eq("job_name", filters.jobName);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getJobStats() {
  const supabase = createServiceClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [runningNow, successDay, failedDay, totalWeek] = await Promise.all([
    supabase.from("scheduled_job_runs").select("id", { count: "exact", head: true }).eq("status", "running"),
    supabase.from("scheduled_job_runs").select("id", { count: "exact", head: true }).gte("created_at", dayAgo).eq("status", "success"),
    supabase.from("scheduled_job_runs").select("id", { count: "exact", head: true }).gte("created_at", dayAgo).eq("status", "failed"),
    supabase.from("scheduled_job_runs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  return {
    runningNow: runningNow.count ?? 0,
    successToday: successDay.count ?? 0,
    failedToday: failedDay.count ?? 0,
    totalWeek: totalWeek.count ?? 0,
  };
}
