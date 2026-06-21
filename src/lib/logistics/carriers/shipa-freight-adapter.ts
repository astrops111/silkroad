import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CarrierAdapter,
  CarrierRateQuote,
  CarrierRateQuoteRequest,
  CarrierRateQuoteResponse,
  TrackingEventIngestion,
  TrackingPollRef,
} from "./types";

/**
 * Shipa Freight adapter — Agility-backed digital freight forwarder with
 * strong SSA lane coverage (Lagos, Mombasa, Dar es Salaam, Durban + hinterland).
 * Supports ocean FCL/LCL and air freight on Asia→Africa routes.
 *
 * API shape is modeled against Shipa Freight REST conventions.
 * Verify field names against https://shipafreight.com/api-docs once
 * API credentials are obtained from their developer portal.
 *
 * Required env vars:
 *   SHIPA_FREIGHT_API_KEY        — API key from Shipa Freight developer portal
 *   SHIPA_FREIGHT_API_BASE       — Base URL override (default: prod endpoint)
 *   SHIPA_FREIGHT_WEBHOOK_SECRET — Shared secret for webhook signature check
 */
export class ShipaFreightAdapter implements CarrierAdapter {
  readonly id = "shipa-freight";
  readonly capabilities = { seaFcl: true, seaLcl: true, airFreight: true, airExpress: false };

  private readonly baseUrl =
    process.env.SHIPA_FREIGHT_API_BASE ?? "https://api.shipafreight.com/v1";
  private readonly apiKey = process.env.SHIPA_FREIGHT_API_KEY;
  private readonly webhookSecret = process.env.SHIPA_FREIGHT_WEBHOOK_SECRET;

