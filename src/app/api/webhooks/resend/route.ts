import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/webhooks/resend — delivery-status webhook (Svix-signed).
 *
 * Writes the email_delivery_log statuses that sendEmail() can't know at send
 * time (delivered / bounced / complained) plus open/click timestamps. The
 * bounce/complaint rows drive the suppression check in src/lib/email/index.ts.
 *
 * Configure in the Resend dashboard with events: email.delivered,
 * email.bounced, email.complained, email.opened, email.clicked — and set
 * RESEND_WEBHOOK_SECRET (whsec_...).
 */

const TOLERANCE_SECONDS = 5 * 60;

function verifySvix(
  secret: string,
  id: string,
  timestamp: string,
  payload: string,
  signatureHeader: string
): boolean {
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  // Header format: "v1,<base64sig> v1,<base64sig> ..."
  return signatureHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Refuse unsigned processing rather than trusting arbitrary callers.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (
    !svixId ||
    !svixTimestamp ||
    !svixSignature ||
    !verifySvix(secret, svixId, svixTimestamp, payload, svixSignature)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ received: true });

  const service = createServiceClient();
  const now = new Date().toISOString();

  const update: Record<string, unknown> | null = (() => {
    switch (event.type) {
      case "email.delivered":
        return { status: "delivered", updated_at: now };
      case "email.bounced":
        return {
          status: "bounced",
          bounce_type:
            event.data?.bounce?.type ?? event.data?.bounce?.subType ?? "permanent",
          bounce_reason: event.data?.bounce?.message ?? null,
          updated_at: now,
        };
      case "email.complained":
        return { status: "complained", updated_at: now };
      case "email.opened":
        return { opened_at: now, updated_at: now };
      case "email.clicked":
        return { clicked_at: now, updated_at: now };
      default:
        return null;
    }
  })();

  if (update) {
    const { error } = await service
      .from("email_delivery_log")
      .update(update)
      .eq("resend_message_id", emailId);
    if (error) {
      console.error("[webhooks/resend] update failed:", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
