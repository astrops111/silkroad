import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getShipmentById } from "@/lib/queries/shipments";
import { getOpsFreightQuote } from "@/lib/queries/ops-freight-quotes";
import { resolveRequiredDocuments } from "@/lib/queries/document-requirements";
import {
  generateCommercialInvoice,
  generatePackingList,
  type ShipmentDocContext,
} from "@/lib/logistics/documents/generate";
import type { CargoItem, CostBreakdown } from "@/lib/logistics/landed-cost";

export const dynamic = "force-dynamic";

export default async function ShipmentDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const opsQuote = shipment.ops_freight_quote_id
    ? await getOpsFreightQuote(shipment.ops_freight_quote_id)
    : null;

  // Ops-originated shipments inherit container type from the source quote.
  const containerType = opsQuote?.container_type ?? undefined;
  const required = shipment.delivery_country
    ? await resolveRequiredDocuments({
        destinationCountry: shipment.delivery_country,
        hsCodes: shipment.hs_codes ?? undefined,
        shippingMethod: shipment.shipping_method,
        containerType,
      })
    : [];

  const ctx = buildContext(shipment, opsQuote);
  const invoice = generateCommercialInvoice(ctx);
  const packingList = generatePackingList(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Documents — {shipment.shipment_number}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Generated from shipment data and required-documents rules for {shipment.delivery_country ?? "—"}.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/logistics/shipments/${shipment.id}`}><ArrowLeft className="mr-1 size-4" /> Back to shipment</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" /> Required documents
          </CardTitle>
          <CardDescription>
            Derived from document_requirements rules matching destination, HS codes, method, and container type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {required.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No document rules configured for {shipment.delivery_country ?? "this destination"}.
              <Link href="/admin/logistics/reference" className="ml-1 underline">
                Add some in the reference admin
              </Link>.
            </div>
          ) : (
            <ul className="divide-y text-sm">
              {required.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.documentType.replace(/_/g, " ")}</span>
                      {r.isRequired
                        ? <Badge variant="secondary">required</Badge>
                        : <Badge variant="outline">recommended</Badge>}
                      <Badge variant="outline" className="text-[10px]">{r.scope}</Badge>
                    </div>
                    {r.notes && <div className="mt-0.5 text-xs text-muted-foreground">{r.notes}</div>}
                  </div>
                  {r.externalUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={r.externalUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DocPreviewCard title={invoice.title} html={invoice.html} icon={FileText} />
        <DocPreviewCard title={packingList.title} html={packingList.html} icon={Package} />
      </div>
    </div>
  );
}

function DocPreviewCard({
  title,
  html,
  icon: Icon,
}: {
  title: string;
  html: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  // Inline preview via srcdoc; opens in a new window via data: URL for print.
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4" /> {title}
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href={dataUrl} target="_blank" rel="noreferrer">
              <Printer className="mr-1 size-4" /> Open & print
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <iframe
          title={title}
          srcDoc={html}
          className="h-[600px] w-full rounded-md border"
        />
      </CardContent>
    </Card>
  );
}

// Build the doc context. Line items are best-effort reconstructed from the
// ops quote's metadata; fall back to a summary line when absent.
function buildContext(
  shipment: NonNullable<Awaited<ReturnType<typeof getShipmentById>>>,
  opsQuote: Awaited<ReturnType<typeof getOpsFreightQuote>>,
): ShipmentDocContext {
  const meta = (opsQuote?.metadata ?? {}) as { lineItems?: CargoItem[] };
  const items: CargoItem[] = meta.lineItems && meta.lineItems.length > 0
    ? meta.lineItems
    : [
        {
          description: opsQuote?.cargo_description ?? shipment.package_description ?? "Consolidated cargo",
          hsCode: (shipment.hs_codes ?? [])[0] ?? "",
          quantity: shipment.package_count ?? 1,
          unitCostMinor: opsQuote?.goods_value ?? 0,
          weightKgPerUnit: shipment.total_weight_kg ?? 0,
          volumeCbmPerUnit: shipment.total_volume_cbm ?? 0,
          isFragile: shipment.is_fragile ?? false,
          requiresColdChain: shipment.requires_cold_chain ?? false,
          isHazardous: shipment.is_hazardous ?? false,
        },
      ];

  const breakdown = shipment.cost_breakdown
    ? (shipment.cost_breakdown as unknown as CostBreakdown)
    : null;

  return {
    shipmentNumber: shipment.shipment_number,
    issuedAt: new Date(),
    seller: {
      name: "Silk Road Africa",
    },
    buyer: {
      name: opsQuote?.requester_name ?? "Consignee",
      company: opsQuote?.requester_company ?? undefined,
      country: shipment.delivery_country ?? undefined,
      address: shipment.delivery_address ?? undefined,
      email: opsQuote?.requester_email ?? undefined,
      phone: opsQuote?.requester_phone ?? shipment.delivery_contact_phone ?? undefined,
    },
    routing: {
      originCountry: shipment.pickup_country ?? undefined,
      originPort: opsQuote?.origin_country ?? undefined,
      destinationCountry: shipment.delivery_country ?? undefined,
      destinationPort: undefined,
      shippingMethod: shipment.shipping_method.replace(/_/g, " "),
      containerType: opsQuote?.container_type ?? undefined,
      tradeTerm: shipment.trade_term ?? undefined,
    },
    cargo: {
      items,
      totalWeightKg: shipment.total_weight_kg,
      totalVolumeCbm: shipment.total_volume_cbm,
      packageCount: shipment.package_count,
      isFragile: shipment.is_fragile ?? false,
      requiresColdChain: shipment.requires_cold_chain ?? false,
      isHazardous: shipment.is_hazardous ?? false,
      hsCodes: shipment.hs_codes ?? [],
      description: shipment.package_description ?? undefined,
    },
    money: {
      currency: shipment.currency ?? "USD",
      goodsValueMinor: opsQuote?.goods_value ?? 0,
      totalQuotedMinor: shipment.shipping_cost ?? null,
      breakdown,
    },
  };
}
