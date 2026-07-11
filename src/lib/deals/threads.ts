import { createServiceClient } from "@/lib/supabase/server";
import { syncOpportunityStage } from "@/lib/crm/opportunities";
import { resolveContact } from "@/lib/crm/contacts";

export interface EnsureDealThreadInput {
  rfqId: string;
  title?: string | null;
  buyerCompanyId?: string | null;
  buyerUserId?: string | null;
  supplierCompanyId?: string | null;
}

/**
 * Get or create the deal thread for an RFQ (one deal per RFQ), keep the
 * linked opportunity in sync, and make sure the buyer exists as a CRM
 * contact. Never throws — returns null on failure.
 */
export async function ensureDealThread(input: EnsureDealThreadInput): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("deal_threads")
      .select("id")
      .eq("rfq_id", input.rfqId)
      .maybeSingle();

    let dealThreadId = existing?.id ?? null;

    if (!dealThreadId) {
      const { data: created, error } = await supabase
        .from("deal_threads")
        .insert({
          rfq_id: input.rfqId,
          title: input.title ?? null,
          buyer_company_id: input.buyerCompanyId ?? null,
          supplier_company_id: input.supplierCompanyId ?? null,
        })
        .select("id")
        .single();

      if (error?.code === "23505") {
        // Race: created by a concurrent hook
        const { data: raced } = await supabase
          .from("deal_threads")
          .select("id")
          .eq("rfq_id", input.rfqId)
          .maybeSingle();
        dealThreadId = raced?.id ?? null;
      } else {
        dealThreadId = created?.id ?? null;
      }
    }

    if (dealThreadId) {
      if (input.buyerUserId) {
        await resolveContact({
          userId: input.buyerUserId,
          companyId: input.buyerCompanyId ?? null,
        });
      }
      await syncOpportunityStage(dealThreadId);
    }

    return dealThreadId;
  } catch (err) {
    console.error("[deals/threads] ensureDealThread error:", err);
    return null;
  }
}

export interface AttachDealInput {
  quotationId?: string;
  purchaseOrderId?: string;
  supplierOrderId?: string;
  shipmentId?: string;
  conversationId?: string;
  supplierCompanyId?: string;
  status?: "active" | "won" | "lost" | "closed";
}

/**
 * Attach lifecycle entity ids to a deal thread as they come into being,
 * then re-sync the opportunity. Only provided fields are written.
 */
export async function attachToDealThread(
  dealThreadId: string,
  patch: AttachDealInput
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.quotationId) update.quotation_id = patch.quotationId;
    if (patch.purchaseOrderId) update.purchase_order_id = patch.purchaseOrderId;
    if (patch.supplierOrderId) update.supplier_order_id = patch.supplierOrderId;
    if (patch.shipmentId) update.shipment_id = patch.shipmentId;
    if (patch.conversationId) update.conversation_id = patch.conversationId;
    if (patch.supplierCompanyId) update.supplier_company_id = patch.supplierCompanyId;
    if (patch.status) update.status = patch.status;

    await supabase.from("deal_threads").update(update).eq("id", dealThreadId);
    await syncOpportunityStage(dealThreadId);
  } catch (err) {
    console.error("[deals/threads] attachToDealThread error:", err);
  }
}

/** Deal thread lookup used by RFQ-scoped hooks. */
export async function findDealByRfq(rfqId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("deal_threads")
      .select("id")
      .eq("rfq_id", rfqId)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/** Deal thread lookup used by pipeline/shipment handlers. */
export async function findDealBySupplierOrder(supplierOrderId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("deal_threads")
      .select("id")
      .eq("supplier_order_id", supplierOrderId)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
