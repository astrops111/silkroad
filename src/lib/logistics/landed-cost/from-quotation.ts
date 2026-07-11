import { createServiceClient } from "@/lib/supabase/server";
import {
  LiveFreightLaneProvider,
  DBFxProvider,
  DBTariffProvider,
  quoteLandedCost,
  type CargoItem,
  type ContainerType,
  type LandedCostInput,
  type ShippingMethod,
  type TradeTerm,
} from "@/lib/logistics/landed-cost";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================
// Quotation-time landed cost — when a supplier submits a quote,
// estimate freight + duties so the buyer compares TOTAL landed
// cost before awarding. Missing HS codes / weights are never
// guessed: the quotation is marked pending_data and ops is
// notified to prepare a manual freight quote instead.
// ============================================================

const lanes = new LiveFreightLaneProvider();
const tariffs = new DBTariffProvider();
const fx = new DBFxProvider();

interface DimensionsCm {
  length?: number;
  width?: number;
  height?: number;
}

function volumeCbm(dims: Json | null): number | undefined {
  if (!dims || typeof dims !== "object" || Array.isArray(dims)) return undefined;
  const d = dims as DimensionsCm;
  if (!d.length || !d.width || !d.height) return undefined;
  return (d.length * d.width * d.height) / 1_000_000;
}

/**
 * Compute and persist a landed-cost estimate for a submitted quotation.
 * Best-effort: never throws (callers fire it after quote submission and
 * a failure must not block the quote).
 */
export async function computeQuotationLandedCost(quotationId: string): Promise<void> {
  const supabase = createServiceClient();

  try {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("id, rfq_id, supplier_id, total_amount, currency, trade_term, shipping_method")
      .eq("id", quotationId)
      .maybeSingle();
    if (!quotation) return;

    const { data: rfq } = await supabase
      .from("rfqs")
      .select("id, delivery_country, buyer_country")
      .eq("id", quotation.rfq_id)
      .maybeSingle();
    if (!rfq) return;

    const destinationCountry = rfq.delivery_country ?? rfq.buyer_country;
    if (!destinationCountry) {
      await markStatus(quotationId, "pending_data");
      return;
    }

    const { data: rfqItems } = await supabase
      .from("rfq_items")
      .select(`
        id, product_name, quantity, unit, target_unit_price, hs_code, product_id,
        products ( hs_code, weight_kg, dimensions_cm, origin_country )
      `)
      .eq("rfq_id", quotation.rfq_id);

    const { data: supplier } = await supabase
      .from("companies")
      .select("country_code")
      .eq("id", quotation.supplier_id)
      .maybeSingle();

    const items: CargoItem[] = [];
    let originCountry: string | null = supplier?.country_code ?? null;
    let missingData = (rfqItems ?? []).length === 0;

    for (const item of rfqItems ?? []) {
      const product = item.products as unknown as {
        hs_code: string | null;
        weight_kg: number | null;
        dimensions_cm: Json | null;
        origin_country: string | null;
      } | null;

      const hsCode = product?.hs_code ?? item.hs_code;
      const weight = product?.weight_kg;
      if (!hsCode || !weight) {
        // Never guess duty-relevant data — flag instead (AI HS suggestions
        // are ops-review-only, they must not silently feed duty math).
        missingData = true;
        continue;
      }
      if (product?.origin_country) originCountry = product.origin_country;

      items.push({
        description: item.product_name,
        hsCode,
        quantity: item.quantity,
        unitCostMinor: item.target_unit_price ?? 0,
        weightKgPerUnit: weight,
        volumeCbmPerUnit: volumeCbm(product?.dimensions_cm ?? null),
      });
    }

    if (missingData || items.length === 0 || !originCountry) {
      await markStatus(quotationId, "pending_data");
      await notifyOpsPendingData(quotation.id);
      return;
    }

    const shippingMethod = (quotation.shipping_method ?? "platform_freight") as ShippingMethod;
    const containerType: ContainerType = shippingMethod.includes("express")
      ? "air_express"
      : "lcl";

    const input: LandedCostInput = {
      items,
      currency: quotation.currency ?? "USD",
      origin: { country: originCountry },
      destination: { country: destinationCountry },
      shippingMethod,
      containerType,
      incoterm: (quotation.trade_term ?? "fob") as TradeTerm,
      insurance: { mode: "auto" },
      // Quotations carry a total, not per-item costs — anchor goods value
      // to the supplier's quoted total.
      goodsValueOverrideMinor: quotation.total_amount,
    };

    const breakdown = await quoteLandedCost(input, { lanes, tariffs, fx });

    await supabase
      .from("quotations")
      .update({
        landed_cost_snapshot: breakdown as unknown as Json,
        landed_cost_computed_at: new Date().toISOString(),
        landed_cost_status: "estimated",
      })
      .eq("id", quotationId);
  } catch (err) {
    console.error("[landed-cost/from-quotation] failed for", quotationId, err);
    await markStatus(quotationId, "pending_data").catch(() => {});
    await notifyOpsPendingData(quotationId).catch(() => {});
  }
}

