import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Package, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LandedCostBreakdown } from "@/components/admin/LandedCostBreakdown";
import { getShipmentById } from "@/lib/queries/shipments";
import { getOpsFreightQuote } from "@/lib/queries/ops-freight-quotes";
import { listShipmentTrackingEvents, type ShipmentStatus } from "@/lib/actions/tracking";
import { listShipmentCostActuals } from "@/lib/queries/cost-actuals";
import { ShipmentTrackingPanel } from "@/components/admin/logistics/ShipmentTrackingPanel";
import { CostActualsPanel } from "@/components/admin/logistics/CostActualsPanel";
import { OceanTrackingPanel } from "@/components/admin/logistics/OceanTrackingPanel";
import { PodCapturePanel } from "@/components/admin/logistics/PodCapturePanel";
import { CustomsPanel } from "@/components/admin/logistics/CustomsPanel";
import { listShipmentCustomsHolds, type CustomsStatus } from "@/lib/queries/customs";
import type { CostBreakdown } from "@/lib/logistics/landed-cost";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const [opsQuote, events, costActuals, customsHolds] = await Promise.all([
    shipment.ops_freight_quote_id ? getOpsFreightQuote(shipment.ops_freight_quote_id) : Promise.resolve(null),
    listShipmentTrackingEvents(shipment.id),
    listShipmentCostActuals(shipment.id),
    listShipmentCustomsHolds(shipment.id),
  ]);

  const breakdown = shipment.cost_breakdown as unknown as CostBreakdown | null;
  const shipmentCurrency = shipment.quoted_currency ?? shipment.currency ?? "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Shipment {shipment.shipment_number}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Status <Badge variant="secondary" className="ml-1">{shipment.status}</Badge>
            {opsQuote && (
              <>
                {" "}· Originated from ops quote{" "}
                <Link href={`/admin/logistics/quotes/${opsQuote.id}`} className="font-mono text-xs hover:underline">
                  {opsQuote.quote_number}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/logistics/shipments/${shipment.id}/documents`}>
              <FileText className="mr-1 size-4" /> Documents
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/logistics"><ArrowLeft className="mr-1 size-4" /> Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ship className="size-4" /> Routing & method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV k="Shipping method" v={shipment.shipping_method.replace(/_/g, " ")} />
            <KV k="Trade term" v={shipment.trade_term ? shipment.trade_term.toUpperCase() : "—"} />
            <KV k="Pickup country" v={shipment.pickup_country ?? "—"} />
            <KV k="Delivery country" v={shipment.delivery_country ?? "—"} />
            <KV k="Delivery contact" v={shipment.delivery_contact_name ?? "—"} />
            <KV k="Delivery phone" v={shipment.delivery_contact_phone ?? "—"} />
            <KV k="HS codes" v={(shipment.hs_codes ?? []).join(", ") || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" /> Cargo & tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV k="Packages" v={shipment.package_count?.toString() ?? "—"} />
            <KV k="Weight" v={shipment.total_weight_kg != null ? `${shipment.total_weight_kg} kg` : "—"} />
            <KV k="Volume" v={shipment.total_volume_cbm != null ? `${shipment.total_volume_cbm} CBM` : "—"} />
            <KV k="Fragile" v={shipment.is_fragile ? "yes" : "no"} />
            <KV k="Cold chain" v={shipment.requires_cold_chain ? "yes" : "no"} />
            <KV k="Hazardous" v={shipment.is_hazardous ? "yes" : "no"} />
            <Separator className="my-2" />
            <KV k="Tracking #" v={shipment.tracking_number ?? "—"} />
            <KV k="Tracking URL" v={shipment.tracking_url ?? "—"} />
            <KV k="Customs status" v={shipment.customs_status ?? "—"} />
            <KV k="ETA" v={shipment.estimated_delivery_at ? new Date(shipment.estimated_delivery_at).toLocaleString() : "—"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ocean tracking</CardTitle>
          <CardDescription>
            Container, BoL, and vessel details. Activating tracking ties this shipment into the
            carrier-event poll loop ({"/api/cron/carrier-tracking-poll"}, every 30 min).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OceanTrackingPanel
            shipmentId={shipment.id}
            initial={{
              containerNumber: shipment.container_number,
              sealNumber: shipment.seal_number,
              billOfLading: shipment.bill_of_lading,
              bookingNumber: shipment.booking_number,
              carrierScac: shipment.carrier_scac,
              vesselName: shipment.vessel_name,
              voyageNo: shipment.voyage_no,
              trackingProvider: shipment.tracking_provider,
              trackingExternalRef: shipment.tracking_external_ref,
              lastPolledAt: shipment.last_polled_at,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracking timeline</CardTitle>
          <CardDescription>
            Status transitions, manually-captured events, and auto-ingested carrier milestones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentTrackingPanel
            shipmentId={shipment.id}
            currentStatus={shipment.status as ShipmentStatus}
            events={events}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customs</CardTitle>
          <CardDescription>
            Declaration filing, broker tracking, and hold management. Marking cleared also records
            duty / VAT / fees as cost actuals so the variance card updates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomsPanel
            shipmentId={shipment.id}
            shipment={{
              customs_status: (shipment.customs_status ?? "pending") as CustomsStatus,
              customs_declaration_no: shipment.customs_declaration_no,
              customs_broker_name: shipment.customs_broker_name,
              customs_broker_ref: shipment.customs_broker_ref,
              customs_filed_at: shipment.customs_filed_at,
              customs_cleared_at: shipment.customs_cleared_at,
              customs_duty_paid_minor: shipment.customs_duty_paid_minor,
              customs_vat_paid_minor: shipment.customs_vat_paid_minor,
              customs_other_paid_minor: shipment.customs_other_paid_minor,
              customs_paid_currency: shipment.customs_paid_currency,
              customs_notes: shipment.customs_notes,
              delivery_country: shipment.delivery_country,
            }}
            holds={customsHolds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof of delivery</CardTitle>
          <CardDescription>
            Capture signature + recipient photo at the point of delivery. Saving with
            &ldquo;mark delivered&rdquo; advances the shipment status and stamps the timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PodCapturePanel
            shipmentId={shipment.id}
            shipmentStatus={shipment.status ?? "pending"}
            existing={{
              signatureUrl: shipment.pod_signature_url,
              photoUrl: shipment.pod_photo_url,
              recipientName: shipment.pod_recipient_name,
              notes: shipment.pod_notes,
              deliveredAt: shipment.delivered_at,
            }}
          />
        </CardContent>
      </Card>

      {breakdown ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Inherited cost components (from quote)
          </h2>
          <LandedCostBreakdown breakdown={breakdown} />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>No cost breakdown attached to this shipment.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Actual costs vs quote
        </h2>
        <CostActualsPanel
          shipmentId={shipment.id}
          shipmentCurrency={shipmentCurrency}
          quotedTotalMinor={shipment.quoted_total_minor ?? shipment.shipping_cost ?? null}
          actualTotalMinor={shipment.actual_total_minor}
          costVarianceMinor={shipment.cost_variance_minor}
          initialActuals={costActuals}
        />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-mono text-xs">{v}</span>
    </div>
  );
}
