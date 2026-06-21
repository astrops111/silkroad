import type { CarrierRateQuote } from "@/lib/logistics/carriers/types";

/**
 * How to pick the winning rate when multiple carriers return quotes.
 *
 * cheapest  — pure lowest effective cost (good for tight-margin buyers)
 * fastest   — shortest transit time (good for express/urgent shipments)
 * balanced  — 70% cost + 30% speed (platform default)
 */
export type SelectionStrategy = "cheapest" | "fastest" | "balanced";

/**
 * A CarrierRateQuote with ranking metadata attached.
 * `rank` = 1 is the best option under the chosen strategy.
 */
export interface RankedRate extends CarrierRateQuote {
  effectiveCostMinor: number;  // computed cost proxy used for ranking
  costScore: number;           // 0–100, higher = cheaper relative to peer set
  speedScore: number;          // 0–100, higher = faster relative to peer set
  score: number;               // final weighted score (0–100)
  rank: number;                // 1 = best
}

/**
 * Optional cargo hints passed to rankRates() so effective cost is computed
 * against real cargo dimensions rather than proxy values.
 * All fields are optional — omit when only per-unit rate comparison is needed.
 */
export interface CargoHints {
  weightKg?: number;
  volumeCbm?: number;
  containerCount?: number;
}
