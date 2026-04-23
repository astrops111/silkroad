import { FreightosAdapter } from "./freightos-adapter";
import { MockCarrierAdapter } from "./mock-adapter";
import { SearatesAdapter } from "./searates-adapter";
import type {
  AggregatedRateResponse,
  CarrierAdapter,
  CarrierRateQuoteRequest,
} from "./types";

/**
 * Default adapter set. Order here controls display order in the UI.
 * New adapters: add them here and they're automatically picked up.
 */
const DEFAULT_ADAPTERS: CarrierAdapter[] = [
  new MockCarrierAdapter(),
  new FreightosAdapter(),
  new SearatesAdapter(),
];

export function getAdapterById(id: string): CarrierAdapter | null {
  return DEFAULT_ADAPTERS.find((a) => a.id === id) ?? null;
}

export function listAdapters(): CarrierAdapter[] {
  return DEFAULT_ADAPTERS;
}

export function listEnabledAdapters(): CarrierAdapter[] {
  return DEFAULT_ADAPTERS.filter((a) => a.enabled);
}

/**
 * Fan out a single request to every enabled adapter in parallel.
 * Returns a merged response with all quotes plus per-adapter errors.
 * No adapter can block another — one failure doesn't break the others.
 */
export async function fetchRatesFromAll(
  request: CarrierRateQuoteRequest,
  adapters: CarrierAdapter[] = listEnabledAdapters(),
): Promise<AggregatedRateResponse> {
  const requestedAt = new Date().toISOString();
  const settled = await Promise.allSettled(adapters.map((a) => a.fetchRates(request)));

  const responses = [];
  const errors: { adapterId: string; error: string }[] = [];

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!;
    const adapter = adapters[i]!;
    if (s.status === "fulfilled") {
      responses.push(s.value);
    } else {
      errors.push({ adapterId: adapter.id, error: (s.reason as Error).message ?? String(s.reason) });
    }
  }

  const totalQuotes = responses.reduce((sum, r) => sum + r.quotes.length, 0);
  return { requestedAt, responses, totalQuotes, errors };
}
