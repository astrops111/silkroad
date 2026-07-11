import { createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/crm/activities";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================
// Deal conversation messages — the internal-website leg of the
// dual-channel contract. Lifecycle hooks post a system message
// into the deal's conversation thread; each message can carry
// structured references (quotation, RFQ, email thread, attachment,
// ops freight quote, shipment, order, ticket) with deep links so
// admin/ops can jump straight to the record from the pipeline.
// ============================================================

export type DealReferenceType =
  | "rfq"
  | "quotation"
  | "order"
  | "shipment"
  | "email_thread"
  | "email_message"
  | "attachment"
  | "ops_freight_quote"
  | "ticket";

export interface DealMessageReference {
  type: DealReferenceType;
  id: string;
  /** Human label shown in the UI, e.g. "RFQ-20260711-AB12CD". */
  label?: string;
  /** Deep link for admins/ops (and buyers where the path is buyer-facing). */
  url?: string;
}

/** Canonical deep links so every emitter renders the same URLs. */
export function dealRefUrl(ref: { type: DealReferenceType; id: string }, dealThreadId?: string): string {
  switch (ref.type) {
    case "rfq": return `/dashboard/rfq/${ref.id}`;
    case "quotation": return dealThreadId ? `/admin/deals/${dealThreadId}` : `/admin/crm/opportunities`;
    case "order": return `/dashboard/orders/${ref.id}`;
    case "shipment": return `/admin/logistics/shipments/${ref.id}`;
    case "email_thread": return `/admin/mail?thread=${ref.id}`;
    case "email_message": return `/admin/mail?message=${ref.id}`;
    case "attachment": return `/api/admin/mail/attachments/${ref.id}`;
    case "ops_freight_quote": return `/admin/logistics/quotes/${ref.id}`;
    case "ticket": return `/admin/support/tickets/${ref.id}`;
  }
}

export interface PostDealMessageInput {
  body: string;
  /** Platform user acting (buyer/supplier/admin); falls back to a super admin for system posts. */
  actorUserId?: string | null;
  actorName?: string | null;
  references?: DealMessageReference[];
}

/**
 * Post a system/lifecycle message into the deal's conversation thread and
 * mirror it as a message_outbound CRM activity. Creates the conversation
 * on first use (requires both companies on the deal). Never throws.
 */
export async function postDealMessage(
  dealThreadId: string,
  input: PostDealMessageInput
): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: deal } = await supabase
      .from("deal_threads")
      .select("id, title, rfq_id, buyer_company_id, supplier_company_id, conversation_id")
      .eq("id", dealThreadId)
      .maybeSingle();
    if (!deal) return;

    // Fill in missing URLs from the canonical map
    const references = (input.references ?? []).map((r) => ({
      ...r,
      url: r.url ?? dealRefUrl(r, dealThreadId),
    }));

    let conversationId = deal.conversation_id;
    if (!conversationId) {
      if (!deal.buyer_company_id || !deal.supplier_company_id) {
        // No conversation possible yet — still record the activity so the
        // timeline shows the communication happened.
        await logActivity({
          activityType: "message_outbound",
          actorType: input.actorUserId ? "user" : "system",
          actorUserId: input.actorUserId ?? null,
          companyId: deal.buyer_company_id,
          dealThreadId,
          referenceType: "deal_thread",
          referenceId: dealThreadId,
          metadata: { body: input.body.slice(0, 500), references, undelivered: true } as Record<string, unknown>,
        });
        return;
      }

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          buyer_company_id: deal.buyer_company_id,
          supplier_company_id: deal.supplier_company_id,
          context_type: "deal",
          context_id: dealThreadId,
          context_title: deal.title ?? "Deal thread",
        })
        .select("id")
        .single();
      if (convError || !conversation) {
        console.error("[deals/messages] conversation create failed:", convError?.message);
        return;
      }
      conversationId = conversation.id;
      await supabase
        .from("deal_threads")
        .update({ conversation_id: conversationId })
        .eq("id", dealThreadId);
    }

    // messages.sender_user_id is NOT NULL — system posts are attributed to
    // a super admin platform account when no actor is given.
    let senderUserId = input.actorUserId ?? null;
    if (!senderUserId) {
      const { data: admin } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("role", "admin_super")
        .limit(1)
        .maybeSingle();
      senderUserId = admin?.user_id ?? null;
    }
    if (!senderUserId) return;

    const now = new Date().toISOString();
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_user_id: senderUserId,
        sender_name: input.actorName ?? "SilkRoad Africa",
        sender_role: "platform",
        message_type: "system",
        content: input.body,
        metadata: { references } as unknown as Json,
      })
      .select("id")
      .single();
    if (msgError) {
      console.error("[deals/messages] message insert failed:", msgError.message);
      return;
    }

    await supabase
      .from("conversations")
      .update({
        last_message_at: now,
        last_message_by: senderUserId,
        last_message_text: input.body.slice(0, 200),
        updated_at: now,
      })
      .eq("id", conversationId);

    await logActivity({
      activityType: "message_outbound",
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      companyId: deal.buyer_company_id,
      dealThreadId,
      referenceType: "message",
      referenceId: message?.id ?? null,
      metadata: { body: input.body.slice(0, 500), references } as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[deals/messages] postDealMessage error:", err);
  }
}
