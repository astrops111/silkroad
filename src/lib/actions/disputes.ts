"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function openDispute(
  supplierOrderId: string,
  purchaseOrderId: string,
  openedByUserId: string,
  openedByCompanyId: string,
  supplierCompanyId: string,
  data: {
    type: string;
    title: string;
    description: string;
    evidenceUrls?: string[];
    disputedAmount?: number;
  }
): Promise<ActionResult<{ disputeId: string }>> {
  const supabase = await createClient();

  // Check for existing open dispute on this order
  const { data: existing } = await supabase
    .from("disputes")
    .select("id")
    .eq("supplier_order_id", supplierOrderId)
    .in("status", ["open", "under_review", "awaiting_evidence"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "There is already an open dispute for this order" };
  }

  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({
      supplier_order_id: supplierOrderId,
      purchase_order_id: purchaseOrderId,
      opened_by_user_id: openedByUserId,
      opened_by_company_id: openedByCompanyId,
      supplier_company_id: supplierCompanyId,
      type: data.type,
      title: data.title,
      description: data.description,
      evidence_urls: data.evidenceUrls ?? [],
      disputed_amount: data.disputedAmount ? Math.round(data.disputedAmount * 100) : null,
      blocks_settlement: true,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: { disputeId: dispute.id } };
}

export async function addDisputeEvidence(
  disputeId: string,
  evidenceUrls: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("evidence_urls")
    .eq("id", disputeId)
    .single();

  if (!dispute) return { success: false, error: "Dispute not found" };

  const { error } = await supabase
    .from("disputes")
    .update({
      evidence_urls: [...(dispute.evidence_urls ?? []), ...evidenceUrls],
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getBuyerDisputes(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("disputes")
    .select("*, supplier:supplier_company_id (name)")
    .eq("opened_by_company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
