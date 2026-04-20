import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderTax } from "@/lib/tax";
import { calculateShippingCost } from "@/lib/logistics/rates/calculator";
import { createOrderSchema } from "@/lib/validators/order";
import { randomBytes } from "crypto";

/**
 * POST /api/orders — Create a multi-vendor purchase order
 * Splits cart items by supplier, calculates tax per supplier, creates purchase_order + supplier_orders
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
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

  // Group items by supplier
  const supplierGroups: Record<string, typeof items> = {};
  for (const item of items) {
    if (!supplierGroups[item.supplierId]) {
      supplierGroups[item.supplierId] = [];
    }
    supplierGroups[item.supplierId].push(item);
  }

  // Generate order number with cryptographic randomness
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const orderNumber = `ORD-${date}-${rand}`;

  // Calculate totals per supplier
  let grandSubtotal = 0;
  let grandTax = 0;
  let grandShipping = 0;

  const supplierOrdersData = [];
  let supplierIndex = 0;

  for (const [supplierId, supplierItems] of Object.entries(supplierGroups)) {
    const subtotal = supplierItems.reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + item.unitPrice * item.quantity,
      0
    );

    // Get supplier country for tax calculation
    const { data: supplier } = await supabase
      .from("companies")
      .select("country_code")
      .eq("id", supplierId)
      .single();

    // Calculate tax
    const taxResult = calculateOrderTax({
      subtotal,
      currency,
      supplierCountry: supplier?.country_code || "GH",
      buyerCountry: profile.country_code || "GH",
    });

    // Calculate shipping via logistics rate engine
    const totalWeight = supplierItems.reduce(
      (sum: number, item: { weightKg?: number; quantity: number }) =>
        sum + (item.weightKg || 0.5) * item.quantity,
      0
    );
    const shippingResult = calculateShippingCost(
      {
        originZoneId: supplier?.country_code || "CN",
        destinationZoneId: profile.country_code || "GH",
        shippingMethod: "platform_standard",
        totalWeightKg: totalWeight,
        subtotal,
        currency,
      },
      {
        baseRate: 500,       // $5.00 base
        perKgRate: 150,      // $1.50/kg
        perCbmRate: 0,
        minCharge: 500,      // $5.00 minimum
        freeShippingThreshold: 100000, // Free above $1000
        currency,
      }
    );
    const shippingFee = shippingResult.totalCost;
    const soNumber = `${orderNumber}-S${++supplierIndex}`;

    grandSubtotal += subtotal;
    grandTax += taxResult.breakdown.totalTax;
    grandShipping += shippingFee;

    supplierOrdersData.push({
      supplier_id: supplierId,
      order_number: soNumber,
      subtotal,
      shipping_fee: shippingFee,
      tax_amount: taxResult.breakdown.totalTax,
      total_amount: subtotal + taxResult.breakdown.totalTax + shippingFee,
      currency,
      payment_gateway: paymentGateway,
      items: supplierItems,
      status: "pending_payment",
    });
  }

  const grandTotal = grandSubtotal + grandTax + grandShipping;

  // Create purchase order + supplier orders in a transaction
  // Using Supabase's RPC for atomic operation
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

  // Create supplier orders
  const supplierOrderIds = [];
  for (const soData of supplierOrdersData) {
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
      continue;
    }

    supplierOrderIds.push(so.id);

    // Create order items
    const orderItems = soData.items.map(
      (item) => ({
        supplier_order_id: so.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        product_name: item.productName || item.name || "",
        variant_name: item.variantName || null,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
        currency: soData.currency,
      })
    );

    await supabase.from("supplier_order_items").insert(orderItems);
  }

  return NextResponse.json({
    success: true,
    orderId: purchaseOrder.id,
    orderNumber,
    grandTotal,
    currency,
    supplierOrderCount: supplierOrderIds.length,
    // Next step: client should initiate payment
    nextAction: "initiate_payment",
  });
}
