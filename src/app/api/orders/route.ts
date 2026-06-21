import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderTax } from "@/lib/tax";
import { calculateShippingCost } from "@/lib/logistics/rates/calculator";
import { createOrderSchema } from "@/lib/validators/order";
import { onOrderPlacedOpsNotify } from "@/lib/email/events";
import {
  shippingGroupKey,
  shippingModeToMethod,
  chargeableWeightKg,
  PLATFORM_MIN_GROUP_ORDER_VALUE,
} from "@/lib/logistics/rates/config";
import { randomBytes } from "crypto";

/**
 * POST /api/orders — Create a multi-vendor purchase order
 *
 * Items are grouped by (supplierId, shippingMode) into shipping groups.
 * Each group is validated independently:
 *   - subtotal >= PLATFORM_MIN_GROUP_ORDER_VALUE
 *   - per-item quantity >= moq  (enforced by Zod schema)
 * Shipping cost and CBM are computed per group using the rate for that group's shipping method.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    items,
    buyerCompanyId,
    buyerTaxId,
    buyerCompanyName,
    shippingAddresses,
    paymentGateway,
    phoneNumber,
    currency,
    note,
  } = parsed.data;

  // Get buyer profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, country_code")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // L3: If buyerCompanyId is supplied, verify the caller is a member of that company
  if (buyerCompanyId) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("company_id", buyerCompanyId)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // ── Group items by (supplierId, shippingMode) ─────────────────────────────
  type GroupEntry = {
    groupKey: string;
    supplierId: string;
    shippingMode: string | undefined;
    items: typeof items;
  };
  const shippingGroups: Record<string, GroupEntry> = {};

  for (const item of items) {
    const key = shippingGroupKey(item.supplierId, item.shippingMode);
    if (!shippingGroups[key]) {
      shippingGroups[key] = {
        groupKey: key,
        supplierId: item.supplierId,
        shippingMode: item.shippingMode,
        items: [],
      };
    }
    shippingGroups[key].items.push(item);
  }

  // ── Validate per-group minimum order value ────────────────────────────────
  const belowMinimum: { groupKey: string; subtotalMinor: number; minimumMinor: number }[] = [];
  for (const group of Object.values(shippingGroups)) {
    const groupSubtotal = group.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    if (groupSubtotal < PLATFORM_MIN_GROUP_ORDER_VALUE) {
      belowMinimum.push({
        groupKey: group.groupKey,
        subtotalMinor: groupSubtotal,
        minimumMinor: PLATFORM_MIN_GROUP_ORDER_VALUE,
      });
    }
  }
  if (belowMinimum.length > 0) {
    return NextResponse.json(
      {
        error: "One or more shipping groups do not meet the minimum order value",
        minimumMinor: PLATFORM_MIN_GROUP_ORDER_VALUE,
        groups: belowMinimum,
      },
      { status: 400 }
    );
  }

  // ── Fetch all active shipping rates upfront (keyed by shipping_method) ───
  const { data: rateRows } = await supabase
    .from("shipping_rates")
    .select(
      "shipping_method, base_rate, per_kg_rate, per_cbm_rate, min_charge, free_shipping_threshold, estimated_days_min, estimated_days_max, currency"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const ratesByMethod: Record<string, typeof rateRows extends (infer R)[] | null ? R : never> = {};
  for (const row of rateRows ?? []) {
    if (!ratesByMethod[row.shipping_method]) {
      ratesByMethod[row.shipping_method] = row;
    }
  }

  function getRateForMethod(method: string) {
    const row = ratesByMethod[method];
    return {
      baseRate: row?.base_rate ?? 500,
      perKgRate: row?.per_kg_rate ?? 150,
      perCbmRate: row?.per_cbm_rate ?? 0,
      minCharge: row?.min_charge ?? 500,
      freeShippingThreshold: row?.free_shipping_threshold ?? 100000,
      estimatedDaysMin: row?.estimated_days_min ?? undefined,
      estimatedDaysMax: row?.estimated_days_max ?? undefined,
      currency: row?.currency ?? currency,
    };
  }

  // ── Fetch supplier country codes (deduplicated) ───────────────────────────
  const uniqueSupplierIds = [...new Set(items.map((i) => i.supplierId))];
  const { data: supplierRows } = await supabase
    .from("companies")
    .select("id, country_code")
    .in("id", uniqueSupplierIds);

  const supplierCountry: Record<string, string> = {};
  for (const row of supplierRows ?? []) {
    supplierCountry[row.id] = row.country_code;
  }

  // ── Generate order number ─────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const orderNumber = `ORD-${date}-${rand}`;

  // ── Calculate totals per shipping group ───────────────────────────────────
  let grandSubtotal = 0;
  let grandTax = 0;
  let grandShipping = 0;
  let grandVolumeCbm = 0;

  type GroupOrderData = {
    groupKey: string;
    supplier_id: string;
    order_number: string;
    subtotal: number;
    shipping_fee: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    payment_gateway: string | undefined;
    items: typeof items;
    status: string;
    shippingMode: string | undefined;
    totalVolumeCbm: number;
    shippingBreakdown: string;
    perCbmRate: number;
  };
  const groupOrdersData: GroupOrderData[] = [];
  let groupIndex = 0;

  for (const group of Object.values(shippingGroups)) {
    const { supplierId, shippingMode, items: groupItems } = group;

    const subtotal = groupItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const originCountry = supplierCountry[supplierId] ?? "CN";

    // Tax
    const taxResult = calculateOrderTax({
      subtotal,
      currency,
      supplierCountry: originCountry,
      buyerCountry: profile.country_code || "GH",
    });

    // Shipping — per-group totals and chargeable weight
    const totalActualKg = groupItems.reduce(
      (sum, item) => sum + (item.weightKg ?? 0) * item.quantity,
      0
    );
    const totalVolumeCbm = groupItems.reduce(
      (sum, item) => sum + (item.volumeCbm ?? 0) * item.quantity,
      0
    );
    // Chargeable weight = max(actual, volumetric) — carriers bill the higher of the two
    const totalWeightKg = chargeableWeightKg(totalActualKg, totalVolumeCbm, shippingMode);
    if (totalWeightKg === 0) {
      console.warn("[orders] Zero chargeable weight for group", group.groupKey, "— items may be missing weight/dimensions data");
    }

    const shippingMethod = shippingModeToMethod(shippingMode);
    const rate = getRateForMethod(shippingMethod);

    const shippingResult = calculateShippingCost(
      {
        originZoneId: originCountry,
        destinationZoneId: profile.country_code || "GH",
        shippingMethod,
        totalWeightKg,
        totalVolumeCbm: totalVolumeCbm > 0 ? totalVolumeCbm : undefined,
        subtotal,
        currency,
      },
      rate
    );

    const shippingFee = shippingResult.totalCost;
    // customsDuty is an estimated landed-cost figure separate from import VAT
    const customsDuty = taxResult.customsDuty ?? 0;
    const groupTaxAmount = taxResult.breakdown.totalTax + customsDuty;
    const soNumber = `${orderNumber}-G${++groupIndex}`;

    grandSubtotal += subtotal;
    grandTax += groupTaxAmount;
    grandShipping += shippingFee;
    grandVolumeCbm += totalVolumeCbm;

    groupOrdersData.push({
      groupKey: group.groupKey,
      supplier_id: supplierId,
      order_number: soNumber,
      subtotal,
      shipping_fee: shippingFee,
      tax_amount: groupTaxAmount,
      total_amount: subtotal + groupTaxAmount + shippingFee,
      currency,
      payment_gateway: paymentGateway,
      items: groupItems,
      status: "pending_payment",
      shippingMode,
      totalVolumeCbm,
      shippingBreakdown: shippingResult.breakdown,
      perCbmRate: rate.perCbmRate,
    });
  }

  const grandTotal = grandSubtotal + grandTax + grandShipping;

  // ── Persist purchase order ────────────────────────────────────────────────
  const { data: purchaseOrder, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      order_number: orderNumber,
      buyer_user_id: profile.id,
      buyer_company_id: buyerCompanyId || null,
      subtotal: grandSubtotal,
      total_shipping: grandShipping,
      total_tax: grandTax,
      grand_total: grandTotal,
      currency,
      status: "pending_payment",
      buyer_tax_id: buyerTaxId,
      buyer_company_name: buyerCompanyName,
      note,
    })
    .select("id")
    .single();

  if (poError) {
    console.error("[orders] Failed to create purchase order:", poError);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }

  // ── Persist supplier orders (one per shipping group) ─────────────────────
  const supplierOrderIds: string[] = [];
  const failedGroups: string[] = [];
  const responseGroups: {
    cartGroupKey: string;
    supplierOrderNumber: string;
    shippingMode: string | undefined;
    subtotal: number;
    totalVolumeCbm: number;
    perCbmRate: number;
    volumeCharge: number;
    shippingFee: number;
    breakdown: string;
  }[] = [];

  for (const soData of groupOrdersData) {
    const { data: so, error: soError } = await supabase
      .from("supplier_orders")
      .insert({
        purchase_order_id: purchaseOrder.id,
        supplier_id: soData.supplier_id,
        order_number: soData.order_number,
        subtotal: soData.subtotal,
        shipping_fee: soData.shipping_fee,
        tax_amount: soData.tax_amount,
        total_amount: soData.total_amount,
        currency: soData.currency,
        payment_gateway: soData.payment_gateway,
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (soError) {
      console.error("[orders] Failed to create supplier order:", soError);
      failedGroups.push(soData.order_number);
      continue;
    }

    supplierOrderIds.push(so.id);

    const orderItems = soData.items.map((item) => ({
      supplier_order_id: so.id,
      product_id: item.productId,
      variant_id: item.variantId || null,
      product_name: item.productName || item.name || "",
      variant_name: item.variantName || null,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.unitPrice * item.quantity,
      currency: soData.currency,
    }));

    const { error: itemsError } = await supabase
      .from("supplier_order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[orders] Failed to insert order items for", soData.order_number, itemsError);
      failedGroups.push(soData.order_number);
      continue;
    }

    responseGroups.push({
      cartGroupKey: soData.groupKey,
      supplierOrderNumber: soData.order_number,
      shippingMode: soData.shippingMode,
      subtotal: soData.subtotal,
      totalVolumeCbm: soData.totalVolumeCbm,
      perCbmRate: soData.perCbmRate,
      volumeCharge: Math.round(soData.totalVolumeCbm * soData.perCbmRate),
      shippingFee: soData.shipping_fee,
      breakdown: soData.shippingBreakdown,
    });
  }

  if (failedGroups.length > 0) {
    console.error("[orders] Order partially failed for PO", purchaseOrder.id, failedGroups);
    // Mark the purchase order failed so it is identifiable by a cleanup job.
    // Any supplier_orders already inserted reference this PO via purchase_order_id
    // and will be caught by the same cleanup pass.
    await supabase
      .from("purchase_orders")
      .update({ status: "failed" })
      .eq("id", purchaseOrder.id);
    return NextResponse.json(
      { error: "Order creation failed — please contact support" },
      { status: 500 }
    );
  }

  // Fire-and-forget ops notification — do not block the response.
  onOrderPlacedOpsNotify(purchaseOrder.id).catch((err) => {
    console.error("[orders] ops notification failed:", err);
  });

  return NextResponse.json({
    success: true,
    orderId: purchaseOrder.id,
    orderNumber,
    grandTotal,
    currency,
    shippingGroupCount: supplierOrderIds.length,
    shippingBreakdown: {
      totalVolumeCbm: grandVolumeCbm,
      groups: responseGroups,
    },
    nextAction: "initiate_payment",
  });
}
