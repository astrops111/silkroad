"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

const DEFAULT_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE ?? "0.05");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Admin-editable via /admin/settings (platform_settings.commission_rate is a
// percentage, e.g. 8.00 for 8% — converted to the fraction form used
// throughout this file). Falls back to the env var if the settings row is
// ever missing, so a fresh environment without the 00118 migration applied
// doesn't hard-fail settlement calculation.
async function getPlatformCommissionRate(supabase: ReturnType<typeof createServiceClient>): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("commission_rate")
    .eq("singleton", true)
    .single();
  if (data?.commission_rate == null) return DEFAULT_COMMISSION_RATE;
  return Number(data.commission_rate) / 100;
}

export async function calculateSettlement(supplierOrderId: string) {
  const supabase = createServiceClient();

  // Get the supplier order. No FK exists between supplier_orders and
  // purchase_orders (both are RANGE-partitioned by created_at with a
  // composite PK, so PostgREST can't embed across them) — select plain
  // columns only, no embed.
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("*")
    .eq("id", supplierOrderId)
    .single();

  if (!order) return { success: false, error: "Order not found" };

  // ── Idempotency: return existing active settlement for this order ─────────
  // Prevents duplicate settlement rows when delivery.completed is retried.
  const { data: existing } = await supabase
    .from("settlements")
    .select("id, net_payout, currency")
    .contains("supplier_order_ids", [supplierOrderId])
    .not("status", "in", "(cancelled,voided)")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      data: {
        settlementId:   existing.id,
        netPayout:      Number(existing.net_payout),
        currency:       existing.currency as string,
        commissionRate: DEFAULT_COMMISSION_RATE,
      },
    };
  }

  // Check for open disputes blocking settlement
  const { data: disputes } = await supabase
    .from("disputes")
    .select("id, status")
    .eq("supplier_order_id", supplierOrderId)
    .eq("blocks_settlement", true)
    .in("status", ["open", "under_review", "awaiting_evidence", "escalated"]);

  if (disputes && disputes.length > 0) {
    return { success: false, error: "Settlement blocked by open dispute" };
  }

  // Get commission rate (supplier override > category > platform default)
  let commissionRate = await getPlatformCommissionRate(supabase);

  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("commission_rate")
    .eq("company_id", order.supplier_id)
    .single();

  // Use !== null/undefined so a 0% rate (e.g. strategic partner) is respected
  if (supplierProfile?.commission_rate !== null && supplierProfile?.commission_rate !== undefined) {
    commissionRate = Number(supplierProfile.commission_rate);
  } else if (UUID_RE.test(order.supplier_id ?? "")) {
    const { data: rules } = await supabase
      .from("commission_rules")
      .select("rate")
      .or(`supplier_id.eq.${order.supplier_id},supplier_id.is.null`)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1);

    if (rules && rules.length > 0) {
      commissionRate = Number(rules[0].rate);
    }
  }

  const grossSales      = order.total_amount;
  // Basis-point arithmetic avoids float precision drift on the commission split.
  const commissionRateBp = Math.round(commissionRate * 10_000);
  const totalCommission  = Math.round((grossSales * commissionRateBp) / 10_000);
  const netPayout        = grossSales - totalCommission;
  const currency        = order.currency;

  // Deterministic settlement number derived from order ID — stable across retries
  // so XTransfer's referenceNo stays the same if we retry after a transient failure.
  const settlementNumber = `STL-${supplierOrderId.replace(/-/g, "").slice(-10).toUpperCase()}`;

  const { data: settlement, error } = await supabase
    .from("settlements")
    .insert({
      supplier_id:        order.supplier_id,
      settlement_number:  settlementNumber,
      period_start:       (order.created_at ?? new Date().toISOString()).slice(0, 10),
      period_end:         new Date().toISOString().slice(0, 10),
      gross_sales:        grossSales,
      total_commission:   totalCommission,
      net_payout:         netPayout,
      currency,
      status:             "ready",
      supplier_order_ids: [supplierOrderId],
    })
    .select("id")
    .single();

  if (error) {
    // Unique constraint violation (23505): a concurrent call already inserted.
    // Fetch and return the winning row rather than failing.
    if (error.code === "23505") {
      const { data: concurrent } = await supabase
        .from("settlements")
        .select("id, net_payout, currency")
        .contains("supplier_order_ids", [supplierOrderId])
        .not("status", "in", "(cancelled,voided)")
        .limit(1)
        .maybeSingle();
      if (concurrent) {
        return {
          success: true,
          data: {
            settlementId:   concurrent.id,
            netPayout:      Number(concurrent.net_payout),
            currency:       concurrent.currency as string,
            commissionRate,
          },
        };
      }
    }
    return { success: false, error: error.message };
  }

  if (!settlement) {
    return { success: false, error: "Settlement insert returned no row" };
  }

  return { success: true, data: { settlementId: settlement.id, netPayout, currency, commissionRate } };
}

