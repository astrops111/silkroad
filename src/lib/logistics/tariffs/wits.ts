import { normalizeHsCode } from "./hs";

// ============================================================
// WITS TRAINS client — free, official duty-rate data (no API key)
// ============================================================
//
// World Bank WITS (World Integrated Trade Solution) exposes UNCTAD TRAINS
// tariff data via a public SDMX-JSON API. No key, no cost — this replaces
// the paid SimplyDuty tier that used to live at logistics/tariffs/simplyduty.ts.
//
// Scope: import DUTY only (TARIFFTYPE=MFN, partner=000 = "the rate that
// applies to all non-PTA countries"). WITS TRN does not carry VAT/excise —
// those still need manual entry via /admin/logistics/reference.
//
// TRAINS data typically lags 1-4+ reporting years, so lookups walk backward
// through recent years until they find a populated observation.

const WITS_BASE = "https://wits.worldbank.org/API/V1/SDMX/V21";

// ISO-2 → WITS/ISO-3166-1-numeric reporter code. Scoped to the countries
// this platform actually trades with (see ports seed in
// 00052_logistics_landed_cost.sql) — verified against WITS's own country
// referential (GET {WITS_BASE_NO_SDMX}/wits/datasource/trn/country/ALL).
// Extend by looking up the target ISO3/numeric pair there before adding it.
export const WITS_REPORTER_CODES: Record<string, string> = {
  // Asian origins
  CN: "156", // China
  VN: "704", // Vietnam
  TH: "764", // Thailand
  KR: "410", // Korea, Rep.
  JP: "392", // Japan
  HK: "344", // Hong Kong, China
  TW: "158", // Taiwan, China
  // African destinations
  KE: "404", // Kenya
  TZ: "834", // Tanzania
  NG: "566", // Nigeria
  GH: "288", // Ghana
  CI: "384", // Cote d'Ivoire
  ZA: "710", // South Africa
  DJ: "262", // Djibouti
  MA: "504", // Morocco
  EG: "818", // Egypt
  RW: "646", // Rwanda
  UG: "800", // Uganda
  ET: "231", // Ethiopia
};

export interface WitsTariffResult {
  hsCode: string; // digits only, HS-6
  destinationCountry: string; // ISO-2
  dutyPct: number;
  tariffType: string; // "MFN" in the common case
  measure: string; // "SimpleAverage" etc.
  totalLines: number; // how many tariff lines the average was computed over
  year: number; // the reporting year the data actually came from
}

interface WitsObsAttrDef {
  id: string;
  values: { id: string; name: string }[];
}

/** Parses one SDMX-JSON tariff response into a flat result, or null if the series is empty (no data that year). */
function parseWitsResponse(json: unknown): Omit<WitsTariffResult, "hsCode" | "destinationCountry" | "year"> | null {
  const root = json as {
    dataSets?: { series?: Record<string, { observations?: Record<string, unknown[]> }> }[];
    structure?: { attributes?: { observation?: WitsObsAttrDef[] } };
  };

  const seriesMap = root.dataSets?.[0]?.series;
  const seriesKey = seriesMap ? Object.keys(seriesMap)[0] : undefined;
  if (!seriesMap || !seriesKey) return null;

  const observations = seriesMap[seriesKey].observations ?? {};
  const obsKey = Object.keys(observations)[0];
  if (obsKey === undefined) return null;

  const values = observations[obsKey] as (number | null)[];
  const obsValue = values[0];
  if (obsValue === null || obsValue === undefined) return null;

  const attrDefs = root.structure?.attributes?.observation ?? [];
  const attrs: Record<string, string> = {};
  attrDefs.forEach((def, i) => {
    const idx = values[i + 1];
    if (typeof idx === "number" && def.values[idx]) {
      attrs[def.id] = def.values[idx].id;
    }
  });

  return {
    dutyPct: Number(obsValue),
    tariffType: attrs.TARIFFTYPE ?? "MFN",
    measure: attrs.OBS_VALUE_MEASURE ?? "SimpleAverage",
    totalLines: Number(attrs.TOTALNOOFLINES ?? "1"),
  };
}

// TRAINS reporting lag varies wildly by country — some reporters (e.g. Kenya)
// have last year's data immediately, others (e.g. China) can be 4-5 years
// stale for a given HS-6 line. 5 attempts is a pragmatic compromise; pass an
// explicit `year` (discovered via a one-off manual probe) for reporters that
// still come back empty after that.
const YEAR_FALLBACK_ATTEMPTS = 5;

// Observed in practice: WITS occasionally hangs well past 10s on a no-data
// combo instead of returning a fast 404. Abort and move to the next
// candidate year rather than let one slow query stall the whole batch.
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWitsUrl(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null; // timeout or network error — treat like "no data this year"
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches the MFN duty rate for one HS-6 code × destination country from
 * WITS TRAINS. Walks backward up to YEAR_FALLBACK_ATTEMPTS years from the
 * starting year since the most recent reporting years are frequently
 * unpopulated. Returns null if no year in the window has data — that is
 * the expected outcome for a lot of code×country pairs, not an error.
 */
export async function fetchWitsTariffRate(input: {
  destinationCountry: string;
  hsCode: string;
  year?: number;
}): Promise<WitsTariffResult | null> {
  const reporterCode = WITS_REPORTER_CODES[input.destinationCountry.toUpperCase()];
  if (!reporterCode) {
    throw new Error(
      `No WITS reporter code mapped for "${input.destinationCountry}" — add it to WITS_REPORTER_CODES`
    );
  }

  const hs6 = normalizeHsCode(input.hsCode);
  if (hs6.length !== 6) {
    throw new Error(`WITS requires a 6-digit HS code, got "${input.hsCode}" (normalized: "${hs6}")`);
  }

  const startYear = input.year ?? new Date().getUTCFullYear() - 1;

  for (let i = 0; i < YEAR_FALLBACK_ATTEMPTS; i++) {
    const year = startYear - i;
    const url =
      `${WITS_BASE}/datasource/trn/reporter/${reporterCode}/partner/000` +
      `/product/${hs6}/year/${year}/datatype/reported?format=JSON`;

    const res = await fetchWitsUrl(url);
    if (!res) continue; // no data / timeout for this year is common, not fatal

    const json = await res.json();
    const parsed = parseWitsResponse(json);
    if (parsed) {
      return { ...parsed, hsCode: hs6, destinationCountry: input.destinationCountry.toUpperCase(), year };
    }
  }

  return null;
}
