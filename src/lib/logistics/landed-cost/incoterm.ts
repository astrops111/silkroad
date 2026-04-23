import type { TradeTerm } from "./types";

// Which landed-cost components fall on the seller (us) under each Incoterm 2020 rule.
// `goods`, `handling`, and the platform `markup` are always seller-side and are
// not modeled here (they're always included in the quote we send out).
export type CostScope =
  | "firstMile"
  | "mainLeg"
  | "insurance"
  | "duty"
  | "vat"
  | "excise"
  | "otherFees"
  | "lastMile";

export type IncotermResponsibility = Record<CostScope, boolean>;

// Conservative, common-practice mapping. Matches Incoterms 2020 for sea/multimodal use.
// CIF/CIP are sea/any-mode aliases; we collapse to one entry per incoterm we support.
const RESPONSIBILITY: Record<TradeTerm, IncotermResponsibility> = {
  exw: { firstMile: false, mainLeg: false, insurance: false, duty: false, vat: false, excise: false, otherFees: false, lastMile: false },
  fca: { firstMile: true,  mainLeg: false, insurance: false, duty: false, vat: false, excise: false, otherFees: false, lastMile: false },
  fob: { firstMile: true,  mainLeg: false, insurance: false, duty: false, vat: false, excise: false, otherFees: false, lastMile: false },
  cpt: { firstMile: true,  mainLeg: true,  insurance: false, duty: false, vat: false, excise: false, otherFees: false, lastMile: false },
  cif: { firstMile: true,  mainLeg: true,  insurance: true,  duty: false, vat: false, excise: false, otherFees: false, lastMile: false },
  dap: { firstMile: true,  mainLeg: true,  insurance: true,  duty: false, vat: false, excise: false, otherFees: false, lastMile: true  },
  ddp: { firstMile: true,  mainLeg: true,  insurance: true,  duty: true,  vat: true,  excise: true,  otherFees: true,  lastMile: true  },
};

export function sellerCovers(incoterm: TradeTerm, scope: CostScope): boolean {
  return RESPONSIBILITY[incoterm][scope];
}
