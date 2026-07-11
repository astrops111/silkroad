import { createServiceClient } from "@/lib/supabase/server";

export type OpportunityStage =
  | "lead"
  | "rfq_submitted"
  | "quoted"
  | "negotiation"
  | "won"
  | "lost";

/**
 * Re-derive an opportunity's stage/amount from its deal thread's current
 * lifecycle state. Called by every lifecycle hook after attaching ids —
 * cheap, idempotent, and safe to re-run on retries.
 *
 * Mapping: RFQ exists → rfq_submitted; quote submitted → quoted;
 * RFQ awarded → negotiation; order created → won (amount from PO);
 * RFQ cancelled/expired → lost.
 */
export async function syncOpportunityStage(dealThreadId: string): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: deal } = await supabase
      .from("deal_threads")
      .select("id, rfq_id, quotation_id, purchase_order_id, buyer_company_id, title")
      .eq("id", dealThreadId)
      .maybeSingle();

    if (!deal) return;

    let stage: OpportunityStage = "lead";
    let amountMinor: number | null = null;
    let currency: string | null = null;

    if (deal.rfq_id) {
      const { data: rfq } = await supabase
        .from("rfqs")
        .select("status")
        .eq("id", deal.rfq_id)
        .maybeSingle();

      switch (rfq?.status) {
        case "open":
          stage = "rfq_submitted";
          break;
        case "quoted":
          stage = "quoted";
          break;
        case "awarded":
          stage = "negotiation";
          break;
        case "converted":
          stage = "won";
          break;
        case "cancelled":
        case "expired":
          stage = "lost";
          break;
        default:
          stage = "rfq_submitted";
      }
    }

    if (deal.quotation_id) {
      const { data: quote } = await supabase
        .from("quotations")
        .select("total_amount, currency")
        .eq("id", deal.quotation_id)
        .maybeSingle();
      if (quote) {
        amountMinor = quote.total_amount;
        currency = quote.currency;
      }
    }

    if (deal.purchase_order_id) {
      stage = "won";
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("grand_total, currency")
        .eq("id", deal.purchase_order_id)
        .maybeSingle();
      if (po) {
        amountMinor = po.grand_total;
        currency = po.currency;
      }
    }

    const { data: existing } = await supabase
      .from("crm_opportunities")
      .select("id")
      .eq("deal_thread_id", dealThreadId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("crm_opportunities")
        .update({
          stage,
          ...(amountMinor != null && { amount_minor: amountMinor, currency }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("crm_opportunities").insert({
        name: deal.title ?? "Deal",
        deal_thread_id: dealThreadId,
        company_id: deal.buyer_company_id,
        stage,
        amount_minor: amountMinor,
        currency,
      });
    }
  } catch (err) {
    console.error("[crm/opportunities] syncOpportunityStage error:", err);
  }
}
