import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendMailboxEmail } from "@/lib/mail/smtp";
import { sendEmail } from "@/lib/email";
import { logActivity, activityExists } from "@/lib/crm/activities";
import { findDealBySupplierOrder, attachToDealThread } from "@/lib/deals/threads";
import { postDealMessage, type DealMessageReference } from "@/lib/deals/messages";

type DB = SupabaseClient<Database>;

export interface MilestoneNotifyInput {
  /** Pipeline event id — the idempotency key across handler retries. */
  eventId: string;
  shipmentId?: string | null;
  supplierOrderId?: string | null;
  milestone: string;
  headline: string;
  detail: string;
}

/**
 * Buyer-facing shipment milestone: one email (from logistic@ so replies
 * land in the webmail and thread onto the deal), one in-app notification,
 * one CRM activity on the deal thread. Pipeline handlers re-run on retry,
 * so the CRM activity doubles as the send-once guard. Never throws.
 */
export async function notifyShipmentMilestone(
  supabase: DB,
  input: MilestoneNotifyInput
): Promise<void> {
  try {
    if (await activityExists("shipment_milestone", "pipeline_event", input.eventId)) return;

    // Resolve supplier order (directly or via the shipment)
    let supplierOrderId = input.supplierOrderId ?? null;
    if (!supplierOrderId && input.shipmentId) {
      const { data: shipment } = await supabase
        .from("b2b_shipments")
        .select("supplier_order_id")
        .eq("id", input.shipmentId)
        .maybeSingle();
      supplierOrderId = shipment?.supplier_order_id ?? null;
    }
    if (!supplierOrderId) return;

    const { data: so } = await supabase
      .from("supplier_orders")
      .select("order_number, purchase_order_id")
      .eq("id", supplierOrderId)
      .maybeSingle();
    if (!so) return;

    const { data: po } = await supabase
      .from("purchase_orders")
      .select("buyer_user_id, buyer_company_id, user_profiles!purchase_orders_buyer_user_id_fkey ( email, full_name )")
      .eq("id", so.purchase_order_id)
      .maybeSingle();
    const buyer = po?.user_profiles as unknown as { email: string; full_name: string } | null;

    // Deal thread: attach the shipment as it becomes known
    const dealThreadId = await findDealBySupplierOrder(supplierOrderId);
    if (dealThreadId && input.shipmentId) {
      await attachToDealThread(dealThreadId, { shipmentId: input.shipmentId });
    }

    // In-app notification
    if (po?.buyer_user_id) {
      await supabase.rpc("create_notification", {
        p_user_id: po.buyer_user_id,
        // RPC arg is typed non-null but the SQL function accepts NULL
        p_company_id: po.buyer_company_id as unknown as string,
        p_title: input.headline,
        p_body: `Order ${so.order_number}: ${input.detail}`,
        p_type: "delivery",
        p_icon: "package",
        p_action_url: "/dashboard/orders",
        p_reference_type: "supplier_order",
        p_reference_id: supplierOrderId,
      });
    }

    // Email — from logistic@ when the mailbox is configured, Resend
    // fallback otherwise (replies to the mailbox thread into webmail).
    let emailSent = false;
    if (buyer?.email) {
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14110F;">${input.headline}</h1>
          <p style="color: #4C463D;">Hi ${buyer.full_name ?? "there"},</p>
          <p style="color: #4C463D;">Order <strong>${so.order_number}</strong> — ${input.detail}</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">Track Order</a>
        </div>
      `;

      const { data: logisticBox } = await supabase
        .from("mailboxes")
        .select("id, credential_ref")
        .ilike("address", "logistic@%")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (logisticBox && process.env[logisticBox.credential_ref]) {
        const result = await sendMailboxEmail(supabase, {
          mailboxId: logisticBox.id,
          to: [buyer.email],
          subject: `${input.headline} — ${so.order_number}`,
          html,
        });
        emailSent = result.success;
      }
      if (!emailSent) {
        emailSent = await sendEmail(
          {
            to: buyer.email,
            subject: `${input.headline} — ${so.order_number}`,
            html,
          },
          `milestone_${input.milestone}`
        );
      }
    }

    await logActivity({
      activityType: "shipment_milestone",
      companyId: po?.buyer_company_id ?? null,
      dealThreadId,
      referenceType: "pipeline_event",
      referenceId: input.eventId,
      metadata: {
        milestone: input.milestone,
        orderNumber: so.order_number,
        detail: input.detail,
        emailSent,
      },
    });

    // Internal-channel leg: milestone into the deal conversation with
    // shipment/order deep links (idempotent — inside the activityExists guard)
    if (dealThreadId) {
      const references: DealMessageReference[] = [
        { type: "order", id: so.purchase_order_id, label: so.order_number },
      ];
      if (input.shipmentId) {
        references.unshift({ type: "shipment", id: input.shipmentId, label: "Shipment tracking" });
      }
      await postDealMessage(dealThreadId, {
        body: `${input.headline} — order ${so.order_number}: ${input.detail}`,
        references,
      });
    }
  } catch (err) {
    console.error("[pipeline/milestone-notify]", input.milestone, err);
  }
}
