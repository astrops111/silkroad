"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logEmailDelivery(params: {
  resendMessageId?: string;
  recipientEmail: string;
  subject: string;
  template?: string;
  sentToUserId?: string;
  sentToCompanyId?: string;
  status: "pending" | "sent" | "delivered" | "bounced" | "complained" | "failed";
  errorMessage?: string;
  bounceType?: string;
  bounceReason?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("email_delivery_log").insert({
    resend_message_id: params.resendMessageId ?? null,
    recipient_email: params.recipientEmail,
    subject: params.subject,
    template: params.template ?? null,
    sent_to_user_id: params.sentToUserId ?? null,
    sent_to_company_id: params.sentToCompanyId ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
    bounce_type: params.bounceType ?? null,
    bounce_reason: params.bounceReason ?? null,
  });
}

export async function getEmailDeliveryLogs(filters: {
  status?: string;
  template?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("email_delivery_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.template) query = query.eq("template", filters.template);
  if (filters.search) query = query.ilike("recipient_email", `%${filters.search}%`);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getEmailStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, sent, bounced, failed] = await Promise.all([
    supabase.from("email_delivery_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("email_delivery_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).in("status", ["sent", "delivered"]),
    supabase.from("email_delivery_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "bounced"),
    supabase.from("email_delivery_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "failed"),
  ]);

  return {
    totalWeek: total.count ?? 0,
    deliveredWeek: sent.count ?? 0,
    bouncedWeek: bounced.count ?? 0,
    failedWeek: failed.count ?? 0,
    deliveryRate: (total.count ?? 0) > 0 ? (((sent.count ?? 0) / (total.count ?? 1)) * 100).toFixed(1) : "100.0",
  };
}
