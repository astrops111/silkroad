import type { EventHandler } from "../types";
import { logActivity, logSystemEvent } from "@/lib/logging";
import { sendEmail } from "@/lib/email";

const OPS_NOTIFICATION_EMAIL =
  process.env.OPS_NOTIFICATION_EMAIL ?? "logistics@silkroad.africa";

/**
 * stall-alert — shared handler for shipment.stalled + customs.demurrage_warning
 *
 * shipment.stalled: supplier confirmed but not ready_to_ship after 14 days.
 * customs.demurrage_warning: goods arrived at port, free days running out.
 *
 * Ops must manually intervene. Handler records the alert in the activity log.
 */
export const handler: EventHandler = async (event, _supabase) => {
  const isShipmentStall = event.event_type === "shipment.stalled";
  const isDemurrageWarn = event.event_type === "customs.demurrage_warning";

  const targetId = event.purchase_order_id ?? event.supplier_order_id ?? event.shipment_id;
  const targetType = event.purchase_order_id ? "purchase_order"
    : event.supplier_order_id ? "supplier_order" : "shipment";

  const description = isShipmentStall
    ? "STALL — Supplier has not marked order ready to ship within 14-day SLA. Ops intervention required."
    : isDemurrageWarn
    ? "DEMURRAGE WARNING — Free days at port are expiring. Customs clearance overdue."
    : `ALERT — ${event.event_type}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const adminLink = event.shipment_id
    ? `${appUrl}/admin/logistics/shipments/${event.shipment_id}`
    : `${appUrl}/admin/orders`;

  await Promise.all([
    sendEmail(
      {
        to: OPS_NOTIFICATION_EMAIL,
        subject: isShipmentStall
          ? "[STALL] Supplier order past 14-day ready-to-ship SLA"
          : isDemurrageWarn
          ? "[DEMURRAGE] Port free days expiring — clearance overdue"
          : `[ALERT] ${event.event_type}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#14110F;">
            <h1 style="margin:0 0 12px 0;font-size:18px;">Ops intervention required</h1>
            <p style="font-size:14px;line-height:1.5;">${description}</p>
            <table style="font-size:13px;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 12px 4px 0;color:#666;">Target</td><td>${targetType} ${targetId ?? "—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;">Event</td><td>${event.event_type} (${event.id})</td></tr>
            </table>
            ${appUrl ? `<p><a href="${adminLink}" style="display:inline-block;padding:10px 18px;background:#D89F2E;color:#14110F;text-decoration:none;border-radius:9999px;font-weight:600;">Open in admin</a></p>` : ""}
          </div>
        `,
      },
      isShipmentStall ? "ops_stall_alert" : "ops_demurrage_warning"
    ),
    logActivity({
      activityType: "order_stalled",
      description,
      targetType,
      targetId:    targetId ?? undefined,
      metadata:    { eventType: event.event_type, eventId: event.id, payload: event.payload },
    }),
    logSystemEvent({
      level:    "warn",
      source:   "pipeline-monitor",
      message:  description,
      metadata: { eventType: event.event_type, orderId: targetId },
    }),
  ]);

  return {
    success: true,
    result: { alerted: true, eventType: event.event_type },
  };
};
