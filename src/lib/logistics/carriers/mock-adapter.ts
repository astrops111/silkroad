import type {
  CarrierAdapter,
  CarrierRateQuote,
  CarrierRateQuoteRequest,
  CarrierRateQuoteResponse,
  TrackingEventIngestion,
} from "./types";

/**
 * MockCarrierAdapter — returns synthetic but realistic rates for demos,
 * local dev, and exercising the UI without live API credentials.
 *
 * Numbers are calibrated to typical 2026 CN/SEA → Africa marine / air pricing
 * (as USD cents). Jitter added so repeated fetches produce slightly different
 * quotes across the "carriers" below, letting ops see comparison UX.
 */
export class MockCarrierAdapter implements CarrierAdapter {
  readonly id = "mock_aggregator";
  readonly displayName = "Mock aggregator (demo)";
  readonly enabled = true;
  readonly capabilities = { seaFcl: true, seaLcl: true, airFreight: true, airExpress: true };

  async fetchRates(req: CarrierRateQuoteRequest): Promise<CarrierRateQuoteResponse> {
    const carriers = pickCarriersForMode(req);
    const validUntil = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

    const quotes: CarrierRateQuote[] = carriers.map((carrier) => {
      const jitter = 0.9 + Math.random() * 0.25; // ±12.5%
      const [transitMin, transitMax] = transitDaysFor(req);
      const base = baseRateFor(req, carrier, jitter);

      const q: CarrierRateQuote = {
        adapterId: this.id,
        providerName: carrier,
        externalRef: `MOCK-${carrier.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ...base,
        currency: "USD",
        transitDaysMin: transitMin,
        transitDaysMax: transitMax,
        validUntil,
        summary: summarize(req, carrier, base, transitMin, transitMax),
      };
      return q;
    });

    return {
      adapterId: this.id,
      quotes,
      fetchedAt: new Date().toISOString(),
      warnings: [
        "Mock adapter — rates are synthetic, calibrated to typical 2026 pricing. Do not quote customers directly from these.",
      ],
    };
  }

  // ============================================================
  // Webhook ingestion — accepts a simple normalized shape for testing.
  // No signature verification (the mock is for local dev only).
  // Expected payload shape:
  //   {
  //     tracking_number: "MOCK-123",
  //     status: "in_transit",
  //     event: "arrived_at_port",
  //     description?: string,
  //     location?: { port?: string, city?: string, country?: string },
  //     timestamp?: string (ISO),
  //     event_id?: string,
  //   }
  // ============================================================
  verifyWebhookSignature(_rawBody: string, _headers: Record<string, string>): boolean {
    return true; // mock accepts anything
  }

  parseWebhookPayload(payload: unknown, _headers: Record<string, string>): TrackingEventIngestion | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const trackingNumber = typeof p.tracking_number === "string" ? p.tracking_number : undefined;
    if (!trackingNumber) return null;

    return {
      lookup: { by: "tracking_number", value: trackingNumber },
      eventType: typeof p.event === "string" ? p.event : "status_update",
      description: typeof p.description === "string" ? p.description : undefined,
      location: (p.location && typeof p.location === "object")
        ? (p.location as TrackingEventIngestion["location"])
        : undefined,
      newStatus: p.status as TrackingEventIngestion["newStatus"],
      occurredAt: typeof p.timestamp === "string" ? p.timestamp : undefined,
      externalEventId: typeof p.event_id === "string" ? p.event_id : undefined,
      rawPayload: payload,
    };
  }
}

// ============================================================
// Helpers
// ============================================================

function pickCarriersForMode(req: CarrierRateQuoteRequest): string[] {
  const isAir = req.containerType === "air_express" || req.containerType === "air_freight";
  if (req.containerType === "air_express") return ["DHL Express", "FedEx Priority", "UPS Worldwide"];
  if (isAir) return ["Emirates SkyCargo", "Qatar Airways Cargo", "Ethiopian Cargo", "Turkish Cargo"];
  return ["Maersk", "COSCO", "MSC", "ONE", "CMA CGM"];
}

function transitDaysFor(req: CarrierRateQuoteRequest): [number, number] {
  const isAir = req.containerType === "air_express" || req.containerType === "air_freight";
  const isLcl = req.containerType === "lcl";
  if (req.containerType === "air_express") return [3, 6];
  if (isAir) return [5, 10];
  if (isLcl) return [35, 50]; // includes consolidation
  return [28, 42];             // FCL port-to-port
}

function baseRateFor(
  req: CarrierRateQuoteRequest,
  _carrier: string,
  jitter: number,
): Pick<
  CarrierRateQuote,
  "baseMinor" | "perContainerMinor" | "perCbmMinor" | "perKgMinor" | "minChargeMinor" | "fuelSurchargePct"
> {
  const round = (n: number) => Math.round(n);
  switch (req.containerType) {
    case "fcl_20":
      return {
        baseMinor: 0,
        perContainerMinor: round(2_500_00 * jitter),
        perCbmMinor: 0,
        perKgMinor: 0,
        minChargeMinor: round(2_500_00 * jitter),
        fuelSurchargePct: 0,
      };
    case "fcl_40":
      return {
        baseMinor: 0,
        perContainerMinor: round(3_800_00 * jitter),
        perCbmMinor: 0,
        perKgMinor: 0,
        minChargeMinor: round(3_800_00 * jitter),
        fuelSurchargePct: 0,
      };
    case "fcl_40hc":
      return {
        baseMinor: 0,
        perContainerMinor: round(4_000_00 * jitter),
        perCbmMinor: 0,
        perKgMinor: 0,
        minChargeMinor: round(4_000_00 * jitter),
        fuelSurchargePct: 0,
      };
    case "fcl_45":
      return {
        baseMinor: 0,
        perContainerMinor: round(4_600_00 * jitter),
        perCbmMinor: 0,
        perKgMinor: 0,
        minChargeMinor: round(4_600_00 * jitter),
        fuelSurchargePct: 0,
      };
    case "lcl":
      return {
        baseMinor: round(4_800_00 * jitter),
        perContainerMinor: 0,
        perCbmMinor: round(75_00 * jitter),
        perKgMinor: 0,
        minChargeMinor: round(100_00 * jitter),
        fuelSurchargePct: 10,
      };
    case "air_express":
      return {
        baseMinor: round(30_00 * jitter),
        perContainerMinor: 0,
        perCbmMinor: 0,
        perKgMinor: round(12_00 * jitter),
        minChargeMinor: round(200_00 * jitter),
        fuelSurchargePct: 15,
      };
    case "air_freight":
      return {
        baseMinor: round(50_00 * jitter),
        perContainerMinor: 0,
        perCbmMinor: 0,
        perKgMinor: round(7_50 * jitter),
        minChargeMinor: round(200_00 * jitter),
        fuelSurchargePct: 12,
      };
  }
}

function summarize(
  req: CarrierRateQuoteRequest,
  carrier: string,
  base: ReturnType<typeof baseRateFor>,
  tMin: number,
  tMax: number,
): string {
  const ccy = "USD";
  let priceBit = "";
  if (base.perContainerMinor > 0) priceBit = `${fmt(base.perContainerMinor)} / ctr`;
  else if (base.perCbmMinor > 0) priceBit = `${fmt(base.perCbmMinor)} / CBM + base ${fmt(base.baseMinor)}`;
  else if (base.perKgMinor > 0) priceBit = `${fmt(base.perKgMinor)} / kg + base ${fmt(base.baseMinor)}`;
  else priceBit = `${fmt(base.baseMinor)} flat`;

  const route = `${req.originPortCode ?? req.originCountry} → ${req.destinationPortCode ?? req.destinationCountry}`;
  return `${carrier} · ${route} · ${req.containerType} · ${priceBit} ${ccy} · ${tMin}–${tMax} days`;
}

function fmt(minor: number): string {
  return `$${(minor / 100).toFixed(0)}`;
}
