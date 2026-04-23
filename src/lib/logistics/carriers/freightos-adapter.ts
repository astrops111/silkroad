import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CarrierAdapter,
  CarrierRateQuote,
  CarrierRateQuoteRequest,
  CarrierRateQuoteResponse,
  TrackingEventIngestion,
} from "./types";

/**
 * Freightos adapter — drafted against the Freightos / WebCargo public API
 * shape. Live fetch call is wired up; real credentials (FREIGHTOS_API_KEY,
 * FREIGHTOS_WEBHOOK_SECRET) are required to actually hit the endpoint.
 *
 * Docs: https://apis.freightos.com/ (rate lookup + webhook reference).
 * The response mapping below is best-effort — swap field names if Freightos
 * updates the schema. Raw upstream payload is preserved in `rawMetadata`.
 */
export class FreightosAdapter implements CarrierAdapter {
  readonly id = "freightos";
  readonly capabilities = { seaFcl: true, seaLcl: true, airFreight: true, airExpress: false };

  private readonly baseUrl = process.env.FREIGHTOS_API_BASE ?? "https://sandbox.freightos.com";
  private readonly apiKey = process.env.FREIGHTOS_API_KEY;
  private readonly webhookSecret = process.env.FREIGHTOS_WEBHOOK_SECRET;

  get displayName(): string {
    return this.enabled ? "Freightos" : "Freightos (not configured)";
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  // ============================================================
  // Rate fetch — POST /api/v1/pricing/rates (shape drafted from public docs)
  // ============================================================
  async fetchRates(req: CarrierRateQuoteRequest): Promise<CarrierRateQuoteResponse> {
    if (!this.enabled) {
      return {
        adapterId: this.id,
        quotes: [],
        fetchedAt: new Date().toISOString(),
        warnings: ["FREIGHTOS_API_KEY not set — Freightos adapter is disabled."],
      };
    }

    const body = {
      load: {
        mode: isAir(req.containerType) ? "AIR" : "OCEAN",
        containerType: mapContainerType(req.containerType),
        quantity: req.containerCount ?? 1,
      },
      origin: req.originPortCode
        ? { unlocode: req.originPortCode }
        : { country: req.originCountry },
      destination: req.destinationPortCode
        ? { unlocode: req.destinationPortCode }
        : { country: req.destinationCountry },
      requestedBy: "platform",
    };

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/pricing/rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-apikey": this.apiKey!,
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          adapterId: this.id,
          quotes: [],
          fetchedAt: new Date().toISOString(),
          warnings: [`Freightos API ${res.status}: ${errText.slice(0, 300)}`],
        };
      }

      const json = (await res.json()) as FreightosRateResponse;
      const quotes = (json.quotes ?? []).map((q) => mapQuote(q, this.id));
      return {
        adapterId: this.id,
        quotes,
        fetchedAt: new Date().toISOString(),
        warnings: quotes.length === 0 ? ["No Freightos quotes for this route/container."] : [],
      };
    } catch (e) {
      return {
        adapterId: this.id,
        quotes: [],
        fetchedAt: new Date().toISOString(),
        warnings: [`Freightos fetch failed: ${(e as Error).message}`],
      };
    }
  }

  // ============================================================
  // Webhook signature verification (HMAC-SHA256 in x-freightos-signature).
  // Drafted against a common pattern — update if Freightos uses a
  // different header name or scheme (e.g. JWT).
  // ============================================================
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) {
      console.warn("FreightosAdapter.verifyWebhookSignature: FREIGHTOS_WEBHOOK_SECRET not set");
      return false;
    }
    const given = headers["x-freightos-signature"] ?? headers["x-signature"];
    if (!given) return false;

    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(given, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // ============================================================
  // Webhook event mapping. Freightos emits shipment events with a
  // stable schema; map their status codes onto our shipment_status enum.
  // ============================================================
  parseWebhookPayload(payload: unknown, _headers: Record<string, string>): TrackingEventIngestion | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;

    // Freightos wraps events under { event: "shipment.status.updated", data: { ... } }
    const eventType = typeof p.event === "string" ? p.event : undefined;
    const data = (p.data && typeof p.data === "object" ? p.data : p) as Record<string, unknown>;

    const trackingNumber =
      (typeof data.tracking_number === "string" && data.tracking_number) ||
      (typeof data.shipmentRef === "string" && data.shipmentRef) ||
      undefined;
    if (!trackingNumber) return null;

    const status = typeof data.status === "string" ? data.status : undefined;

    return {
      lookup: { by: "tracking_number", value: trackingNumber },
      eventType: eventType ?? "status_update",
      description: typeof data.description === "string" ? data.description : undefined,
      location: mapLocation(data.location),
      newStatus: mapStatus(status),
      occurredAt: typeof data.timestamp === "string" ? data.timestamp : undefined,
      externalEventId: typeof data.event_id === "string" ? data.event_id : undefined,
      rawPayload: payload,
    };
  }
}

