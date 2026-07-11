import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_MIN_GROUP_ORDER_VALUE } from "@/lib/logistics/rates/config";
import { onRfqSubmitted } from "@/lib/email/events";
import { ensureDealThread } from "@/lib/deals/threads";
import { postDealMessage } from "@/lib/deals/messages";
import { logActivity } from "@/lib/crm/activities";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  productName: z.string().min(1),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  currency: z.string().length(3),
  moq: z.number().int().positive(),
  boxPackQty: z.number().int().positive().optional(),
});

const fromCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
  note: z.string().max(2000).optional(),
  deadline: z
    .string()
    .max(50)
    .refine((d) => !d || new Date(d) > new Date(), "Deadline must be in the future")
    .optional()
    .nullable(),
});

/**
 * POST /api/rfqs/from-cart
 *
 * Creates one private RFQ per supplier from the buyer's cart.
 * Each RFQ is immediately published (status: "open") and sent only
 * to that supplier via invited_supplier_ids.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, country_code")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = fromCartSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { items, note, deadline } = parsed.data;

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies ( name )")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  const buyerCompanyName =
    (membership?.companies as unknown as { name: string } | null)?.name ?? null;

  // Group by supplier — one RFQ per supplier
  const supplierGroups = new Map<string, { supplierName: string; items: typeof items }>();
  for (const item of items) {
    if (!supplierGroups.has(item.supplierId)) {
      supplierGroups.set(item.supplierId, { supplierName: item.supplierName, items: [] });
    }
    supplierGroups.get(item.supplierId)!.items.push(item);
  }

  // Enforce the platform minimum order value before creating anything.
  // The cart UI groups by shipping group; this route only sees supplier
  // grouping, so the minimum is validated per supplier group here — the
  // client remains the authority on shipping-group semantics.
  // PLATFORM_MIN_GROUP_ORDER_VALUE is USD-cents; comparison assumes USD carts.
  const belowMinimum: { supplierName: string; subtotalMinor: number; shortfallMinor: number }[] = [];
  for (const [, group] of supplierGroups) {
    const subtotalMinor = group.items.reduce(
      (sum, i) => sum + Math.round(i.unitPrice * i.quantity),
      0
    );
    if (subtotalMinor < PLATFORM_MIN_GROUP_ORDER_VALUE) {
      belowMinimum.push({
        supplierName: group.supplierName,
        subtotalMinor,
        shortfallMinor: PLATFORM_MIN_GROUP_ORDER_VALUE - subtotalMinor,
      });
    }
  }
  if (belowMinimum.length > 0) {
    return NextResponse.json(
      {
        error: `Minimum order value of $${(PLATFORM_MIN_GROUP_ORDER_VALUE / 100).toFixed(0)} per supplier not met`,
        belowMinimum,
        minimumMinor: PLATFORM_MIN_GROUP_ORDER_VALUE,
      },
      { status: 422 }
    );
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const created: { rfqId: string; rfqNumber: string; supplierName: string }[] = [];
  const failed: string[] = [];

  for (const [supplierId, group] of supplierGroups) {
    const rand = randomBytes(3).toString("hex").toUpperCase();
    const rfqNumber = `RFQ-${date}-${rand}`;
    const currency = group.items[0].currency;

    // When every item in this supplier's group is boxed (Korean Beauty
    // Trading Co catalog), request/quote in boxes; mixed or unboxed carts
    // fall back to pieces, unchanged from before.
    const allBoxed = group.items.every((i) => (i.boxPackQty ?? 1) > 1);
    const rfqUnit = allBoxed ? "boxes" : "pieces";
    const totalQty = group.items.reduce(
      (sum, i) => sum + (allBoxed ? Math.round(i.quantity / (i.boxPackQty ?? 1)) : i.quantity),
      0
    );

    const title =
      group.items.length === 1
        ? group.items[0].productName
        : `${group.items.length} products from ${group.supplierName}`;

    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .insert({
        rfq_number: rfqNumber,
        buyer_user_id: profile.id,
        buyer_company_id: membership?.company_id ?? null,
        buyer_company_name: buyerCompanyName,
        buyer_country: profile.country_code,
        title,
        description: note ?? null,
        quantity: totalQty,
        unit: rfqUnit,
        target_currency: currency,
        delivery_country: profile.country_code,
        invited_supplier_ids: [supplierId],
        is_public: false,
        status: "open",
        published_at: new Date().toISOString(),
        deadline: deadline ?? null,
        specifications: {},
        certifications_required: [],
        sample_required: false,
      })
      .select("id, rfq_number")
      .single();

    if (rfqError || !rfq) {
      console.error("[rfqs/from-cart] Failed for supplier", supplierId, rfqError);
      failed.push(group.supplierName);
      continue;
    }

    const rfqItems = group.items.map((item, idx) => {
      const boxPackQty = item.boxPackQty ?? 1;
      if (boxPackQty > 1) {
        const boxes = Math.round(item.quantity / boxPackQty);
        const boxPriceCents = Math.round(item.unitPrice * boxPackQty);
        return {
          rfq_id: rfq.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: boxes,
          unit: "boxes",
          target_unit_price: boxPriceCents,
          currency: item.currency,
          description: `${boxPackQty} pcs/box — ${(item.unitPrice / 100).toFixed(2)} ${item.currency}/pc (${item.quantity} pcs total)`,
          specifications: { perPieceUnitPrice: item.unitPrice, boxPackQty, totalPieces: item.quantity },
          sort_order: idx,
        };
      }
      return {
        rfq_id: rfq.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit: "pieces",
        target_unit_price: Math.round(item.unitPrice),
        currency: item.currency,
        sort_order: idx,
      };
    });

    const { error: rfqItemsError } = await supabase.from("rfq_items").insert(rfqItems);
    if (rfqItemsError) {
      console.error("[rfqs/from-cart] Failed to insert rfq_items for", rfq.id, rfqItemsError);
      failed.push(group.supplierName);
      continue;
    }

    const { error: logError } = await supabase.from("rfq_activity_log").insert({
      rfq_id: rfq.id,
      actor_user_id: profile.id,
      actor_company_id: membership?.company_id ?? null,
      action: "published",
      details: { source: "cart", rfqNumber },
    });
    if (logError) {
      console.error("[rfqs/from-cart] Activity log failed for", rfq.id, logError);
    }

    created.push({
      rfqId: rfq.id,
      rfqNumber: rfq.rfq_number,
      supplierName: group.supplierName,
    });

    // CRM: open a deal thread + opportunity for this RFQ and log the activity
    const dealThreadId = await ensureDealThread({
      rfqId: rfq.id,
      title,
      buyerCompanyId: membership?.company_id ?? null,
      buyerUserId: profile.id,
      supplierCompanyId: supplierId,
    });
    await logActivity({
      activityType: "rfq_submitted",
      actorType: "user",
      actorUserId: profile.id,
      companyId: membership?.company_id ?? null,
      dealThreadId,
      referenceType: "rfq",
      referenceId: rfq.id,
      metadata: {
        rfqNumber,
        supplierId,
        productIds: group.items.map((i) => i.productId),
      },
    });
    // Internal-channel leg: post the milestone into the deal conversation
    if (dealThreadId) {
      await postDealMessage(dealThreadId, {
        body: `RFQ ${rfqNumber} submitted — ${group.items.length} item${group.items.length === 1 ? "" : "s"}. Suppliers have been invited to quote.`,
        actorUserId: profile.id,
        references: [{ type: "rfq", id: rfq.id, label: rfqNumber }],
      });
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ error: "Failed to create RFQs" }, { status: 500 });
  }

  // Notify supplier + buyer + ops (email and in-app). Awaited so the sends
  // complete before the serverless response ends; failures never block the RFQ.
  for (const rfq of created) {
    try {
      await onRfqSubmitted(rfq.rfqId);
    } catch (err) {
      console.error("[rfqs/from-cart] Notification failed for", rfq.rfqId, err);
    }
  }

  return NextResponse.json({
    success: true,
    rfqs: created,
    ...(failed.length > 0 && { partialFailure: true, failedSuppliers: failed }),
  });
}
