import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { sendMailboxEmail } from "@/lib/mail/smtp";
import { sendTelegramNotification, tgEsc } from "@/lib/telegram/notify";
import { formatMoney } from "@/lib/payments/currency-config";
import { STEP_DEFS } from "./steps";
import { buyerEmailForStep, supplierEmailForStep, type FlowEmailContext } from "./emails";

/**
 * Per-step notification dispatch for trade flows. Called after every step
 * transition (and on flow creation for "started"). Never throws — a failed
 * notification must not roll back the step change; the caller records the
 * returned summary into trade_flow_events.notified.
 */

interface TradeFlowRow {
  id: string;
  flow_number: string;
  rfq_id: string | null;
  purchase_order_id: string | null;
  buyer_user_id: string | null;
  buyer_company_id: string | null;
  buyer_company_name: string | null;
  supplier_company_id: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  current_step: string;
  consignee_company_name: string | null;
  consignee_tin: string | null;
  consignee_phone: string | null;
  consignee_email: string | null;
  destination_port: string | null;
  goods_summary: string | null;
  currency: string;
  goods_total: number | null;
  shipping_cost: number | null;
  grand_total: number | null;
  shipping_fee_due: number | null;
  payment_instructions: string | null;
  shipping_payment_instructions: string | null;
  vessel_name: string | null;
  seaway_bill_number: string | null;
  etd: string | null;
  eta: string | null;
}

/** Document kinds whose links may be embedded per step (release gating). */
const EMAIL_DOC_KINDS: Record<string, string[]> = {
  buyer_invoice_sent: ["buyer_invoice"],
  supplier_order_placed: ["supplier_payment_proof"],
  completed: ["seaway_bill", "ebm"],
};

/**
 * Outbound mail — prefer the sales@ hosted mailbox over SMTP so the message
 * lands in the webmail Sent folder and replies thread back into admin mail;
 * fall back to Resend. Same pattern as sendOpsEmail in src/lib/email/events.ts.
 */
async function sendFlowEmail(
  to: string,
  subject: string,
  html: string,
  template: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: box } = await supabase
    .from("mailboxes")
    .select("id, credential_ref")
    .ilike("address", "sales@%")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (box && process.env[box.credential_ref]) {
    const result = await sendMailboxEmail(supabase, {
      mailboxId: box.id,
      to: [to],
      subject,
      html,
    });
    if (result.success) return true;
  }
  return sendEmail({ to, subject, html }, template);
}

async function resolveBuyer(
  flow: TradeFlowRow
): Promise<{ email: string | null; name: string | null }> {
  if (!flow.buyer_user_id) return { email: null, name: null };
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("email, full_name")
    .eq("id", flow.buyer_user_id)
    .maybeSingle();
  return { email: data?.email ?? null, name: data?.full_name ?? null };
}

async function resolveSupplierEmail(flow: TradeFlowRow): Promise<string | null> {
  if (flow.supplier_email) return flow.supplier_email;
  if (!flow.supplier_company_id) return null;
  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", flow.supplier_company_id)
    .eq("is_primary", true)
    .maybeSingle();
  if (!member?.user_id) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", member.user_id)
    .maybeSingle();
  return profile?.email ?? null;
}

export interface NotifySummary {
  buyerEmail?: string | boolean;
  supplierEmail?: string | boolean;
  telegram?: boolean;
  inApp?: boolean;
}

