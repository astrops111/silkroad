"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { processSettlement } from "@/lib/settlement/engine";
import { logAdminAction } from "@/lib/logging/admin-audit";

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function approveProduct(productId: string, moderatedBy: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      moderation_status: "approved",
      moderated_at: new Date().toISOString(),
      moderated_by: moderatedBy,
    })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  await logAdminAction({
    adminId: moderatedBy,
    actionType: "product_approval",
    targetEntity: "product",
    targetId: productId,
    reason: "Product approved via admin panel",
  });

  return { success: true };
}

export async function rejectProduct(productId: string, moderatedBy: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      moderation_status: "rejected",
      moderated_at: new Date().toISOString(),
      moderated_by: moderatedBy,
    })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function verifySupplier(companyId: string, verifiedBy: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
    })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };

  await logAdminAction({
    adminId: verifiedBy,
    actionType: "company_verification",
    targetEntity: "company",
    targetId: companyId,
    reason: "Supplier verified via admin panel",
  });

  return { success: true };
}

export async function rejectVerification(companyId: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ verification_status: "rejected" })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resolveDispute(
  disputeId: string,
  resolution: "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "replacement" | "dismissed",
  resolvedBy: string,
  note?: string,
  refundAmount?: number
): Promise<ActionResult> {
  const serviceClient = createServiceClient();

  const { data: dispute } = await serviceClient
    .from("disputes")
    .select("supplier_order_id, disputed_amount, currency")
    .eq("id", disputeId)
    .single();

  if (!dispute) return { success: false, error: "Dispute not found" };

  // Update dispute
  await serviceClient
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_note: note ?? null,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      refund_amount: refundAmount ? Math.round(refundAmount * 100) : null,
      blocks_settlement: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  // Handle resolution
  if (resolution === "full_pay_supplier" || resolution === "dismissed") {
    // Unblock settlement — trigger settlement calculation
    const { calculateSettlement: calcSettlement } = await import("@/lib/settlement/engine");
    await calcSettlement(dispute.supplier_order_id);
  } else if (resolution === "full_refund_buyer") {
    // Mark supplier order as refunded, no settlement
    await serviceClient
      .from("supplier_orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", dispute.supplier_order_id);
  }
  // partial_refund_buyer and replacement need manual handling

  return { success: true };
}

export async function triggerSettlement(settlementId: string): Promise<ActionResult> {
  const result = await processSettlement(settlementId);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function getPendingProductModeration() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("products")
    .select("*, companies:supplier_id (name, verification_status)")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getPendingVerifications() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("companies")
    .select("*, supplier_profiles (*)")
    .eq("type", "supplier")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getOpenDisputes() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("disputes")
    .select("*, companies:opened_by_company_id (name), supplier:supplier_company_id (name)")
    .in("status", ["open", "under_review", "awaiting_evidence", "escalated"])
    .order("created_at", { ascending: true });
  return data ?? [];
}
