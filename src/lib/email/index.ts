import { Resend } from "resend";
import { logEmailDelivery } from "@/lib/logging/email";
import { createServiceClient } from "@/lib/supabase/server";

// Lazy singleton — instantiated on first use, not at module load time.
// This prevents build failures when RESEND_API_KEY is not set as a build arg.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
  }
  return _resend;
}

const FROM_EMAIL = "SilkRoad Africa <noreply@silkroadafrica.com>";

function esc(v: string | null | undefined): string {
  if (!v) return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Suppression list: skip recipients whose latest bounce/complaint indicates a
 * dead or hostile address. Statuses are written by the Resend webhook
 * (/api/webhooks/resend); temporary bounces do not suppress.
 */
async function isSuppressed(to: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("email_delivery_log")
      .select("status, bounce_type")
      .ilike("recipient_email", to)
      .in("status", ["bounced", "complained"])
      .order("created_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (!row) return false;
    return row.status === "complained" || row.bounce_type !== "temporary";
  } catch {
    return false;
  }
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions, template?: string) {
  try {
    if (await isSuppressed(to)) {
      await logEmailDelivery({
        recipientEmail: to,
        subject,
        template,
        status: "failed",
        errorMessage: "Suppressed — recipient previously bounced or complained",
      });
      return false;
    }
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[email] Send failed:", error);
      await logEmailDelivery({
        recipientEmail: to,
        subject,
        template,
        status: "failed",
        errorMessage: typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : "Unknown error",
      });
      return false;
    }
    await logEmailDelivery({
      resendMessageId: data?.id,
      recipientEmail: to,
      subject,
      template,
      status: "sent",
    });
    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    await logEmailDelivery({
      recipientEmail: to,
      subject,
      template,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Send exception",
    });
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to SilkRoad Africa",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #14110F;">Welcome to SilkRoad Africa, ${esc(name)}!</h1>
        <p style="color: #4C463D;">Your account has been created successfully. You're now part of the largest World-Africa B2B trade platform.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">Go to Dashboard</a>
      </div>
    `,
  }, "welcome");
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  totalAmount: string
) {
  return sendEmail({
    to: email,
    subject: `Order Confirmed — ${orderNumber}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #14110F;">Order Confirmed</h1>
        <p style="color: #4C463D;">Your order <strong>${esc(orderNumber)}</strong> for <strong>${esc(totalAmount)}</strong> has been placed successfully.</p>
        <p style="color: #4C463D;">We'll notify you when the supplier confirms your order.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Orders</a>
      </div>
    `,
  }, "order_confirmation");
}

export async function sendNewOrderToSupplierEmail(
  email: string,
  orderNumber: string,
  buyerName: string,
  totalAmount: string
) {
  return sendEmail({
    to: email,
    subject: `New Order from ${buyerName} — ${orderNumber}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #14110F;">New Order Received</h1>
        <p style="color: #4C463D;">You have a new order <strong>${esc(orderNumber)}</strong> from <strong>${esc(buyerName)}</strong> for <strong>${esc(totalAmount)}</strong>.</p>
        <p style="color: #4C463D;">Please review and confirm the order.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Order</a>
      </div>
    `,
  }, "new_order_supplier");
}

export async function sendOrderStatusUpdateEmail(
  email: string,
  orderNumber: string,
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed by Supplier",
    in_production: "In Production",
    ready_to_ship: "Ready to Ship",
    dispatched: "Dispatched",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
  };

  const label = statusLabels[newStatus] ?? newStatus;

  return sendEmail({
    to: email,
    subject: `Order ${orderNumber} — ${label}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #14110F;">Order Status Update</h1>
        <p style="color: #4C463D;">Your order <strong>${esc(orderNumber)}</strong> status has been updated to: <strong>${esc(label)}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Order</a>
      </div>
    `,
  }, "order_status_update");
}