export async function notifyTradeFlowStep(
  flowId: string,
  step: string,
  note?: string | null
): Promise<NotifySummary> {
  const summary: NotifySummary = {};
  try {
    const supabase = createServiceClient();
    const { data: flow } = await supabase
      .from("trade_flows")
      .select("*")
      .eq("id", flowId)
      .maybeSingle<TradeFlowRow>();
    if (!flow) return summary;

    const def = STEP_DEFS[step];
    if (!def) return summary;

    const buyer = await resolveBuyer(flow);

    // Documents releasable in this step's email
    let documents: FlowEmailContext["documents"] = [];
    const docKinds = EMAIL_DOC_KINDS[step];
    if (docKinds?.length) {
      const { data: docs } = await supabase
        .from("trade_flow_documents")
        .select("kind, file_url, file_name")
        .eq("trade_flow_id", flowId)
        .in("kind", docKinds);
      documents = docs ?? [];
    }

    const ctx: FlowEmailContext = {
      flowNumber: flow.flow_number,
      buyerName: buyer.name,
      buyerCompanyName: flow.buyer_company_name,
      supplierName: flow.supplier_name,
      goodsSummary: flow.goods_summary,
      currency: flow.currency || "USD",
      goodsTotal: flow.goods_total,
      shippingCost: flow.shipping_cost,
      grandTotal: flow.grand_total,
      shippingFeeDue: flow.shipping_fee_due,
      paymentInstructions: flow.payment_instructions,
      shippingPaymentInstructions: flow.shipping_payment_instructions,
      consigneeCompanyName: flow.consignee_company_name,
      consigneeTin: flow.consignee_tin,
      consigneePhone: flow.consignee_phone,
      consigneeEmail: flow.consignee_email,
      destinationPort: flow.destination_port,
      vesselName: flow.vessel_name,
      seawayBillNumber: flow.seaway_bill_number,
      etd: flow.etd,
      eta: flow.eta,
      note: note ?? null,
      documents,
    };

    // --- Buyer email -------------------------------------------------
    if (def.notifies.includes("buyer") && buyer.email) {
      const mail = buyerEmailForStep(step, ctx);
      if (mail) {
        const ok = await sendFlowEmail(buyer.email, mail.subject, mail.html, `trade_flow_${step}_buyer`);
        summary.buyerEmail = ok ? buyer.email : false;
      }
    }

    // --- Supplier email ----------------------------------------------
    if (def.notifies.includes("supplier")) {
      const supplierEmail = await resolveSupplierEmail(flow);
      if (supplierEmail) {
        const mail = supplierEmailForStep(step, ctx);
        if (mail) {
          const ok = await sendFlowEmail(supplierEmail, mail.subject, mail.html, `trade_flow_${step}_supplier`);
          summary.supplierEmail = ok ? supplierEmail : false;
        }
      }
    }

    // --- Ops Telegram (every step) ------------------------------------
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const adminUrl = `${appUrl}/admin/trade-flows/${flow.id}`;
    const amount =
      flow.grand_total !== null ? formatMoney(flow.grand_total, flow.currency || "USD") : "—";
    summary.telegram = await sendTelegramNotification(
      [
        `📦 <b>Trade Flow: ${tgEsc(STEP_DEFS[step]?.label ?? step)}</b>`,
        ``,
        `<b>${tgEsc(flow.flow_number)}</b> · ${tgEsc(flow.buyer_company_name ?? buyer.name)}`,
        `Supplier: ${tgEsc(flow.supplier_name)} · Total: ${tgEsc(amount)}`,
        `Destination: ${tgEsc(flow.destination_port)}`,
        ...(note ? [``, tgEsc(note.slice(0, 300))] : []),
      ].join("\n"),
      appUrl ? { button: { text: "Open trade flow", url: adminUrl } } : {}
    );

    // --- Buyer in-app notification ------------------------------------
    if (def.notifies.includes("buyer") && flow.buyer_user_id) {
      const { error } = await supabase.rpc("create_notification", {
        p_user_id: flow.buyer_user_id,
        p_company_id: flow.buyer_company_id,
        p_title: STEP_DEFS[step]?.label ?? step,
        p_body: `${flow.flow_number}: ${STEP_DEFS[step]?.description ?? ""}`,
        p_type: "order",
        p_icon: "package",
        p_action_url: `/dashboard/trade-flows/${flow.id}`,
        p_reference_type: "trade_flow",
        p_reference_id: flow.id,
      });
      summary.inApp = !error;
    }
  } catch (err) {
    console.error("[trade-flow] notify failed:", err);
  }
  return summary;
}
