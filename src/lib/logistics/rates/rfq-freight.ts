/**
 * Per-RFQ freight arithmetic.
 *
 * Distinct from `calculateShippingCost`, which prices a cart from a standing
 * rate card. Here ops has a forwarder quote for one specific RFQ and enters
 * the measured cargo plus whatever ad-hoc expenses that shipment attracts
 * (customs inspection, storage, trucking…).
 *
 * Pure and client-safe on purpose: the admin form previews the totals with
 * this exact function and the server action recomputes with it before
 * writing, so the number ops signs off is the number that gets stored.
 *
 * All money is integer minor units (cents).
 */

export interface RfqExpenseLine {
  label: string;
  amountMinor: number;
}

export interface RfqFreightInput {
  /** Measured chargeable weight; floored to minChargeableKg below. */
  chargeableWeightKg?: number;
  volumeCbm?: number;
  cartonCount?: number;
  perKgRate?: number;
  perCbmRate?: number;
  /** Carrier minimum billable weight, e.g. air freight's MIN 100 KG. */
  minChargeableKg?: number;
  reboxFeePerCarton?: number;
  documentationFee?: number;
  expenses?: RfqExpenseLine[];
}

export interface RfqFreightTotals {
  /** What actually gets billed — measured weight or the carrier minimum. */
  chargeableWeightKg: number;
  weightCharge: number;
  volumeCharge: number;
  reboxCharge: number;
  documentationFee: number;
  freightTotal: number;
  expensesTotal: number;
  total: number;
}

const num = (v: number | undefined | null): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function computeRfqFreight(input: RfqFreightInput): RfqFreightTotals {
  const chargeableWeightKg = Math.max(
    num(input.chargeableWeightKg),
    num(input.minChargeableKg)
  );

  const weightCharge = Math.round(chargeableWeightKg * num(input.perKgRate));
  const volumeCharge = Math.round(num(input.volumeCbm) * num(input.perCbmRate));
  const reboxCharge = Math.round(num(input.cartonCount) * num(input.reboxFeePerCarton));
  const documentationFee = Math.round(num(input.documentationFee));

  const freightTotal = weightCharge + volumeCharge + reboxCharge + documentationFee;

  const expensesTotal = (input.expenses ?? []).reduce((sum, e) => {
    const amount = Number(e?.amountMinor ?? 0);
    return sum + (Number.isFinite(amount) ? Math.round(amount) : 0);
  }, 0);

  return {
    chargeableWeightKg,
    weightCharge,
    volumeCharge,
    reboxCharge,
    documentationFee,
    freightTotal,
    expensesTotal,
    total: freightTotal + expensesTotal,
  };
}

/**
 * Normalises expense lines coming off a form: drops unlabelled rows, trims
 * labels, and coerces amounts to whole minor units. Negative amounts are kept
 * on purpose — a discount or rebate is a legitimate line.
 */
export function normaliseExpenses(raw: unknown): RfqExpenseLine[] {
  if (!Array.isArray(raw)) return [];
  const out: RfqExpenseLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = String(rec.label ?? "").trim();
    if (!label) continue;
    const amount = Number(rec.amountMinor ?? rec.amount_minor ?? 0);
    out.push({
      label: label.slice(0, 120),
      amountMinor: Number.isFinite(amount) ? Math.round(amount) : 0,
    });
  }
  return out;
}