async function markStatus(
  quotationId: string,
  status: "pending_data" | "estimated" | "ops_quoted"
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("quotations")
    .update({
      landed_cost_status: status,
      landed_cost_computed_at: new Date().toISOString(),
    })
    .eq("id", quotationId);
}

/**
 * Ops heads-up so a human can prepare a manual freight quote: creates an
 * ops_freight_quotes task prefilled from the quotation (idempotent on
 * quotation_id) and notifies admins with a deep link to that task. When
 * ops complete it, the write-back in ops-freight-quotes actions pushes
 * the breakdown onto the quotation as landed_cost_status='ops_quoted'.
 */
async function notifyOpsPendingData(quotationId: string): Promise<void> {
  const supabase = createServiceClient();

  // Idempotent: one ops task per quotation across retries/recomputes
  const { data: existing } = await supabase
    .from("ops_freight_quotes")
    .select("id")
    .eq("quotation_id", quotationId)
    .maybeSingle();

  let opsQuoteId = existing?.id ?? null;

  if (!opsQuoteId) {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("id, rfq_id, supplier_id, total_amount, currency, trade_term, shipping_method")
      .eq("id", quotationId)
      .maybeSingle();

    if (quotation) {
      const [{ data: rfq }, { data: rfqItems }, { data: supplier }] = await Promise.all([
        supabase
          .from("rfqs")
          .select("id, rfq_number, delivery_country, buyer_country")
          .eq("id", quotation.rfq_id)
          .maybeSingle(),
        supabase
          .from("rfq_items")
          .select("product_name, quantity, hs_code, products ( hs_code, weight_kg )")
          .eq("rfq_id", quotation.rfq_id),
        supabase
          .from("companies")
          .select("country_code")
          .eq("id", quotation.supplier_id)
          .maybeSingle(),
      ]);

      const hsCodes = Array.from(
        new Set(
          (rfqItems ?? [])
            .map((i) => (i.products as unknown as { hs_code: string | null } | null)?.hs_code ?? i.hs_code)
            .filter((c): c is string => Boolean(c))
        )
      );
      const description = (rfqItems ?? [])
        .map((i) => `${i.quantity} × ${i.product_name}`)
        .join("; ")
        .slice(0, 500);

      const suffix = quotationId.replace(/-/g, "").slice(0, 8).toUpperCase();
      const now = new Date();
      const { data: created, error } = await supabase
        .from("ops_freight_quotes")
        .insert({
          quote_number: `FQT-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}-${suffix}`,
          requester_type: "internal",
          requester_company: "SilkRoad Africa (quotation pipeline)",
          source_channel: "quotation_auto",
          source_reference: rfq?.rfq_number ?? quotation.rfq_id,
          quotation_id: quotation.id,
          rfq_id: quotation.rfq_id,
          cargo_description: description || null,
          hs_codes: hsCodes.length > 0 ? hsCodes : null,
          package_count: (rfqItems ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0) || null,
          goods_value: quotation.total_amount,
          goods_currency: quotation.currency ?? "USD",
          origin_country: supplier?.country_code ?? null,
          destination_country: rfq?.delivery_country ?? rfq?.buyer_country ?? null,
          trade_term: (quotation.trade_term ?? "fob") as "fob",
          status: "draft",
          notes:
            "Auto-created: supplier quotation is missing HS codes or weights. " +
            "Complete this freight quote — the breakdown writes back to the buyer's quotation automatically.",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[landed-cost/from-quotation] ops task create failed:", error.message);
      }
      opsQuoteId = created?.id ?? null;
    }
  }

  const { data: admins } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("role", "admin_super");

  for (const admin of admins ?? []) {
    await supabase.rpc("create_notification", {
      p_user_id: admin.user_id,
      p_company_id: null,
      p_title: "Freight Estimate Needed",
      p_body:
        "A supplier quote is missing HS codes or weights — the buyer sees 'freight estimate pending' until ops completes the prepared freight quote task.",
      p_type: "system",
      p_icon: "alert-circle",
      p_action_url: opsQuoteId ? `/admin/logistics/quotes/${opsQuoteId}` : "/admin/logistics/quotes",
      p_reference_type: "quotation",
      p_reference_id: quotationId,
    });
  }
}
