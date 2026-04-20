"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logLoginAttempt(params: {
  email: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failed" | "blocked" | "mfa_required";
  failureReason?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("login_attempts").insert({
    email: params.email,
    user_id: params.userId ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    status: params.status,
    failure_reason: params.failureReason ?? null,
  });
}

export async function createSession(params: {
  userId: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  countryCode?: string;
}) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("user_sessions").insert({
    user_id: params.userId,
    company_id: params.companyId ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    device_type: params.deviceType ?? null,
    country_code: params.countryCode ?? null,
  }).select("id").single();
  return data?.id ?? null;
}

export async function endSession(sessionId: string) {
  const supabase = createServiceClient();
  await supabase.from("user_sessions").update({
    is_active: false,
    logged_out_at: new Date().toISOString(),
  }).eq("id", sessionId);
}

export async function getSessionStats() {
  const supabase = createServiceClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [activeSessions, loginsToday, loginsWeek, failedWeek, suspiciousWeek] = await Promise.all([
    supabase.from("user_sessions").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("login_attempts").select("id", { count: "exact", head: true }).gte("attempted_at", dayAgo).eq("status", "success"),
    supabase.from("login_attempts").select("id", { count: "exact", head: true }).gte("attempted_at", weekAgo).eq("status", "success"),
    supabase.from("login_attempts").select("id", { count: "exact", head: true }).gte("attempted_at", weekAgo).eq("status", "failed"),
    supabase.from("user_sessions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("is_suspicious", true),
  ]);

  return {
    activeSessions: activeSessions.count ?? 0,
    loginsToday: loginsToday.count ?? 0,
    loginsWeek: loginsWeek.count ?? 0,
    failedLoginsWeek: failedWeek.count ?? 0,
    suspiciousSessionsWeek: suspiciousWeek.count ?? 0,
  };
}

export async function getLoginAttempts(filters: {
  status?: string;
  email?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("login_attempts")
    .select("*", { count: "exact" })
    .order("attempted_at", { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.email) query = query.ilike("email", `%${filters.email}%`);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}
