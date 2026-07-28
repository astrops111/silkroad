import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";
import { notifyShipmentMilestone } from "../milestone-notify";
import { sendEmail } from "@/lib/email";

const OPS_NOTIFICATION_EMAIL =
  process.env.OPS_NOTIFICATION_EMAIL ?? "logistics@silkroad.africa";

/**
 * customs.hold_opened
 * Fires when customs_status transitions to 'on_hold' (DB trigger).
 * The hold record is already created by ops in the admin UI.
 * Handler records the milestone and alerts via activity log.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { brokerRef?: string; holdReason?: string };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("shipment_number")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_hold_opened",
    description: [
      `Customs hold opened — ${shipment.shipment_number ?? shipment_id}`,
      p.holdReason && `reason: ${p.holdReason}`,
      p.brokerRef  && `broker ref: ${p.brokerRef}`,
      "Ops team has been alerted.",
    ].filter(Boolean).join(" — "),
  });
  if (trackErr) console.error("[pipeline:customs.hold_opened] tracking insert failed:", trackErr.message);

  await logActivity({
    activityType: "customs_hold_opened",
    description:  `Customs hold opened — ${p.holdReason ?? "unknown reason"}. Ops intervention required.`,
    targetType:   "shipment",
    targetId:     shipment_id,
    targetLabel:  shipment?.shipment_number ?? shipment_id,
    metadata:     { shipmentId: shipment_id, holdReason: p.holdReason, brokerRef: p.brokerRef },
  }).catch(() => {});

  // Buyer: their goods are stuck — tell them, and tell ops to intervene.
  await notifyShipmentMilestone(supabase, {
    eventId: event.id,
    shipmentId: shipment_id,
    supplierOrderId: event.supplier_order_id,
    milestone: "customs_hold_opened",
    headline: "Customs Hold on Your Shipment",
    detail: `Your shipment ${shipment.shipment_number ?? ""} has been placed on hold at customs${p.holdReason ? ` (${p.holdReason})` : ""}. Our logistics team is already working to resolve it — no action is needed from you unless we reach out.`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await sendEmail(
    {
      to: OPS_NOTIFICATION_EMAIL,
      subject: `[CUSTOMS HOLD] ${shipment.shipment_number ?? shipment_id}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#14110F;">
          <h1 style="margin:0 0 12px 0;font-size:18px;">Customs hold opened</h1>
          <table style="font-size:13px;border-collapse:collapse;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Shipment</td><td>${shipment.shipment_number ?? shipment_id}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Reason</td><td>${(p.holdReason ?? "unknown").replace(/</g, "&lt;")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Broker ref</td><td>${(p.brokerRef ?? "—").replace(/</g, "&lt;")}</td></tr>
          </table>
          ${appUrl ? `<p><a href="${appUrl}/admin/logistics/shipments/${shipment_id}" style="display:inline-block;padding:10px 18px;background:#D89F2E;color:#14110F;text-decoration:none;border-radius:9999px;font-weight:600;">Open shipment</a></p>` : ""}
        </div>
      `,
    },
    "ops_customs_hold_opened"
  );

  return {
    success: true,
    result: { shipmentId: shipment_id, holdReason: p.holdReason },
  };
};