export async function processSettlement(settlementId: string) {
  const supabase = createServiceClient();

  // ── Atomic claim via SELECT FOR UPDATE SKIP LOCKED ───────────────────────
  // claim_settlement() atomically transitions 'ready'/'failed' → 'processing'
  // in a single DB transaction. If another invocation already holds the lock
  // (concurrent Vercel cron), SKIP LOCKED returns 0 rows and we exit cleanly —
  // preventing the double-payout race that a plain SELECT + UPDATE has.
  const { data: claimResult } = await supabase
    .rpc("claim_settlement", { p_id: settlementId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settlement = (claimResult as any[])?.[0] ?? null;

  if (!settlement) {
    return {
      success: false,
      error:   "Settlement not found, not in retryable status, or already being processed by a concurrent invocation",
    };
  }

  // ── Dispute check (runs after atomic claim) ──────────────────────────────
  if (Array.isArray(settlement.supplier_order_ids) && settlement.supplier_order_ids.length > 0) {
    const { data: blockingDisputes } = await supabase
      .from("disputes")
      .select("id")
      .in("supplier_order_id", settlement.supplier_order_ids as string[])
      .eq("blocks_settlement", true)
      .in("status", ["open", "under_review", "awaiting_evidence", "escalated"]);

    if (blockingDisputes && blockingDisputes.length > 0) {
      // Release the claim so the next retry can re-attempt once the dispute resolves
      await supabase
        .from("settlements")
        .update({ status: "ready", updated_at: new Date().toISOString() })
        .eq("id", settlementId);
      return {
        success: false,
        error:   `DISPUTE_BLOCK: ${blockingDisputes.length} open dispute(s) blocking settlement ${settlementId}`,
      };
    }
  }

  // ── Platform KYC guard — gates all payout methods ───────────────────────
  const { data: supplierCompany } = await supabase
    .from("companies")
    .select("verification_status")
    .eq("id", settlement.supplier_id)
    .single();

  const kycStatus = supplierCompany?.verification_status ?? "unverified";

  if (kycStatus === "pending") {
    await supabase
      .from("settlements")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", settlementId);
    return { success: false, error: "KYC_PENDING: Supplier verification under review — settlement held for retry" };
  }

  if (kycStatus !== "verified") {
    await supabase
      .from("settlements")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", settlementId);
    const { onSettlementKycBlocked } = await import("@/lib/email/events");
    await onSettlementKycBlocked(settlementId);
    return { success: false, error: "KYC_UNVERIFIED: Supplier must complete platform verification before payout" };
  }

  // ── Get supplier payout method ───────────────────────────────────────────
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("stripe_account_id, mobile_money_number, mobile_money_provider, bank_code, bank_account_number, wise_recipient_id, xtransfer_payee_id, xtransfer_payout_currency, xtransfer_payee_status")
    .eq("company_id", settlement.supplier_id)
    .single();

  let payoutMethod        = "platform_wallet";
  let payoutReference     = "";
  let xtransferTransferId: string | null = null;

  try {
    if (profile?.xtransfer_payee_id) {
      const xtPayeeStatus = profile.xtransfer_payee_status as string | null;
      if (xtPayeeStatus === "rejected") {
        await supabase
          .from("settlements")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", settlementId);
        const { onSettlementXTransferRejected } = await import("@/lib/email/events");
        await onSettlementXTransferRejected(settlementId);
        return { success: false, error: "XTRANSFER_PAYEE_REJECTED: XTransfer beneficiary rejected — re-register supplier" };
      }
      if (xtPayeeStatus === "pending_review") {
        await supabase
          .from("settlements")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", settlementId);
        return { success: false, error: "XTRANSFER_PENDING: XTransfer beneficiary under review — settlement held for retry" };
      }
      const { xtransferGateway } = await import("@/lib/payments/gateways/xtransfer");
      const result = await xtransferGateway.transfer!({
        recipientAccountId: profile.xtransfer_payee_id,
        amount:             Number(settlement.net_payout),
        currency:           (profile.xtransfer_payout_currency as string | null) ?? settlement.currency,
        reference:          settlement.settlement_number, // idempotency key in XTransfer referenceNo
      });
      payoutMethod        = "xtransfer";
      payoutReference     = result.transferId;
      xtransferTransferId = result.transferId;
    } else if (profile?.stripe_account_id) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
      const Stripe = (await import("stripe")).default;
      const stripe  = new Stripe(stripeKey);

      const transfer = await stripe.transfers.create(
        {
          amount:      Number(settlement.net_payout),
          currency:    settlement.currency.toLowerCase(),
          destination: profile.stripe_account_id,
          description: `Settlement ${settlement.settlement_number}`,
        },
        // Idempotency key prevents a duplicate Stripe transfer if the network
        // request succeeds but our subsequent Supabase update times out and retries.
        { idempotencyKey: settlement.settlement_number },
      );

      payoutMethod    = "stripe";
      payoutReference = transfer.id;
    } else if (profile?.wise_recipient_id) {
      const { executeWisePayout, wiseConfigured } = await import("@/lib/payments/wise-payout");
      if (!wiseConfigured()) {
        throw new Error("WISE_NOT_CONFIGURED: supplier has a Wise recipient but WISE_API_TOKEN / WISE_PROFILE_ID are not set");
      }
      const result = await executeWisePayout({
        recipientId: profile.wise_recipient_id,
        amountMajor: Number(settlement.net_payout) / 100,
        currency:    settlement.currency,
        reference:   settlement.settlement_number,
      });
      // funded=false means the transfer exists but the balance couldn't cover
      // it — leave in processing for manual funding rather than claiming paid.
      payoutMethod    = result.funded ? "wise" : "wise_unfunded";
      payoutReference = result.transferId;
    } else if (profile?.mobile_money_number) {
      // Flutterwave mobile-money disbursement (M-Pesa, MTN MoMo, Airtel, ...).
      // Completes asynchronously — the transfer.completed webhook flips the
      // settlement to 'paid'.
      const { flutterwaveGateway } = await import("@/lib/payments/gateways/flutterwave");
      const result = await flutterwaveGateway.transfer!({
        recipientPhone:    profile.mobile_money_number,
        recipientProvider: profile.mobile_money_provider ?? undefined,
        amount:            Number(settlement.net_payout) / 100,
        currency:          settlement.currency,
        reference:         settlement.settlement_number,
      });
      if (!result.success) {
        throw new Error(`FLW_TRANSFER_FAILED: ${result.error ?? "Flutterwave mobile-money transfer rejected"}`);
      }
      payoutMethod    = "flutterwave_momo";
      payoutReference = result.transferId;
    } else if (profile?.bank_account_number && profile?.bank_code) {
      // Flutterwave bank disbursement — same async completion via webhook.
      const { flutterwaveGateway } = await import("@/lib/payments/gateways/flutterwave");
      const result = await flutterwaveGateway.transfer!({
        recipientAccountId: `${profile.bank_account_number}@${profile.bank_code}`,
        amount:             Number(settlement.net_payout) / 100,
        currency:           settlement.currency,
        reference:          settlement.settlement_number,
      });
      if (!result.success) {
        throw new Error(`FLW_TRANSFER_FAILED: ${result.error ?? "Flutterwave bank transfer rejected"}`);
      }
      payoutMethod    = "flutterwave_bank";
      payoutReference = result.transferId;
    } else {
      // No configured destination — fail loudly instead of fabricating a
      // reference and pretending the supplier was paid.
      throw new Error(
        "NO_PAYOUT_METHOD: supplier has no payout destination (XTransfer payee, Stripe account, Wise recipient, mobile money, or bank account)"
      );
    }

    // Async rails confirm via webhook (XTransfer status webhook, Flutterwave
    // transfer.completed) — hold at 'processing'. Stripe transfers and funded
    // Wise transfers are synchronous, so they go straight to 'paid'.
    const isAsync =
      payoutMethod === "xtransfer" ||
      payoutMethod === "wise_unfunded" ||
      payoutMethod.startsWith("flutterwave_");
    await supabase
      .from("settlements")
      .update({
        status:                isAsync ? "processing" : "paid",
        payout_method:         payoutMethod,
        payout_reference:      payoutReference,
        xtransfer_transfer_id: xtransferTransferId,
        ...(isAsync ? {} : { paid_at: new Date().toISOString() }),
        updated_at:            new Date().toISOString(),
      })
      .eq("id", settlementId);

    return { success: true, data: { payoutMethod, payoutReference, status: isAsync ? "processing" : "paid" } };
  } catch (err) {
    await supabase
      .from("settlements")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", settlementId);

    return { success: false, error: err instanceof Error ? err.message : "Payout failed" };
  }
}

export async function getPendingSettlements() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settlements")
    .select("*, companies:supplier_id (name, country_code)")
    .in("status", ["ready", "processing"])
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getSupplierSettlements(supplierId: string) {
  // ── Auth + ownership check — IDOR guard ──────────────────────────────────
  // This is a 'use server' Server Action callable from client components.
  // Without this check any authenticated user could read another supplier's
  // payout history (amount, method, reference) by passing an arbitrary UUID.
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = createServiceClient();
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = membership?.role === "admin_super" || membership?.role === "admin_moderator";
  const isOwner = membership?.company_id === supplierId;
  if (!isAdmin && !isOwner) throw new Error("Forbidden");

  const { data } = await supabase
    .from("settlements")
    .select("id, settlement_number, status, gross_sales, total_commission, net_payout, currency, payout_method, payout_reference, created_at, paid_at, supplier_order_ids")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
