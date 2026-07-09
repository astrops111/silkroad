// SimplyDuty tariff API client — the "paid API optional" slot of the tariff
// pipeline. Duty/VAT rates by HS code × destination, used two ways:
//   1. LiveTariffProvider — per-quote gap fill when tariff_rates has no row.
//   2. /api/cron/tariff-refresh — batch refresh of tariff_api-sourced rows.
//
// Endpoint + field names are env-overridable because SimplyDuty has revved
// its API shape before; confirm against your dashboard at simplyduty.com/api.
// No SIMPLYDUTY_API_KEY → client reports unconfigured and callers skip it.

export interface ExternalTariffRate {
  hsCode: string;
  destinationCountry: string;   // ISO-2
  originCountry?: string;       // ISO-2 — rate may be origin-dependent (FTA)
  dutyPct: number;
  vatPct: number;
  excisePct: number;
  externalRef?: string;
  raw: unknown;
}

export interface TariffRateQuery {
  hsCode: string;
  destinationCountry: string;
  originCountry?: string;
}

export interface TariffApiClient {
  readonly providerId: string;
  isConfigured(): boolean;
  /** Returns null when the provider has no rate for the pair (not an error). */
  fetchRate(query: TariffRateQuery): Promise<ExternalTariffRate | null>;
}

const DEFAULT_API_BASE = "https://www.simplyduty.com/api";

/** Strip dots/spaces, keep digits only — SimplyDuty wants bare HS-6/8/10. */
export function normalizeHsCode(hsCode: string): string {
  return hsCode.replace(/[^0-9]/g, "");
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

/**
 * Defensive parse of a SimplyDuty-style rate payload. Field names vary across
 * API versions, so known aliases are tried in order. Returns null when no
 * duty-rate-like field is present — treated as "no data for this pair".
 * All rates are percentages (5 = 5%).
 */
export function parseTariffApiResponse(
  payload: unknown,
  query: TariffRateQuery,
): ExternalTariffRate | null {
  if (payload === null || typeof payload !== "object") return null;
  // Some endpoints wrap the result: { result: {...} } or { data: {...} }
  const root = payload as Record<string, unknown>;
  const body = (["result", "data", "rates"].map((k) => root[k]).find(
    (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  ) ?? root) as Record<string, unknown>;

  const dutyPct = pickNumber(body, [
    "dutyRate", "DutyRate", "duty_rate", "importDutyRate", "ImportDutyRate", "duty",
  ]);
  if (dutyPct === undefined) return null;

  const vatPct = pickNumber(body, [
    "vatRate", "VATRate", "VatRate", "vat_rate", "salesTaxRate", "SalesTaxRate", "vat",
  ]) ?? 0;
  const excisePct = pickNumber(body, [
    "exciseRate", "ExciseRate", "excise_rate", "excise",
  ]) ?? 0;

  const refCandidate = body["id"] ?? body["requestId"] ?? body["RequestId"];
  return {
    hsCode: query.hsCode,
    destinationCountry: query.destinationCountry,
    originCountry: query.originCountry,
    dutyPct,
    vatPct,
    excisePct,
    externalRef: typeof refCandidate === "string" ? refCandidate : undefined,
    raw: payload,
  };
}

export class SimplyDutyClient implements TariffApiClient {
  readonly providerId = "simplyduty";
  private readonly apiKey: string | undefined;
  private readonly apiBase: string;

  constructor(opts?: { apiKey?: string; apiBase?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.SIMPLYDUTY_API_KEY;
    this.apiBase = (opts?.apiBase ?? process.env.SIMPLYDUTY_API_BASE ?? DEFAULT_API_BASE)
      .replace(/\/$/, "");
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchRate(query: TariffRateQuery): Promise<ExternalTariffRate | null> {
    if (!this.apiKey) return null;

    const params = new URLSearchParams({
      hscode: normalizeHsCode(query.hsCode),
      tocountry: query.destinationCountry,
    });
    if (query.originCountry) params.set("fromcountry", query.originCountry);

    const url = `${this.apiBase}/duties/getduty?${params.toString()}`;
    const res = await fetch(url, {
      headers: { "x-api-key": this.apiKey, accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (res.status === 404) return null; // no rate for this pair
    if (!res.ok) {
      throw new Error(`SimplyDuty ${res.status} for ${query.destinationCountry}/${query.hsCode}`);
    }

    const payload = await res.json();
    return parseTariffApiResponse(payload, query);
  }
}

/** The tariff API wired into the engine + cron. Null when no key is set. */
export function getDefaultTariffApiClient(): TariffApiClient | null {
  const client = new SimplyDutyClient();
  return client.isConfigured() ? client : null;
}
