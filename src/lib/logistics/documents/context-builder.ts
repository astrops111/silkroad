// Builds a ShipmentDocContext from the database for a given shipment id.
// Called by /api/shipments/[id]/documents to drive generate.ts.
//
// Join path: b2b_shipments → supplier_orders → (purchase_orders for buyer,
// companies for both parties, supplier_order_items for cargo lines, ports).
// Partitioned tables are queried separately to avoid FK join issues.

import { createServiceClient } from "@/lib/supabase/server";
import type { ShipmentDocContext } from "./generate";
import type { CargoItem, CostBreakdown } from "@/lib/logistics/landed-cost";

export async function buildShipmentDocContext(
  shipmentId: string,
): Promise<ShipmentDocContext | null> {
  const supabase = createServiceClient();

  // ── 1. Shipment row ─────────────────────────────────────────
  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select(`
      id, shipment_number, shipping_method, trade_term, currency,
      cost_breakdown, total_weight_kg, total_volume_cbm, package_count,
      is_fragile, requires_cold_chain, is_hazardous, hs_codes,
      supplier_order_id, pol_port_id, pod_port_id,
      pickup_country, delivery_country
    `)
    .eq("id", shipmentId)
    .maybeSingle();

  if (!shipment) return null;

  // ── 2. Supplier order → items, buyer order, parties ─────────
  const { data: supplierOrder } = await supabase
    .from("supplier_orders")
    .select("id, purchase_order_id, supplier_id, total_amount, currency, ship_to_address, ship_to_country")
    .eq("id", shipment.supplier_order_id)
    .maybeSingle();

  if (!supplierOrder) return null;

  // Run remaining lookups in parallel.
  const [itemsRes, poRes, polRes, podRes] = await Promise.all([
    supabase
      .from("supplier_order_items")
      .select("product_name, variant_name, unit_price, quantity")
      .eq("supplier_order_id", supplierOrder.id),
    supabase
      .from("purchase_orders")
      .select("buyer_company_id, order_number")
      .eq("id", supplierOrder.purchase_order_id)
      .maybeSingle(),
    shipment.pol_port_id
      ? supabase.from("ports").select("code, name, country").eq("id", shipment.pol_port_id).maybeSingle()
      : Promise.resolve({ data: null }),
    shipment.pod_port_id
      ? supabase.from("ports").select("code, name, country").eq("id", shipment.pod_port_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const purchaseOrder = poRes.data;
  const polPort = polRes.data;
  const podPort = podRes.data;
  const lineItems = itemsRes.data ?? [];

  // ── 3. Fetch both companies in parallel ─────────────────────
  const [buyerRes, supplierRes] = await Promise.all([
    purchaseOrder?.buyer_company_id
      ? supabase.from("companies").select("name, tax_id, country_code, city, address").eq("id", purchaseOrder.buyer_company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("companies").select("name, tax_id, country_code, city, address").eq("id", supplierOrder.supplier_id).maybeSingle(),
  ]);

  const buyer = buyerRes.data;
  const supplier = supplierRes.data;

  // ── 4. Build CargoItem[] from line items ─────────────────────
  const hsCodes: string[] = (shipment.hs_codes as string[] | null) ?? [];
  const totalQty = lineItems.reduce((s: number, i) => s + Number(i.quantity), 0) || 1;
  const weightPerUnit = shipment.total_weight_kg != null
    ? Number(shipment.total_weight_kg) / totalQty
    : 0;

  const cargoItems: CargoItem[] = lineItems.map((it, idx) => ({
    description: [it.product_name, it.variant_name].filter(Boolean).join(" — "),
    hsCode: hsCodes[idx] ?? hsCodes[0] ?? "",
    quantity: Number(it.quantity),
    unitCostMinor: Number(it.unit_price),
    weightKgPerUnit: weightPerUnit,
    volumeCbmPerUnit: undefined,
    isFragile: Boolean(shipment.is_fragile),
    requiresColdChain: Boolean(shipment.requires_cold_chain),
    isHazardous: Boolean(shipment.is_hazardous),
  }));

  // ── 5. CostBreakdown from stored JSONB ───────────────────────
  const breakdown = shipment.cost_breakdown
    ? (shipment.cost_breakdown as unknown as CostBreakdown)
    : null;

  // ── 6. Assemble context ──────────────────────────────────────
  const originCountry = polPort?.country ?? shipment.pickup_country ?? supplier?.country_code ?? undefined;
  const destCountry = podPort?.country ?? shipment.delivery_country ?? supplierOrder.ship_to_country ?? buyer?.country_code ?? undefined;

  return {
    shipmentNumber: shipment.shipment_number ?? shipment.id.slice(0, 8).toUpperCase(),
    issuedAt: new Date(),
    seller: {
      name: supplier?.name ?? "Supplier",
      address: [supplier?.address, supplier?.city].filter(Boolean).join(", ") || undefined,
      taxId: supplier?.tax_id ?? undefined,
    },
    buyer: {
      name: buyer?.name ?? purchaseOrder?.order_number ?? "Buyer",
      country: buyer?.country_code ?? destCountry,
      address: [buyer?.address, buyer?.city].filter(Boolean).join(", ") || supplierOrder.ship_to_address || undefined,
    },
    routing: {
      originCountry,
      originPort: polPort ? `${polPort.name} (${polPort.code})` : undefined,
      destinationCountry: destCountry,
      destinationPort: podPort ? `${podPort.name} (${podPort.code})` : undefined,
      shippingMethod: String(shipment.shipping_method),
      containerType: undefined,
      tradeTerm: shipment.trade_term ?? undefined,
    },
    cargo: {
      items: cargoItems,
      totalWeightKg: shipment.total_weight_kg != null ? Number(shipment.total_weight_kg) : null,
      totalVolumeCbm: shipment.total_volume_cbm != null ? Number(shipment.total_volume_cbm) : null,
      packageCount: shipment.package_count ?? null,
      isFragile: Boolean(shipment.is_fragile),
      requiresColdChain: Boolean(shipment.requires_cold_chain),
      isHazardous: Boolean(shipment.is_hazardous),
      hsCodes,
    },
    money: {
      currency: String(shipment.currency ?? supplierOrder.currency ?? "USD"),
      goodsValueMinor: Number(supplierOrder.total_amount ?? 0),
      totalQuotedMinor: null,
      breakdown,
    },
  };
}
