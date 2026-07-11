import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type CrmActivityType =
  | "rfq_submitted"
  | "quote_submitted"
  | "quote_accepted"
  | "quote_rejected"
  | "order_created"
  | "payment_confirmed"
  | "shipment_milestone"
  | "email_inbound"
  | "email_outbound"
  | "message_inbound"
  | "message_outbound"
  | "ticket_created"
  | "ticket_resolved"
  | "note"
  | "task"
  | "ai_action";

export interface LogActivityInput {
  activityType: CrmActivityType;
  actorType?: "system" | "user" | "ai";
  actorUserId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  dealThreadId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  emailMessageId?: string | null;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append one CRM activity. Fire-and-forget by design: never throws, so
 * lifecycle hooks can call it without risking the primary operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("crm_activities").insert({
      activity_type: input.activityType,
      actor_type: input.actorType ?? "system",
      actor_user_id: input.actorUserId ?? null,
      company_id: input.companyId ?? null,
      contact_id: input.contactId ?? null,
      opportunity_id: input.opportunityId ?? null,
      deal_thread_id: input.dealThreadId ?? null,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      email_message_id: input.emailMessageId ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      metadata: (input.metadata ?? {}) as Json,
    });
    if (error) console.error("[crm/activities] insert failed:", error.message);
  } catch (err) {
    console.error("[crm/activities] logActivity error:", err);
  }
}

/**
 * Idempotency check for retried emitters (pipeline handlers re-run on
 * retry): true if an identical activity already exists.
 */
export async function activityExists(
  activityType: CrmActivityType,
  referenceType: string,
  referenceId: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("crm_activities")
      .select("id")
      .eq("activity_type", activityType)
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
