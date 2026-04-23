// All money values are integers in minor units (cents) of the stated currency.
// FX conversion is intentionally out of scope for Phase 1 — assume all inputs
// share one currency. Multi-currency is a Phase 1.5 concern routed through OANDA.

export type ShippingMethod =
  | "platform_standard"
  | "platform_express"
  | "platform_freight"
  | "platform_cold_chain"
  | "supplier_self"
  | "buyer_pickup"
  | "third_party";

export type ContainerType =
  | "lcl"
  | "fcl_20"
  | "fcl_40"
  | "fcl_40hc"
  | "fcl_45"
  | "air_express"
  | "air_freight";

export type TradeTerm = "fob" | "cif" | "exw" | "ddp" | "dap" | "cpt" | "fca";

export interface CargoItem {
  sku?: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitCostMinor: number;     // supplier cost per unit, minor units
  weightKgPerUnit: number;
  volumeCbmPerUnit?: number;
  isFragile?: boolean;
  requiresColdChain?: boolean;
  isHazardous?: boolean;
}

export interface RouteEnd {
  portCode?: string;   // UN/LOCODE preferred — e.g. CNSHA, KEMBA
  country: string;     // ISO-2 — required even when portCode set, used as fallback
}

export type InsuranceMode =
  | { mode: "auto" }                                   // standard 110% CIF × default rate
  | { mode: "none" }
  | { mode: "manual"; ratePct: number; minPremiumMinor?: number };

export interface LandedCostInput {
  items: CargoItem[];
  currency: string;             // one currency for all inputs in Phase 1
  origin: RouteEnd;
  destination: RouteEnd;
  shippingMethod: ShippingMethod;
  containerType: ContainerType;
  incoterm: TradeTerm;
  insurance?: InsuranceMode;
  markupMultiplier?: number;    // defaults to platform markup (1.4×)
  handlingFeeMinor?: number;    // fixed platform handling, defaults to 0
  containerCount?: number;      // FCL: defaults to 1
  // For ops-originated quotes where ops sets the goods value directly
  // (e.g. forwarder-only freight quote with no SKU breakdown).
  goodsValueOverrideMinor?: number;
  // Origin-side and destination-side handling, when known from a forwarder
  // quote. Phase 1 has no port-handling provider — these default to 0 and
  // produce a warning if the seller's incoterm responsibility includes them.
  firstMileMinor?: number;
  lastMileMinor?: number;
}

export interface FreightLaneRate {
  laneId: string;
  baseMinor: number;
  perContainerMinor: number;
  perCbmMinor: number;
  perKgMinor: number;
  minChargeMinor: number;
  fuelSurchargePct: number;       // 0..100
  currency: string;
  transitDaysMin?: number;
  transitDaysMax?: number;
  consolidationDays?: number;
  source: string;
  provider?: string;
  validUntil?: string;            // ISO date
}

export interface TariffMatch {
  hsCode: string;            // the item's HS code we matched
  matchedPrefix: string;     // the prefix from tariff_rates that hit
  destinationCountry: string;
  dutyPct: number;
  vatPct: number;
  excisePct: number;
  otherFeesPct: Record<string, number>;  // { idf_pct: 2.5, rdl_pct: 2.0, ... }
  preferentialRatePct?: number;
  preferentialOriginCountries?: string[];
  source: string;
  provider?: string;
}

export interface CostComponent {
  amountMinor: number;
  // Whether this line is the seller's (our) cost under the incoterm.
  // Lines where includedInQuote=false are still computed for ops visibility
  // but aren't summed into what gets quoted to the buyer/requester.
  includedInQuote: boolean;
  notes?: string;
}

export interface CostBreakdown {
  currency: string;

  // Components — every key is always present for shape stability
  goods: CostComponent;
  firstMile: CostComponent;     // origin handling, export clearance, port-of-loading fees
  mainLeg: CostComponent;       // ocean / air freight + fuel surcharge
  insurance: CostComponent;
  duty: CostComponent;
  vat: CostComponent;
  excise: CostComponent;
  otherFees: CostComponent;     // sum of other_fees from tariff (IDF, RDL, etc.)
  lastMile: CostComponent;      // import handling, port-of-discharge, inland to door
  handling: CostComponent;      // platform handling fee

  // Totals
  subtotalLandedMinor: number;     // sum of all components above (full landed)
  quotedSubtotalMinor: number;     // sum of components where includedInQuote=true
  markupMultiplier: number;
  markupMinor: number;             // applied to quotedSubtotalMinor
  totalMinor: number;              // quotedSubtotalMinor + markupMinor

  // Metadata
  incoterm: TradeTerm;
  containerType: ContainerType;
  shippingMethod: ShippingMethod;
  laneId: string | null;
  tariffMatches: TariffMatch[];

  totals: {
    weightKg: number;
    volumeCbm: number;
    quantity: number;
    containerCount: number;
  };

  warnings: string[];
  computedAt: string;              // ISO timestamp
  source: "engine_v1";
}
