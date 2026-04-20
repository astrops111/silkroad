"use server";

import { getWebhookStats } from "./webhook";
import { getAiUsageStats } from "./ai-usage";
import { getEmailStats } from "./email";
import { getGatewayStats } from "./gateway";
import { getSessionStats } from "./sessions";
import { getJobStats } from "./jobs";
import { getAdminAuditStats, getDeletionRequestStats } from "./admin-audit";
import { createServiceClient } from "@/lib/supabase/server";

export async function getMaintenanceOverview() {
  const [
    webhooks,
    aiUsage,
    email,
    gateways,
    sessions,
    jobs,
    adminAudit,
    deletionRequests,
    refunds,
    shipmentExceptions,
    rateLimitBreaches,
    subscriptionEvents,
    storageStats,
  ] = await Promise.all([
    getWebhookStats(),
    getAiUsageStats(),
    getEmailStats(),
    getGatewayStats(),
    getSessionStats(),
    getJobStats(),
    getAdminAuditStats(),
    getDeletionRequestStats(),
    getRefundStats(),
    getShipmentExceptionStats(),
    getRateLimitStats(),
    getSubscriptionStats(),
    getStorageStats(),
  ]);

  return {
    webhooks,
    aiUsage,
    email,
    gateways,
    sessions,
    jobs,
    adminAudit,
    deletionRequests,
    refunds,
    shipmentExceptions,
    rateLimitBreaches,
    subscriptionEvents,
    storageStats,
  };
}

async function getRefundStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pending, completed, failed] = await Promise.all([
    supabase.from("refund_processing_log").select("id", { count: "exact", head: true }).in("status", ["initiated", "pending"]),
    supabase.from("refund_processing_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "completed"),
    supabase.from("refund_processing_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("status", "failed"),
  ]);

  return {
    pendingRefunds: pending.count ?? 0,
    completedWeek: completed.count ?? 0,
    failedWeek: failed.count ?? 0,
  };
}

async function getShipmentExceptionStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [openExceptions, slaBreaches] = await Promise.all([
    supabase.from("shipment_exceptions").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("shipment_sla_tracking").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).eq("sla_met", false),
  ]);

  return {
    openExceptions: openExceptions.count ?? 0,
    slaBreachesWeek: slaBreaches.count ?? 0,
  };
}

async function getRateLimitStats() {
  const supabase = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [breachesWeek] = await Promise.all([
    supabase.from("api_rate_limit_breaches").select("id", { count: "exact", head: true }).gte("flagged_at", weekAgo),
  ]);

  return {
    breachesWeek: breachesWeek.count ?? 0,
  };
}

async function getSubscriptionStats() {
  const supabase = createServiceClient();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [upgrades, downgrades, cancellations, paymentFailures] = await Promise.all([
    supabase.from("subscription_events").select("id", { count: "exact", head: true }).gte("created_at", monthAgo).eq("event_type", "upgraded"),
    supabase.from("subscription_events").select("id", { count: "exact", head: true }).gte("created_at", monthAgo).eq("event_type", "downgraded"),
    supabase.from("subscription_events").select("id", { count: "exact", head: true }).gte("created_at", monthAgo).eq("event_type", "cancelled"),
    supabase.from("subscription_events").select("id", { count: "exact", head: true }).gte("created_at", monthAgo).eq("event_type", "payment_failed"),
  ]);

  return {
    upgradesMonth: upgrades.count ?? 0,
    downgradesMonth: downgrades.count ?? 0,
    cancellationsMonth: cancellations.count ?? 0,
    paymentFailuresMonth: paymentFailures.count ?? 0,
  };
}

async function getStorageStats() {
  const supabase = createServiceClient();

  const [totalFiles, totalSize] = await Promise.all([
    supabase.from("file_storage_log").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("file_storage_log").select("file_size_bytes").eq("is_deleted", false),
  ]);

  let totalBytes = 0;
  for (const row of totalSize.data ?? []) {
    totalBytes += (row as { file_size_bytes: number }).file_size_bytes;
  }

  return {
    totalFiles: totalFiles.count ?? 0,
    totalSizeBytes: totalBytes,
    totalSizeFormatted: formatBytes(totalBytes),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
