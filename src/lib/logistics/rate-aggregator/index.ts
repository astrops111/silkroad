import { fetchRatesFromAll } from "@/lib/logistics/carriers/registry";
import type { CarrierRateQuote, CarrierRateQuoteRequest } from "@/lib/logistics/carriers/types";
import type { CargoHints, RankedRate, SelectionStrategy } from "./types";

export type { CargoHints, RankedRate, SelectionStrategy };

// ============================================================
// rankRates
//
// Scores and ranks a flat list of quotes from multiple adapters.
// BSA rates (adapterId = "bsa") always receive rank 0 regardless
// of strategy — they are negotiated rates below market price and
// always win when present for the route.
//
// For non-BSA quotes:
//   effectiveCostMinor = estimated total cost based on cargo hints.
//   costScore / speedScore = normalised 0–100 within the peer set.
//   final score = costScore * costWeight + speedScore * speedWeight.
// ============================================================
export function rankRates(
  quotes: CarrierRateQuote[],
  strategy: SelectionStrategy = "balanced",
  cargo?: CargoHints,
): RankedRate[] {
  if (quotes.length === 0) return [];

  // BSA rates are pinned above all market ranks — negotiated rates always win.
  const bsaQuotes = quotes.filter((q) => q.adapterId === "bsa");
  const marketQuotes = quotes.filter((q) => q.adapterId !== "bsa");

  const weightCost = strategy === "fastest" ? 0 : strategy === "cheapest" ? 1 : 0.7;
  const weightSpeed = 1 - weightCost;

  const withCost = marketQuotes.map((q) => ({
    q,
    cost: effectiveCost(q, cargo),
    transit: q.transitDaysMin ?? q.transitDaysMax ?? 999,
  }));

  const costs = withCost.map((x) => x.cost);
  const transits = withCost.map((x) => x.transit);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minTransit = Math.min(...transits);
  const maxTransit = Math.max(...transits);

  const normalise = (v: number, lo: number, hi: number) =>
    hi === lo ? 0 : (v - lo) / (hi - lo);

  const ranked: RankedRate[] = withCost.map(({ q, cost, transit }) => {
    const normCost = normalise(cost, minCost, maxCost);
    const normSpeed = normalise(transit, minTransit, maxTransit);
    const costScore = Math.round((1 - normCost) * 100);
    const speedScore = Math.round((1 - normSpeed) * 100);
    const score = Math.round(costScore * weightCost + speedScore * weightSpeed);
    return { ...q, effectiveCostMinor: cost, costScore, speedScore, score, rank: 0 };
  });

  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => { r.rank = i + 1; });

  // BSA quotes prepend with rank 0 (above all market ranks).
  const bsaRanked: RankedRate[] = bsaQuotes.map((q) => ({
    ...q,
    effectiveCostMinor: effectiveCost(q, cargo),
    costScore: 100,
    speedScore: 100,
    score: 100,
    rank: 0,
  }));

  return [...bsaRanked, ...ranked];
}

// ============================================================
// selectBestRate
//
// Fan out to all enabled carrier adapters, rank results, return
// the single best quote. Returns null when no adapter has rates
// for the given route (engine falls back to hand-seeded DB lanes).
// ============================================================
export async function selectBestRate(
  req: CarrierRateQuoteRequest,
  strategy: SelectionStrategy = "balanced",
  cargo?: CargoHints,
): Promise<RankedRate | null> {
  const aggregated = await fetchRatesFromAll(req);
  const allQuotes = aggregated.responses.flatMap((r) => r.quotes);
  if (allQuotes.length === 0) return null;
  const ranked = rankRates(allQuotes, strategy, cargo);
  return ranked[0] ?? null;
}

// ============================================================
// allRankedRates
//
// Returns the full ranked list so the ops UI can display all
// options (Shipa vs Freightos vs BSA) side-by-side and let
// ops pick or override the auto-selection.
// ============================================================
export async function allRankedRates(
  req: CarrierRateQuoteRequest,
  strategy: SelectionStrategy = "balanced",
  cargo?: CargoHints,
): Promise<{ ranked: RankedRate[]; errors: { adapterId: string; error: string }[] }> {
  const aggregated = await fetchRatesFromAll(req);
  const allQuotes = aggregated.responses.flatMap((r) => r.quotes);
  const ranked = rankRates(allQuotes, strategy, cargo);
  return { ranked, errors: aggregated.errors };
}

// ============================================================
// effectiveCost — compute a single comparable cost number.
//
// Uses cargo hints when available; falls back to per-unit proxies
// (1 container for FCL, 1 CBM for LCL, 100 kg for air) so quotes
// are still rankable without exact cargo dimensions.
// ============================================================
function effectiveCost(q: CarrierRateQuote, cargo?: CargoHints): number {
  const containers = cargo?.containerCount ?? 1;
  const cbm = cargo?.volumeCbm ?? 1;
  const kg = cargo?.weightKg ?? 100;

  // FCL: base + per-container × count
  if (q.perContainerMinor > 0) {
    const raw = q.baseMinor + q.perContainerMinor * containers;
    return applyFuel(Math.max(raw, q.minChargeMinor), q.fuelSurchargePct);
  }

  // Air: base + per-kg × chargeable weight (volumetric or actual, whichever heavier)
  if (q.perKgMinor > 0) {
    const chargeableKg = Math.max(kg, cbm * 167);
    const raw = q.baseMinor + q.perKgMinor * chargeableKg;
    return applyFuel(Math.max(raw, q.minChargeMinor), q.fuelSurchargePct);
  }

  // LCL: base + per-CBM × revenue ton
  if (q.perCbmMinor > 0) {
    const revTon = Math.max(cbm, kg / 1000);
    const raw = q.baseMinor + q.perCbmMinor * revTon;
    return applyFuel(Math.max(raw, q.minChargeMinor), q.fuelSurchargePct);
  }

  // Lump-sum quote — use base as-is.
  return applyFuel(Math.max(q.baseMinor, q.minChargeMinor), q.fuelSurchargePct);
}

function applyFuel(amount: number, fuelSurchargePct: number): number {
  return amount + Math.round((amount * fuelSurchargePct) / 100);
}