  get displayName(): string {
    return this.enabled ? "Shipa Freight" : "Shipa Freight (not configured)";
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  // ============================================================
  // Rate fetch — POST /quotes/instant
  // Returns per-unit rates (perCbm for LCL, perContainer for FCL)
  // so the landed-cost engine can apply cargo dimensions itself.
  // ============================================================
  async fetchRates(req: CarrierRateQuoteRequest): Promise<CarrierRateQuoteResponse> {
    if (!this.enabled) {
      return {
        adapterId: this.id,
        quotes: [],
        fetchedAt: new Date().toISOString(),
        warnings: ["SHIPA_FREIGHT_API_KEY not set — Shipa Freight adapter is disabled."],
      };
    }

    const isAir = req.containerType === "air_express" || req.containerType === "air_freight";

    const body: ShipaQuoteRequest = {
      origin: req.originPortCode
        ? { port: req.originPortCode, country: req.originCountry }
        : { country: req.originCountry },
      destination: req.destinationPortCode
        ? { port: req.destinationPortCode, country: req.destinationCountry }
        : { country: req.destinationCountry },
      shipmentType: isAir ? "air" : "ocean",
      cargo: {
        type: mapContainerType(req.containerType),
        quantity: req.containerCount ?? 1,
      },
    };

    try {
      const res = await fetch(`${this.baseUrl}/quotes/instant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          adapterId: this.id,
          quotes: [],
          fetchedAt: new Date().toISOString(),
          warnings: [`Shipa Freight API ${res.status}: ${errText.slice(0, 300)}`],
        };
      }

      const json = (await res.json()) as ShipaQuoteResponse;
      const quotes = (json.quotes ?? []).map((q) => mapQuote(q, this.id));
      return {
        adapterId: this.id,
        quotes,
        fetchedAt: new Date().toISOString(),
        warnings:
          quotes.length === 0
            ? ["No Shipa Freight quotes returned for this route/container."]
            : [],
      };
    } catch (e) {
      return {
        adapterId: this.id,
        quotes: [],
        fetchedAt: new Date().toISOString(),
        warnings: [`Shipa Freight fetch failed: ${(e as Error).message}`],
      };
    }
  }

  // ============================================================
  // Webhook signature — HMAC-SHA256 in x-shipa-signature.
  // Verify header name once real webhook docs are confirmed.
  // ============================================================
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) {
      console.warn("ShipaFreightAdapter: SHIPA_FREIGHT_WEBHOOK_SECRET not set");
      return false;
    }
    const given =
      headers["x-shipa-signature"] ?? headers["x-shipa-freight-signature"];
    if (!given) return false;

    const expected = createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
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
  // Webhook event mapping — Shipa pushes shipment status events.
  // ============================================================
  parseWebhookPayload(
    payload: unknown,
    _headers: Record<string, string>,
  ): TrackingEventIngestion | TrackingEventIngestion[] | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;

    const eventType =
      typeof p.eventType === "string"
        ? p.eventType
        : typeof p.event === "string"
          ? p.event
          : undefined;
    const data = (
      p.data && typeof p.data === "object" ? p.data : p
    ) as Record<string, unknown>;

    const trackingNumber =
      (typeof data.trackingNumber === "string" && data.trackingNumber) ||
      (typeof data.tracking_number === "string" && data.tracking_number) ||
      (typeof data.shipmentRef === "string" && data.shipmentRef) ||
      undefined;
    if (!trackingNumber) return null;

    return {
      lookup: { by: "tracking_number", value: trackingNumber },
      eventType: eventType ?? "status_update",
      description:
        typeof data.description === "string" ? data.description : undefined,
      location: mapLocation(data.location),
      newStatus: mapStatus(
        typeof data.status === "string" ? data.status : undefined,
      ),
      occurredAt:
        typeof data.timestamp === "string"
          ? data.timestamp
          : typeof data.occurredAt === "string"
            ? data.occurredAt
            : undefined,
      externalEventId:
        typeof data.eventId === "string"
          ? data.eventId
          : typeof data.id === "string"
            ? data.id
            : undefined,
      rawPayload: payload,
    };
  }

  // ============================================================
  // Poll-based tracking — GET /tracking/{ref}
  // Used by the carrier-tracking-poll cron for Shipa bookings.
  // ============================================================
  async pollTrackingEvents(refs: TrackingPollRef[]): Promise<TrackingEventIngestion[]> {
    if (!this.enabled || refs.length === 0) return [];
    const results: TrackingEventIngestion[] = [];

    await Promise.allSettled(
      refs.map(async (ref) => {
        try {
          const res = await fetch(
            `${this.baseUrl}/tracking/${encodeURIComponent(ref.externalRef)}`,
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                Accept: "application/json",
              },
            },
          );
          if (!res.ok) return;

          const json = (await res.json()) as ShipaTrackingResponse;
          for (const ev of json.events ?? []) {
            if (ref.sinceIso && ev.timestamp && ev.timestamp <= ref.sinceIso) continue;
            results.push({
              lookup: { by: "shipment_id", value: ref.shipmentId },
              eventType: ev.eventType ?? "status_update",
              description: ev.description,
              location: ev.location
                ? {
                    label: ev.location.name,
                    port: ev.location.port,
                    city: ev.location.city,
                    country: ev.location.country,
                  }
                : undefined,
              newStatus: mapStatus(ev.status),
              occurredAt: ev.timestamp,
              externalEventId: ev.id ?? `${ref.externalRef}-${ev.timestamp}`,
              rawPayload: ev,
            });
          }
        } catch {
          // Per-ref failure is swallowed — poll runner continues with remaining refs
        }
      }),
    );

    return results;
  }
}

// ============================================================
// Shipa Freight API types (best-effort — verify against real docs)
// ============================================================

interface ShipaQuoteRequest {
  origin: { port?: string; country: string };
  destination: { port?: string; country: string };
  shipmentType: "ocean" | "air";
  cargo: { type: string; quantity: number };
}

interface ShipaQuoteResponse {
  quotes?: ShipaQuote[];
}

interface ShipaQuote {
  id?: string;
  carrier?: { name?: string; scac?: string };
  price?: {
    total?: number;
    perContainer?: number;
    perCbm?: number;
    perKg?: number;
    minCharge?: number;
    fuelSurcharge?: { percentage?: number };
    currency?: string;
  };
  transitTime?: { min?: number; max?: number };
  validUntil?: string;
  serviceType?: string;
  [key: string]: unknown;
}

interface ShipaTrackingResponse {
  events?: Array<{
    id?: string;
    eventType?: string;
    status?: string;
    description?: string;
    timestamp?: string;
    location?: { name?: string; port?: string; city?: string; country?: string };
  }>;
}

// ============================================================
// Mappers
// ============================================================

function mapQuote(q: ShipaQuote, adapterId: string): CarrierRateQuote {
  const price = q.price ?? {};
  const currency = price.currency ?? "USD";
  const toMinor = (v: number | undefined) => Math.round((v ?? 0) * 100);

  const providerName = q.carrier?.name ?? "Shipa Freight";
  const transitMin = q.transitTime?.min;
  const transitMax = q.transitTime?.max;

  return {
    adapterId,
    providerName,
    externalRef: q.id,
    baseMinor: toMinor(price.total),
    perContainerMinor: toMinor(price.perContainer),
    perCbmMinor: toMinor(price.perCbm),
    perKgMinor: toMinor(price.perKg),
    minChargeMinor: toMinor(price.minCharge),
    fuelSurchargePct: price.fuelSurcharge?.percentage ?? 0,
    currency,
    transitDaysMin: transitMin,
    transitDaysMax: transitMax,
    validUntil: q.validUntil,
    rawMetadata: q as Record<string, unknown>,
    summary: `${providerName} · ${transitMin ?? "?"}–${transitMax ?? "?"} days · ${price.perContainer ?? price.perCbm ?? price.total ?? "?"} ${currency}`,
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

function mapStatus(s: string | undefined): TrackingEventIngestion["newStatus"] {
  if (!s) return undefined;
  const map: Record<string, TrackingEventIngestion["newStatus"]> = {
    booked: "assigned",
    collected: "picking",
    picked_up: "picking",
    in_transit: "in_transit",
    at_origin_port: "dispatched",
    departed: "dispatched",
    arrived: "at_hub",
    at_destination_port: "at_hub",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    returned: "returned",
    exception: "damaged",
    lost: "lost",
  };
  return map[s.toLowerCase()];
}

function mapContainerType(c: string): string {
  switch (c) {
    case "fcl_20": return "FCL_20";
    case "fcl_40": return "FCL_40";
    case "fcl_40hc": return "FCL_40HC";
    case "fcl_45": return "FCL_45HC";
    case "lcl": return "LCL";
    case "air_express": return "AIR_EXPRESS";
    case "air_freight": return "AIR";
    default: return c.toUpperCase();
  }
}
