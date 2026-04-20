/**
 * SMS Notification Service — Africa-first SMS via Africa's Talking
 *
 * Supports: Kenya (Safaricom), Nigeria (all networks), Ghana, Uganda, Tanzania,
 * Rwanda, Ethiopia, South Africa, and 20+ other African countries.
 *
 * Provider: Africa's Talking (https://africastalking.com)
 * Fallback: Twilio for non-African numbers
 */

const AT_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || "sandbox";
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || "SilkRoad";
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

// African country dialing codes
const AFRICAN_CODES = [
  "+254", "+234", "+233", "+256", "+255", "+250", "+251", "+27",
  "+221", "+225", "+237", "+243", "+20", "+212", "+260", "+263",
  "+265", "+258", "+267", "+264", "+242", "+241", "+228", "+229",
  "+224", "+232", "+211", "+257",
];

function isAfricanNumber(phone: string): boolean {
  return AFRICAN_CODES.some((code) => phone.startsWith(code));
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "africastalking" | "twilio" | "none";
}

/**
 * Send an SMS message. Routes to Africa's Talking for African numbers,
 * Twilio for international numbers.
 */
export async function sendSMS(
  phone: string,
  message: string
): Promise<SMSResult> {
  // Normalize phone number
  const normalized = phone.replace(/\s+/g, "").replace(/^0/, "+");

  if (isAfricanNumber(normalized) && AT_API_KEY) {
    return sendViaAfricasTalking(normalized, message);
  }

  if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
    return sendViaTwilio(normalized, message);
  }

  // No SMS provider configured — log and skip
  console.warn("[sms] No SMS provider configured. Message not sent:", { phone: normalized, message });
  return { success: false, error: "No SMS provider configured", provider: "none" };
}

async function sendViaAfricasTalking(
  phone: string,
  message: string
): Promise<SMSResult> {
  try {
    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: AT_API_KEY!,
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: phone,
        message,
        from: AT_SENDER_ID,
      }),
    });

    const data = await res.json();
    const recipient = data?.SMSMessageData?.Recipients?.[0];

    if (recipient?.statusCode === 101) {
      return {
        success: true,
        messageId: recipient.messageId,
        provider: "africastalking",
      };
    }

    return {
      success: false,
      error: recipient?.status || "SMS delivery failed",
      provider: "africastalking",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Africa's Talking API error",
      provider: "africastalking",
    };
  }
}

async function sendViaTwilio(
  phone: string,
  message: string
): Promise<SMSResult> {
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_FROM!,
          Body: message,
        }),
      }
    );

    const data = await res.json();

    if (data.sid) {
      return { success: true, messageId: data.sid, provider: "twilio" };
    }

    return {
      success: false,
      error: data.message || "Twilio send failed",
      provider: "twilio",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Twilio API error",
      provider: "twilio",
    };
  }
}

// ── Notification templates ──────────────────────────────────

export async function sendPaymentConfirmationSMS(
  phone: string,
  orderNumber: string,
  amount: string,
  currency: string
): Promise<SMSResult> {
  return sendSMS(
    phone,
    `SilkRoad: Payment of ${currency} ${amount} received for order ${orderNumber}. Thank you for your purchase!`
  );
}

export async function sendOrderStatusSMS(
  phone: string,
  orderNumber: string,
  status: string
): Promise<SMSResult> {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed by the supplier.",
    dispatched: "Your order has been dispatched and is on its way!",
    delivered: "Your order has been delivered. Please confirm receipt.",
    in_transit: "Your order is in transit.",
  };

  const msg = statusMessages[status] || `Order status updated to: ${status}`;
  return sendSMS(phone, `SilkRoad: Order ${orderNumber} — ${msg}`);
}

export async function sendMobileMoneyPromptSMS(
  phone: string,
  amount: string,
  currency: string,
  provider: string
): Promise<SMSResult> {
  return sendSMS(
    phone,
    `SilkRoad: A payment request of ${currency} ${amount} has been sent to your ${provider} account. Enter your PIN to confirm.`
  );
}

export async function sendSupplierNewOrderSMS(
  phone: string,
  orderNumber: string,
  buyerName: string,
  amount: string
): Promise<SMSResult> {
  return sendSMS(
    phone,
    `SilkRoad: New order ${orderNumber} from ${buyerName} for ${amount}. Log in to review and confirm.`
  );
}
