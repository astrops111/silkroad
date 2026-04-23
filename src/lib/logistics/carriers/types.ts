import type { ContainerType, ShippingMethod } from "@/lib/logistics/landed-cost";

// Request shape passed to every adapter. Supplying BOTH port code and country
// is fine — adapters prefer the port if they support it and fall back to country.
export interface CarrierRateQuoteRequest {
  originPortCode?: string;
  originCountry: string;
  destinationPortCode?: string;
  destinationCountry: string;
  shippingMethod: ShippingMethod;
  containerType: ContainerType;
  // For FCL, lets the adapter return per-container pricing. For LCL/air, ignored.
  containerCount?: number;
  // Target fetch time for rate freshness; defaults to now in implementations.
  asOf?: Date;
}

// One rate option returned by an adapter. Multiple per response is fine —
// e.g. Freightos-style aggregators return several carrier offerings per route.
export interface CarrierRateQuote {
  adapterId: string;           // which adapter returned this (mock / freightos / ...)
  providerName: string;        // the actual carrier or forwarder (Maersk, COSCO, MSC, ONE, ...)
  externalRef?: string;        // the upstream quote id — persist as freight_lanes.external_ref
  baseMinor: number;
  perContainerMinor: number;
  perCbmMinor: number;
  perKgMinor: number;
  minChargeMinor: number;
  fuelSurchargePct: number;
  currency: string;
  transitDaysMin?: number;
  transitDaysMax?: number;
  validUntil?: string;         // ISO date
  // Free-form provider-specific extras (sailing schedule, cutoff, vessel, etc.)
  rawMetadata?: Record<string, unknown>;
  // Human-readable summary for the UI.
  summary: string;
}

export interface CarrierRateQuoteResponse {
  adapterId: string;
  quotes: CarrierRateQuote[];
  fetchedAt: string;           // ISO timestamp
  warnings: string[];
}

export interface CarrierAdapter {
  readonly id: string;                  // stable identifier, used as source provenance
  readonly displayName: string;         // UI label
  readonly enabled: boolean;            // false when not configured (missing API key)
  readonly capabilities: {
    seaFcl: boolean;
    seaLcl: boolean;
    airFreight: boolean;
    airExpress: boolean;
  };
  fetchRates(req: CarrierRateQuoteRequest): Promise<CarrierRateQuoteResponse>;

  // Optional webhook support. Adapters that accept inbound tracking events
  // implement these two methods; adapters that don't can omit them.
  //
  // verifyWebhookSignature: synchronous signature check against the raw body.
  // parseWebhookPayload: map the carrier-specific payload to a normalized
  //   TrackingEventIngestion for persistence.
  verifyWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;
  parseWebhookPayload?(
    payload: unknown,
    headers: Record<string, string>,
  ): TrackingEventIngestion | TrackingEventIngestion[] | null;

  // Optional poll-based tracking. Adapters that support container/BL
  // lookups (Searates, ShipsGo, terminal49) implement this so the
  // /api/cron/carrier-tracking-poll loop can ingest events for shipments
  // whose tracking_provider matches this adapter's id.
  pollTrackingEvents?(refs: TrackingPollRef[]): Promise<TrackingEventIngestion[]>;
}

export interface TrackingPollRef {
  shipmentId: string;
  externalRef: string;             // container number / BL / booking number
  carrierScac?: string;
  // Last event timestamp the runner already has, so adapters that
  // support filtering by since-time can avoid re-sending old events.
  sinceIso?: string;
}

// Normalized shape of an inbound tracking event, post-parsing.
// Used by the webhook ingestion endpoint to call addTrackingEvent.
export interface TrackingEventIngestion {
  // How the adapter identifies which shipment this event is for. The webhook
  // handler tries these in order: external tracking_number on the shipment,
  // then the adapter's own external_ref fallback, then shipment_id if the
  // adapter already resolved it.
  lookup:
    | { by: "tracking_number"; value: string }
    | { by: "shipment_id"; value: string }
    | { by: "external_ref"; adapterId: string; value: string };

  eventType: string;               // "arrived_at_port" | "customs_hold" | ...
  description?: string;
  location?: {
    label?: string;
    port?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  newStatus?:
    | "pending" | "assigned" | "driver_accepted" | "picking" | "packed"
    | "dispatched" | "in_transit" | "at_hub" | "out_for_delivery"
    | "delivery_attempted" | "delivered" | "returned" | "lost" | "damaged";
  occurredAt?: string;             // ISO timestamp from the carrier event
  // For dedupe: unique within (adapterId, externalEventId).
  externalEventId?: string;
  rawPayload?: unknown;            // kept for debugging, not persisted by default
}

// Aggregated response from a multi-adapter fetch.
export interface AggregatedRateResponse {
  requestedAt: string;
  responses: CarrierRateQuoteResponse[];
  totalQuotes: number;
  errors: { adapterId: string; error: string }[];
}
