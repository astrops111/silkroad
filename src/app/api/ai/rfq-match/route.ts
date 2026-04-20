import { NextRequest, NextResponse } from "next/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { matchSuppliersToRFQ } from "@/lib/ai/rfq-matcher";
import type { RFQData, SupplierCandidate } from "@/lib/ai/rfq-matcher";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/ai/rfq-match — AI-powered supplier matching for an RFQ
 * Body: { rfqId }
 */
export async function POST(request: NextRequest) {
  const blocked = await requireAIFeature("ai_rfq_matcher");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const { rfqId } = await request.json();
    if (!rfqId) {
      return NextResponse.json({ error: "rfqId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch RFQ with items
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .select(`
        *, categories:category_id (name),
        rfq_items (product_name, quantity, unit, specifications)
      `)
      .eq("id", rfqId)
      .single();

    if (rfqErr || !rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    const rfqData: RFQData = {
      id: rfq.id,
      rfqNumber: rfq.rfq_number,
      title: rfq.title,
      description: rfq.description || "",
      categoryName: (rfq.categories as { name: string } | null)?.name || "General",
      quantity: rfq.quantity,
      unit: rfq.unit || "pieces",
      targetPrice: rfq.target_price,
      currency: rfq.target_currency || "USD",
      deliveryCountry: rfq.delivery_country || "",
      deliveryCity: rfq.delivery_city || "",
      requiredBy: rfq.required_by,
      tradeTerm: rfq.trade_term,
      specifications: (rfq.specifications as Record<string, unknown>) || {},
      certificationsRequired: (rfq.certifications_required as string[]) || [],
      items: ((rfq.rfq_items as Array<Record<string, unknown>>) || []).map((i) => ({
        productName: i.product_name as string,
        quantity: i.quantity as number,
        specifications: (i.specifications as Record<string, unknown>) || {},
      })),
    };

    // 2. Fetch supplier candidates — active suppliers with products in matching category
    const { data: suppliers } = await supabase
      .from("supplier_profiles")
      .select(`
        company_id, tier, response_rate, on_time_delivery_rate, average_rating,
        total_orders, certifications,
        companies:company_id (id, name, country_code, verification_status)
      `)
      .order("average_rating", { ascending: false })
      .limit(50);

    if (!suppliers || suppliers.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          matches: [],
          summary: "No supplier candidates available.",
          totalCandidatesScanned: 0,
          matchCriteria: [],
        },
      });
    }

    // Fetch products for each supplier
    const supplierIds = suppliers.map((s) => s.company_id);
    const { data: products } = await supabase
      .from("products")
      .select("supplier_id, name, base_price, currency, moq, categories:category_id (name)")
      .in("supplier_id", supplierIds)
      .eq("moderation_status", "approved")
      .eq("is_active", true)
      .limit(200);

    // Group products by supplier
    const productsBySupplier = new Map<string, typeof products>();
    for (const p of products || []) {
      const existing = productsBySupplier.get(p.supplier_id) || [];
      existing.push(p);
      productsBySupplier.set(p.supplier_id, existing);
    }

    const candidates: SupplierCandidate[] = suppliers.map((s) => {
      const company = s.companies as unknown as { id: string; name: string; country_code: string; verification_status: string } | null;
      const supplierProducts = productsBySupplier.get(s.company_id) || [];

      return {
        companyId: s.company_id,
        companyName: company?.name || "Unknown",
        country: company?.country_code || "",
        tier: s.tier || "free",
        verificationStatus: company?.verification_status || "unverified",
        rating: s.average_rating || 0,
        totalOrders: s.total_orders || 0,
        responseRate: s.response_rate || 0,
        onTimeDeliveryRate: s.on_time_delivery_rate || 0,
        productCategories: [...new Set(
          supplierProducts.map((p) => (p.categories as unknown as { name: string } | null)?.name || "General")
        )],
        products: supplierProducts.slice(0, 10).map((p) => ({
          name: p.name,
          basePrice: p.base_price as number,
          currency: (p.currency as string) || "USD",
          moq: (p.moq as number) || 1,
        })),
        certifications: (s.certifications as string[]) || [],
      };
    });

    // 3. Run AI matching
    const result = await matchSuppliersToRFQ(rfqData, candidates);

    // 4. Update RFQ matched count
    await supabase
      .from("rfqs")
      .update({
        matched_supplier_count: result.matches.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rfqId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("RFQ matching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RFQ matching failed" },
      { status: 500 }
    );
  }
}
