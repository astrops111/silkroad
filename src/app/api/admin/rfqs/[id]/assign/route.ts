import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase/server";
import { onRfqAssignedToSupplier, onQuotationReceived } from "@/lib/email/events";
import { ensureDealThread, attachToDealThread } from "@/lib/deals/threads";
import { postDealMessage } from "@/lib/deals/messages";
import { logActivity } from "@/lib/crm/activities";
import { computeQuotationLandedCost } from "@/lib/logistics/landed-cost/from-quotation";

interface AssignItemInput {
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  leadTimeDays?: number;
}

/**
 * POST /api/admin/rfqs/[id]/assign — Ops curates a supplier response.
 *
 * Two modes, same underlying write (quotations.supplier_id/supplier_user_id
 * are NOT NULL, so even a direct admin response must attribute to a real
 * supplier company):
 *   - "draft": pre-fills a draft quotation for the supplier to review/edit
 *     before submitting themselves.
 *   - "binding": submits the quotation immediately on the supplier's
 *     behalf; the buyer sees it right away.
 *
 * This is also the moment supplier_visible_at is set — the RFQ (and this
 * quotation) become visible to the assigned supplier's company for the
 * first time (see 00133_rfq_admin_gated_supplier_visibility.sql).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (isAuthError(admin)) return admin;

  const { id: rfqId } = await params;
  const body = await request.json();
  const {
    supplierId,
    mode,
    items,
    leadTimeDays,
    validityDays,
    tradeTerm,
    paymentTerms,
    shippingMethod,
    shippingCost,
    notes,
  }: {
    supplierId: string;
    mode: "draft" | "binding";
    items: AssignItemInput[];
    leadTimeDays?: number;
    validityDays?: number;
    tradeTerm?: string;
    paymentTerms?: string;
    shippingMethod?: string;
    shippingCost?: number;
    notes?: string;
  } = body;

  if (!supplierId || !mode || !["draft", "binding"].includes(mode)) {
    return NextResponse.json({ error: "supplierId and a valid mode ('draft' | 'binding') are required" }, { status: 400 });
  }
  if (!items?.length) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, rfq_number, status, target_currency, buyer_company_id")
    .eq("id", rfqId)
    .single();
  if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  if (!["open", "quoted"].includes(rfq.status)) {
    return NextResponse.json({ error: `RFQ is ${rfq.status} — cannot assign` }, { status: 400 });
  }

  const { data: supplierMember } = await supabase
    .from("company_members")
    .select("user_id, companies ( name )")
    .eq("company_id", supplierId)
    .eq("is_primary", true)
    .single();
  if (!supplierMember?.user_id) {
    return NextResponse.json({ error: "Supplier has no primary contact to attribute the quotation to" }, { status: 400 });
  }
  const supplierName = (supplierMember.companies as unknown as { name: string } | null)?.name ?? null;

  const currency = rfq.target_currency ?? "USD";
  const shipping = shippingCost ?? 0;
  const itemsTotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const totalAmount = itemsTotal + shipping;

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const quotationNumber = `QTN-${date}-${rand}`;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (validityDays || 30));

  const isBinding = mode === "binding";

  const { data: quotation, error: qError } = await supabase
    .from("quotations")
    .insert({
      quotation_number: quotationNumber,
      rfq_id: rfqId,
      supplier_id: supplierId,
      supplier_user_id: supplierMember.user_id,
      supplier_name: supplierName,
      total_amount: totalAmount,
      currency,
      payment_terms: paymentTerms || "immediate",
      trade_term: tradeTerm || null,
      lead_time_days: leadTimeDays || null,
      validity_days: validityDays || 30,
      valid_until: validUntil.toISOString().slice(0, 10),
      shipping_method: shippingMethod || null,
      shipping_cost: shipping,
      notes: notes || null,
      version: 1,
      status: isBinding ? "submitted" : "draft",
      submitted_at: isBinding ? new Date().toISOString() : null,
    })
    .select("id, quotation_number")
    .single();

  if (qError || !quotation) {
    console.error("[admin/rfqs/assign] quotation insert failed:", qError);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }

  const qItems = items.map((item, idx) => ({
    quotation_id: quotation.id,
    product_name: item.productName,
    quantity: item.quantity,
    unit: item.unit || "pieces",
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
    product_id: item.productId || null,
    variant_id: item.variantId || null,
    lead_time_days: item.leadTimeDays || null,
    sort_order: idx,
  }));
  const { error: itemsError } = await supabase.from("quotation_items").insert(qItems);
  if (itemsError) {
    console.error("[admin/rfqs/assign] quotation_items insert failed:", itemsError);
    await supabase.from("quotations").delete().eq("id", quotation.id);
    return NextResponse.json({ error: "Failed to create quotation items" }, { status: 500 });
  }

  // Release the RFQ to this supplier — first time it becomes visible to them.
  await supabase
    .from("rfqs")
    .update({
      invited_supplier_ids: [supplierId],
      is_public: false,
      supplier_visible_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", rfqId);

  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    quotation_id: quotation.id,
    actor_user_id: admin.profile.id,
    action: isBinding ? "admin_responded" : "admin_assigned",
    details: { supplierId, mode, quotationNumber },
  });

  try {
    await onRfqAssignedToSupplier(rfqId, supplierId, mode, quotation.id);
    if (isBinding) {
      await onQuotationReceived(rfqId, supplierName ?? "A supplier");
    }
  } catch (err) {
    console.error("[admin/rfqs/assign] notifications failed:", err);
  }

  const dealThreadId = await ensureDealThread({ rfqId });
  if (dealThreadId) {
    await attachToDealThread(dealThreadId, { quotationId: quotation.id, supplierCompanyId: supplierId });
  }
  await logActivity({
    activityType: "quote_submitted",
    actorType: "user",
    actorUserId: admin.profile.id,
    companyId: rfq.buyer_company_id ?? undefined,
    dealThreadId,
    referenceType: "quotation",
    referenceId: quotation.id,
    metadata: { quotationNumber, mode, totalAmount, currency, supplierId, adminAssigned: true },
  });
  if (dealThreadId) {
    await postDealMessage(dealThreadId, {
      body: isBinding
        ? `Ops submitted quote ${quotationNumber} on behalf of ${supplierName ?? "the assigned supplier"} — ${currency} ${(totalAmount / 100).toFixed(2)}.`
        : `Ops assigned this RFQ to ${supplierName ?? "a supplier"} with a suggested quote ${quotationNumber} awaiting their confirmation.`,
      actorUserId: admin.profile.id,
      references: [
        { type: "quotation", id: quotation.id, label: quotationNumber },
        { type: "rfq", id: rfqId },
      ],
    });
  }

  if (isBinding) {
    await computeQuotationLandedCost(quotation.id);
  }

  return NextResponse.json({
    success: true,
    quotationId: quotation.id,
    quotationNumber: quotation.quotation_number,
    mode,
    status: isBinding ? "submitted" : "draft",
  });
}
