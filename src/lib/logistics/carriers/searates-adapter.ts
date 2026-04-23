// ============================================================
// Searates tracking adapter.
// https://www.searates.com/tracking-api/
//
// Searates aggregates container tracking across all major ocean
// carriers (Maersk, MSC, CMA CGM, COSCO, ONE, etc.) behind a
// single REST API keyed by container number / BL / booking ref.
// We use it as the v1 source of automated milestones for
// CN→Africa shipments; ShipsGo or terminal49 can swap in later
// without touching the cron / poll-runner because the adapter
// interface is provider-agnostic.
//
// Only `pollTrackingEvents` is implemented in Phase 2 — the rate-
// fetch surface stays as the existing Freightos adapter for spot
// quotes. fetchRates returns an empty response so the adapter
// won't show up in the rate-fetcher modal.
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CarrierAdapter,
  CarrierRateQuoteRequest,
  CarrierRateQuoteResponse,
  TrackingEventIngestion,
  TrackingPollRef,
} from "./types";

interface SearatesEvent {
  event_code?: string;             // "VD" (vessel departed), "PL" (port load), etc.
  description?: string;
  occurred_at?: string;            // ISO timestamp
  location_name?: string;
  port_code?: string;              // UN/LOCODE
  port_country?: string;
  port_city?: string;
  latitude?: number;
  longitude?: number;
  is_milestone?: boolean;
}

interface SearatesContainerResponse {
  container_number?: string;
  bl_number?: string;
  scac?: string;
  vessel_name?: string;
  voyage?: string;
  events?: SearatesEvent[];
}

// Map Searates event codes onto our internal status enum where they
// map cleanly. Anything not in this list passes through with the
// raw description but no auto-status-advance.
const SEARATES_STATUS_MAP: Record<string, TrackingEventIngestion["newStatus"]> = {
  GO: "dispatched",        // gate out (origin)
  LD: "dispatched",        // loaded onto vessel
  VD: "in_transit",        // vessel departed
  TS: "in_transit",        // transshipment
  VA: "at_hub",            // vessel arrived
  PL: "at_hub",            // port of loading
  PD: "at_hub",            // port of discharge
  GI: "out_for_delivery",  // gate in (destination terminal)
  DL: "delivered",         // delivered
};

export class SearatesAdapter implements CarrierAdapter {
  readonly id = "searates";
  readonly displayName = "Searates Tracking";
  readonly capabilities = { seaFcl: true, seaLcl: true, airFreight: false, airExpress: false };

  private readonly apiKey = process.env.SEARATES_API_KEY;
  private readonly baseUrl = process.env.SEARATES_API_BASE ?? "https://tracking.searates.com";
  private readonly webhookSecret = process.env.SEARATES_WEBHOOK_SECRET;

  get enabled(): boolean { return Boolean(this.apiKey); }

  async fetchRates(_req: CarrierRateQuoteRequest): Promise<CarrierRateQuoteResponse> {
    return {
      adapterId: this.id,
      quotes: [],
      fetchedAt: new Date().toISOString(),
      warnings: ["Searates adapter is tracking-only; use Freightos or carrier APIs for rates."],
    };
  }

  async pollTrackingEvents(refs: TrackingPollRef[]): Promise<TrackingEventIngestion[]> {
    if (!this.enabled || refs.length === 0) return [];

    const settled = await Promise.allSettled(refs.map((r) => this.lookupOne(r)));
    const events: TrackingEventIngestion[] = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === "fulfilled") {
        events.push(...r.value);
      } else {
        console.error(`SearatesAdapter: poll failed for ${refs[i].externalRef}`, r.reason);
      }
    }
    return events;
  }

  private async lookupOne(ref: TrackingPollRef): Promise<TrackingEventIngestion[]> {
    const url = new URL(`${this.baseUrl}/tracking`);
    url.searchParams.set("number", ref.externalRef);
    if (ref.carrierScac) url.searchParams.set("sealine", ref.carrierScac);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Searates ${response.status}: ${await response.text().catch(() => "")}`);
    }

    const body = (await response.json()) as SearatesContainerResponse;
    const events = body.events ?? [];
    const sinceMs = ref.sinceIso ? Date.parse(ref.sinceIso) : 0;

    return events
      .filter((e) => {
        if (!e.occurred_at) return false;
        if (sinceMs && Date.parse(e.occurred_at) <= sinceMs) return false;
        return true;
      })
      .map((e): TrackingEventIngestion => ({
        lookup: { by: "shipment_id", value: ref.shipmentId },
        eventType: e.event_code ?? "carrier_event",
        description: e.description,
        occurredAt: e.occurred_at,
        location: {
          label: e.location_name,
          port: e.port_code,
          city: e.port_city,
          country: e.port_country,
          lat: e.latitude,
          lng: e.longitude,
        },
        newStatus: e.event_code ? SEARATES_STATUS_MAP[e.event_code] : undefined,
        // Searates events are uniquely identified by (number + occurred_at + event_code).
        // Combine into a stable string for the dedupe key.
        externalEventId: e.occurred_at && e.event_code
          ? `${ref.externalRef}:${e.event_code}:${e.occurred_at}`
          : undefined,
        rawPayload: e,
      }));
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) return false;
    const sig = headers["x-searates-signature"];
    if (!sig) return false;
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhookPayload(payload: unknown): TrackingEventIngestion | TrackingEventIngestion[] | null {
    // Searates push events look like:
    // { container_number, bl_number?, scac, vessel_name?, voyage?, events: [...] }
    // We treat the container/BL as the lookup key and emit one event per
    // entry in `events`. Same shape as the poll path so dedup is automatic.
    const body = payload as SearatesContainerResponse | undefined;
    if (!body || !Array.isArray(body.events)) return null;
    const ref = body.container_number || body.bl_number;
    if (!ref) return null;

    return body.events
      .filter((e) => e.event_code && e.occurred_at)
      .map((e): TrackingEventIngestion => ({
        lookup: { by: "external_ref", adapterId: this.id, value: ref },
        eventType: e.event_code ?? "carrier_event",
        description: e.description,
        occurredAt: e.occurred_at,
        location: {
          label: e.location_name,
          port: e.port_code,
          city: e.port_city,
          country: e.port_country,
          lat: e.latitude,
          lng: e.longitude,
        },
        newStatus: e.event_code ? SEARATES_STATUS_MAP[e.event_code] : undefined,
        externalEventId: `${ref}:${e.event_code}:${e.occurred_at}`,
        rawPayload: e,
      }));
  }
}

export const searatesAdapter = new SearatesAdapter();
