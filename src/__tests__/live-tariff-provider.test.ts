import { describe, it, expect, vi } from "vitest";
import {
  normalizeHsCode,
  parseTariffApiResponse,
  type ExternalTariffRate,
  type TariffApiClient,
  type TariffRateQuery,
} from "@/lib/logistics/tariffs/simplyduty";
import { LiveTariffProvider } from "@/lib/logistics/landed-cost/providers/live-tariff";
import type { TariffMatch } from "@/lib/logistics/landed-cost";
import type { TariffProvider } from "@/lib/logistics/landed-cost";

const QUERY: TariffRateQuery = {
  hsCode: "8517.13",
  destinationCountry: "KE",
  originCountry: "CN",
};

describe("normalizeHsCode", () => {
  it("strips dots and spaces", () => {
    expect(normalizeHsCode("8517.13")).toBe("851713");
    expect(normalizeHsCode("8517 13 00")).toBe("85171300");
    expect(normalizeHsCode("851713")).toBe("851713");
  });
});

describe("parseTariffApiResponse", () => {
  it("parses a flat PascalCase payload", () => {
    const rate = parseTariffApiResponse({ DutyRate: 25, VATRate: 16, ExciseRate: 10 }, QUERY);
    expect(rate).toMatchObject({ dutyPct: 25, vatPct: 16, excisePct: 10, destinationCountry: "KE" });
  });

  it("parses a wrapped camelCase payload with string numbers", () => {
    const rate = parseTariffApiResponse(
      { result: { dutyRate: "7.5", vatRate: "18", id: "req-123" } },
      QUERY,
    );
    expect(rate).toMatchObject({ dutyPct: 7.5, vatPct: 18, excisePct: 0, externalRef: "req-123" });
  });

  it("treats a zero duty rate as valid data", () => {
    const rate = parseTariffApiResponse({ duty_rate: 0, vat_rate: 16 }, QUERY);
    expect(rate).toMatchObject({ dutyPct: 0, vatPct: 16 });
  });

  it("returns null when no duty field is present", () => {
    expect(parseTariffApiResponse({ VATRate: 16 }, QUERY)).toBeNull();
    expect(parseTariffApiResponse({}, QUERY)).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    expect(parseTariffApiResponse(null, QUERY)).toBeNull();
    expect(parseTariffApiResponse("error", QUERY)).toBeNull();
  });
});

// ============================================================
// LiveTariffProvider tier behavior — all dependencies injected.
// ============================================================

const DB_MATCH: TariffMatch = {
  hsCode: "8517.13",
  matchedPrefix: "8517",
  destinationCountry: "KE",
  dutyPct: 25,
  vatPct: 16,
  excisePct: 0,
  otherFeesPct: { idf_pct: 2.5 },
  source: "tariff_db",
};

const API_RATE: ExternalTariffRate = {
  hsCode: "8517.13",
  destinationCountry: "KE",
  originCountry: "CN",
  dutyPct: 10,
  vatPct: 16,
  excisePct: 0,
  raw: {},
};

function fakeDb(match: TariffMatch | null): TariffProvider {
  return { resolve: vi.fn(async () => match) };
}

function fakeApi(result: ExternalTariffRate | null | Error): TariffApiClient {
  return {
    providerId: "simplyduty",
    isConfigured: () => true,
    fetchRate: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

describe("LiveTariffProvider", () => {
  it("returns the DB match without calling the API (Tier 1 wins)", async () => {
    const api = fakeApi(API_RATE);
    const provider = new LiveTariffProvider({ db: fakeDb(DB_MATCH), api, persist: vi.fn() });

    const match = await provider.resolve(QUERY);
    expect(match).toEqual(DB_MATCH);
    expect(api.fetchRate).not.toHaveBeenCalled();
  });

  it("falls back to the API on DB miss and persists the result", async () => {
    const persist = vi.fn(async () => {});
    const provider = new LiveTariffProvider({ db: fakeDb(null), api: fakeApi(API_RATE), persist });

    const match = await provider.resolve(QUERY);
    expect(match).toMatchObject({
      hsCode: "8517.13",
      matchedPrefix: "851713",
      dutyPct: 10,
      vatPct: 16,
      source: "tariff_api",
      provider: "simplyduty",
    });
    expect(persist).toHaveBeenCalledWith(API_RATE);
  });

  it("returns null when the API has no data for the pair", async () => {
    const provider = new LiveTariffProvider({ db: fakeDb(null), api: fakeApi(null), persist: vi.fn() });
    expect(await provider.resolve(QUERY)).toBeNull();
  });

  it("returns null (not throw) when the API errors", async () => {
    const provider = new LiveTariffProvider({
      db: fakeDb(null),
      api: fakeApi(new Error("SimplyDuty 429")),
      persist: vi.fn(),
    });
    expect(await provider.resolve(QUERY)).toBeNull();
  });

  it("behaves like DB-only when no API is configured", async () => {
    const provider = new LiveTariffProvider({ db: fakeDb(null), api: null, persist: vi.fn() });
    expect(await provider.resolve(QUERY)).toBeNull();
  });

  it("still returns the API match when persist fails", async () => {
    const provider = new LiveTariffProvider({
      db: fakeDb(null),
      api: fakeApi(API_RATE),
      persist: vi.fn(async () => {
        throw new Error("RLS denied");
      }),
    });
    const match = await provider.resolve(QUERY);
    expect(match?.dutyPct).toBe(10);
  });
});
