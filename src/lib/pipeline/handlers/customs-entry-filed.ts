import type { EventHandler } from "../types";
import { submitCustomsDeclarationToAuthority } from "@/lib/customs";

/**
 * customs.entry_filed
 * Fires when customs_status transitions to 'submitted' (DB trigger).
 * The DB status is already 'submitted'. Handler attempts e-declaration
 * submission if not done yet. Failure is non-fatal — ops can resubmit manually.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select(`
      id, supplier_order_id, customs_api_submitted_at,
      delivery_country, hs_codes, total_weight_kg, package_count,
      bill_of_lading, container_number, shipping_method,
      customs_broker_ref, customs_declaration_no
    `)
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  const now = new Date().toISOString();

  // Stamp customs_filed_at — used by the monitor for demurrage timing (idempotent)
  await supabase
    .from("b2b_shipments")
    .update({ customs_filed_at: now })
    .eq("id", shipment_id)
    .is("customs_filed_at", null);

  // Already submitted via API — idempotent
  if (shipment.customs_api_submitted_at) {
    return { success: true, result: { alreadySubmitted: true } };
  }

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_entry_filed",
    description: `Customs entry filed${shipment.customs_broker_ref ? ` — broker ref: ${shipment.customs_broker_ref}` : ""}`,
  });

  // Fetch buyer's tax details for e-declaration
  const { data: so } = await supabase
    .from("supplier_orders")
    .select("purchase_order_id, total_amount, currency")
    .eq("id", shipment.supplier_order_id)
    .maybeSingle();

  if (!so) return { success: true, result: { eDeclaration: "skipped", reason: "supplier_order_not_found" } };

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_company_id")
    .eq("id", so.purchase_order_id)
    .maybeSingle();

  if (!po?.buyer_company_id) return { success: true, result: { eDeclaration: "skipped", reason: "no_buyer_company" } };

  const { data: buyer } = await supabase
    .from("companies")
    .select("name, tax_id, country_code, city, address")
    .eq("id", po.buyer_company_id)
    .maybeSingle();

  if (!buyer?.tax_id) {
    console.warn(`[pipeline:customs.entry_filed] No buyer tax_id for shipment ${shipment_id} — ops must submit manually`);
    return { success: true, result: { eDeclaration: "skipped", reason: "missing_tax_id" } };
  }

  const destinationCountry = buyer.country_code ?? shipment.delivery_country ?? "";

  let eDecResult: { success: boolean; provider?: string; declarationRef?: string; error?: string };
  try {
    eDecResult = await submitCustomsDeclarationToAuthority({
      destinationCountry,
      importerTaxId:    buyer.tax_id,
      importerName:     buyer.name,
      importerAddress:  buyer.address ?? "",
      importerCity:     buyer.city    ?? undefined,
      billOfLading:     shipment.bill_of_lading     ?? undefined,
      containerNumbers: shipment.container_number ? [shipment.container_number] : undefined,
      portOfEntry:      (payload as Record<string, string>).portOfEntry ?? "",
      portOfOrigin:     "CNSHA",
      shippingMethod:   String(shipment.shipping_method),
      hsCodes:          (shipment.hs_codes as string[] | null) ?? [],
      goodsDescription: "General merchandise — see commercial invoice",
      grossWeightKg:    Number(shipment.total_weight_kg ?? 0),
      packageCount:     Number(shipment.package_count  ?? 1),
      cifValueUsd:      Number(so.total_amount ?? 0) / 100,
      currency:         so.currency ?? "USD",
      supplierOrderId:  shipment.supplier_order_id,
      shipmentId:       shipment_id,
    });
  } catch (err) {
    // Non-fatal — ops can resubmit via admin UI
    console.error("[pipeline:customs.entry_filed] e-declaration call threw:", err);
    return { success: true, result: { eDeclaration: "failed", reason: String(err) } };
  }

  if (eDecResult.success) {
    const now = new Date().toISOString();
    await supabase.from("b2b_shipments").update({
      customs_api_submitted_at: apiSubmittedAt,
      customs_api_provider:     eDecResult.provider       ?? null,
      customs_api_ref:          eDecResult.declarationRef ?? null,
      customs_declaration_no:   eDecResult.declarationRef ?? shipment.customs_declaration_no,
      updated_at:               apiSubmittedAt,
    }).eq("id", shipment_id);

    await supabase.from("shipment_tracking_events").insert({
      shipment_id,
      event_type:  "customs_edeclaration_submitted",
      description: `E-declaration submitted via ${eDecResult.provider}: ${eDecResult.declarationRef}`,
    });
  } else {
    console.warn(`[pipeline:customs.entry_filed] e-declaration failed for ${shipment_id}: ${eDecResult.error} — ops must resubmit manually`);
  }

  return {
    success: true,
    result: {
      eDeclaration:   eDecResult.success ? "submitted" : "failed",
      provider:       eDecResult.provider,
      declarationRef: eDecResult.declarationRef,
    },
  };
};
