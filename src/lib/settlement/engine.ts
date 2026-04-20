"use server";

import { createServiceClient } from "@/lib/supabase/server";

const DEFAULT_COMMISSION_RATE = 0.05; // 5%

export async function calculateSettlement(supplierOrderId: string) {
  const supabase = createServiceClient();

  // Get the supplier order
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("*, purchase_orders!inner(*)")
    .eq("id", supplierOrderId)
    .single();

  if (!order) return { success: false, error: "Order not found" };

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
  let commissionRate = DEFAULT_COMMISSION_RATE;

  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("commission_rate")
    .eq("company_id", order.supplier_company_id)
    .single();

  if (supplierProfile?.commission_rate) {
    commissionRate = Number(supplierProfile.commission_rate);
  } else {
    // Check commission rules table
    const { data: rules } = await supabase
      .from("commission_rules")
      .select("rate")
      .or(`supplier_id.eq.${order.supplier_company_id},supplier_id.is.null`)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1);

    if (rules && rules.length > 0) {
      commissionRate = Number(rules[0].rate);
    }
  }

  const grossSales = order.total_amount;
  const totalCommission = Math.round(grossSales * commissionRate);
  const netPayout = grossSales - totalCommission;
  const currency = order.currency;

  // Create settlement record
  const settlementNumber = `STL-${Date.now().toString(36).toUpperCase()}`;

  const { data: settlement, error } = await supabase
    .from("settlements")
    .insert({
      supplier_id: order.supplier_company_id,
      settlement_number: settlementNumber,
      period_start: order.created_at.slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      gross_sales: grossSales,
      total_commission: totalCommission,
      net_payout: netPayout,
      currency,
      status: "ready",
      supplier_order_ids: [supplierOrderId],
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { settlementId: settlement.id, netPayout, currency, commissionRate } };
}

export async function processSettlement(settlementId: string) {
  const supabase = createServiceClient();

  // Get settlement
  const { data: settlement } = await supabase
    .from("settlements")
    .select("*")
    .eq("id", settlementId)
    .eq("status", "ready")
    .single();

  if (!settlement) {
    return { success: false, error: "Settlement not found or not ready" };
  }

  // Update to processing
  await supabase
    .from("settlements")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", settlementId);

  // Get supplier payout method
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("stripe_account_id, mobile_money_number, mobile_money_provider, bank_code, bank_account_number")
    .eq("company_id", settlement.supplier_id)
    .single();

  let payoutMethod = "platform_wallet";
  let payoutReference = "";

  try {
    if (profile?.stripe_account_id) {
      // Stripe Connect transfer
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const transfer = await stripe.transfers.create({
        amount: Number(settlement.net_payout),
        currency: settlement.currency.toLowerCase(),
        destination: profile.stripe_account_id,
        description: `Settlement ${settlement.settlement_number}`,
      });

      payoutMethod = "stripe";
      payoutReference = transfer.id;
    } else if (profile?.mobile_money_number) {
      // Mobile money payout — placeholder for actual API integration
      payoutMethod = profile.mobile_money_provider ?? "mobile_money";
      payoutReference = `MM-${Date.now().toString(36)}`;
    } else {
      // Bank transfer — mark as ready for manual processing
      payoutMethod = "bank_transfer";
      payoutReference = `BANK-${Date.now().toString(36)}`;
    }

    // Update settlement as paid
    await supabase
      .from("settlements")
      .update({
        status: "paid",
        payout_method: payoutMethod,
        payout_reference: payoutReference,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", settlementId);

    return { success: true, data: { payoutMethod, payoutReference } };
  } catch (err) {
    // Mark as failed
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
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settlements")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
