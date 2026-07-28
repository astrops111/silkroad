import crypto from "crypto";

// ---------------------------------------------------------------------------
// Wise Business payouts — quote → transfer → fund, executed synchronously.
//
// Requires:
//   WISE_API_TOKEN   — personal/business API token
//   WISE_PROFILE_ID  — business profile id
//   supplier_profiles.wise_recipient_id — target account created in Wise
//
// Same-currency payout (source balance currency == settlement currency).
// Cross-currency payouts work too — Wise quotes the conversion — but the
// balance must exist for the source currency.
//
// Docs: https://docs.wise.com/api-docs/api-reference/transfer
// ---------------------------------------------------------------------------

const WISE_BASE = process.env.WISE_API_BASE ?? "https://api.transferwise.com";

export function wiseConfigured(): boolean {
  return !!(process.env.WISE_API_TOKEN && process.env.WISE_PROFILE_ID);
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Deterministic UUID from the settlement number — Wise dedupes transfers on
 * customerTransactionId, so retrying the same settlement can never double-pay.
 */
function idempotentUuid(reference: string): string {
  const h = crypto.createHash("sha256").update(`wise:${reference}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function wiseFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${WISE_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      (data.errors as { message?: string }[] | undefined)?.[0]?.message ??
      (data.error as string | undefined) ??
      `HTTP ${res.status}`;
    throw new Error(`Wise ${path}: ${detail}`);
  }
  return data;
}

export async function executeWisePayout(params: {
  recipientId: string;
  /** Major units (e.g. 1250.50), NOT minor units. */
  amountMajor: number;
  currency: string;
  reference: string;
}): Promise<{ transferId: string; funded: boolean }> {
  if (!wiseConfigured()) throw new Error("WISE_API_TOKEN / WISE_PROFILE_ID not configured");
  const profileId = process.env.WISE_PROFILE_ID;

  // 1. Quote
  const quote = await wiseFetch(`/v3/profiles/${profileId}/quotes`, {
    method: "POST",
    body: JSON.stringify({
      sourceCurrency: params.currency.toUpperCase(),
      targetCurrency: params.currency.toUpperCase(),
      targetAmount: params.amountMajor,
      payOut: "BANK_TRANSFER",
    }),
  });

  // 2. Transfer
  const transfer = await wiseFetch(`/v1/transfers`, {
    method: "POST",
    body: JSON.stringify({
      targetAccount: Number(params.recipientId),
      quoteUuid: quote.id,
      customerTransactionId: idempotentUuid(params.reference),
      details: {
        reference: params.reference.slice(0, 35),
        sourceOfFunds: "verification.source.of.funds.other",
      },
    }),
  });
  const transferId = String(transfer.id);

  // 3. Fund from balance
  const funding = await wiseFetch(
    `/v3/profiles/${profileId}/transfers/${transferId}/payments`,
    {
      method: "POST",
      body: JSON.stringify({ type: "BALANCE" }),
    }
  );

  return {
    transferId,
    funded: (funding.status as string | undefined)?.toUpperCase() === "COMPLETED",
  };
}