// ============================================================
// Freightos-specific mappers
// ============================================================

interface FreightosRateResponse {
  quotes?: FreightosQuote[];
}

interface FreightosQuote {
  id?: string;
  carrier?: string;
  totalPrice?: { value: number; currency: string };
  pricePerContainer?: { value: number; currency: string };
  pricePerCbm?: { value: number; currency: string };
  pricePerKg?: { value: number; currency: string };
  minCharge?: { value: number; currency: string };
  fuelSurchargePct?: number;
  transitTimeMin?: number;
  transitTimeMax?: number;
  validUntil?: string;
  [key: string]: unknown;
}

function mapQuote(q: FreightosQuote, adapterId: string): CarrierRateQuote {
  const currency = q.totalPrice?.currency ?? q.pricePerContainer?.currency ?? "USD";
  const toMinor = (v: number | undefined) => Math.round((v ?? 0) * 100);
  const baseMinor = q.totalPrice?.value ? toMinor(q.totalPrice.value) : 0;

  return {
    adapterId,
    providerName: q.carrier ?? "Freightos",
    externalRef: q.id,
    baseMinor,
    perContainerMinor: toMinor(q.pricePerContainer?.value),
    perCbmMinor: toMinor(q.pricePerCbm?.value),
    perKgMinor: toMinor(q.pricePerKg?.value),
    minChargeMinor: toMinor(q.minCharge?.value),
    fuelSurchargePct: q.fuelSurchargePct ?? 0,
    currency,
    transitDaysMin: q.transitTimeMin,
    transitDaysMax: q.transitTimeMax,
    validUntil: q.validUntil,
    rawMetadata: q as Record<string, unknown>,
    summary: `${q.carrier ?? "Freightos"} · ${q.transitTimeMin ?? "?"}–${q.transitTimeMax ?? "?"} days · ${q.totalPrice?.value ?? "?"} ${currency}`,
  };
}

function mapLocation(raw: unknown): TrackingEventIngestion["location"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const l = raw as Record<string, unknown>;
  return {
    label: typeof l.name === "string" ? l.name : undefined,
    port: typeof l.port === "string" ? l.port : undefined,
    city: typeof l.city === "string" ? l.city : undefined,
    country: typeof l.country === "string" ? l.country : undefined,
    lat: typeof l.lat === "number" ? l.lat : undefined,
    lng: typeof l.lng === "number" ? l.lng : undefined,
  };
}

// Freightos -> our shipment_status enum. Unknown upstream values return undefined
// so the ingestion keeps the current status and just records the event.
function mapStatus(s: string | undefined): TrackingEventIngestion["newStatus"] {
  if (!s) return undefined;
  const map: Record<string, TrackingEventIngestion["newStatus"]> = {
    booked: "assigned",
    picked_up: "picking",
    in_transit: "in_transit",
    at_origin_port: "dispatched",
    at_destination_port: "at_hub",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    returned: "returned",
    exception: "damaged",
  };
  return map[s.toLowerCase()];
}

function isAir(c: string): boolean {
  return c === "air_express" || c === "air_freight";
}

function mapContainerType(c: string): string {
  switch (c) {
    case "fcl_20": return "20GP";
    case "fcl_40": return "40GP";
    case "fcl_40hc": return "40HC";
    case "fcl_45": return "45HC";
    case "lcl": return "LCL";
    case "air_express": return "AIR_EXPRESS";
    case "air_freight": return "AIR";
    default: return c;
  }
}
