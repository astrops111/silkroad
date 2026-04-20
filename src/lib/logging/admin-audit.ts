"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logAdminAction(params: {
  adminId: string;
  adminEmail?: string;
  actionType: string;
  targetEntity?: string;
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  supportingEvidence?: Record<string, unknown>;
  requiresApproval?: boolean;
  ipAddress?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("admin_action_audit").insert({
    admin_id: params.adminId,
    admin_email: params.adminEmail ?? null,
    action_type: params.actionType,
    target_entity: params.targetEntity ?? null,
    target_id: params.targetId ?? null,
    target_label: params.targetLabel ?? null,
    reason: params.reason ?? null,
    supporting_evidence: params.supportingEvidence ?? {},
    requires_approval: params.requiresApproval ?? false,
    ip_address: params.ipAddress ?? null,
  });
}

export async function getAdminAuditLog(filters: {
  actionType?: string;
  adminId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("admin_action_audit")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.actionType) query = query.eq("action_type", filters.actionType);
  if (filters.adminId) query = query.eq("admin_id", filters.adminId);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getAdminAuditStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalWeek, pendingApproval] = await Promise.all([
    supabase.from("admin_action_audit").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("admin_action_audit").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
  ]);

  return {
    actionsThisWeek: totalWeek.count ?? 0,
    pendingApproval: pendingApproval.count ?? 0,
  };
}

// Data deletion requests
export async function getDataDeletionRequests(filters: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("data_deletion_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data ?? [], count: count ?? 0, error: null };
}

export async function getDeletionRequestStats() {
  const supabase = createServiceClient();
  const [pending, overdue] = await Promise.all([
    supabase.from("data_deletion_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("data_deletion_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("deadline_at", new Date().toISOString()),
  ]);

  return {
    pendingRequests: pending.count ?? 0,
    overdueRequests: overdue.count ?? 0,
  };
}
