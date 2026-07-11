"use client";

import { useState } from "react";
import { Ship, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";

interface CostComponent {
  amountMinor: number;
  includedInQuote: boolean;
  notes?: string;
}

export interface TariffMatchInfo {
  hsCode: string;
  matchedPrefix?: string;
  destinationCountry: string;
  dutyPct: number;
  vatPct: number;
  excisePct: number;
  otherFeesPct?: Record<string, number>;
  preferentialRatePct?: number;
  preferentialOriginCountries?: string[];
}

export interface LandedCostSnapshot {
  currency: string;
  goods: CostComponent;
  firstMile: CostComponent;
  mainLeg: CostComponent;
  insurance: CostComponent;
  duty: CostComponent;
  vat: CostComponent;
  excise: CostComponent;
  otherFees: CostComponent;
  lastMile: CostComponent;
  handling: CostComponent;
  totalMinor: number;
  tariffMatches?: TariffMatchInfo[];
  warnings?: string[];
}

interface LandedCostBreakdownProps {
  snapshot: LandedCostSnapshot | null;
  status: string;
  computedAt: string | null;
  supplierAmountMinor: number;
  currency: string;
}

function fmt(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

const COMPONENT_LABELS: [
  keyof Omit<LandedCostSnapshot, "currency" | "totalMinor" | "warnings" | "tariffMatches">,
  string,
][] = [
  ["goods", "Goods (supplier quote)"],
  ["firstMile", "Origin handling"],
  ["mainLeg", "Freight"],
  ["insurance", "Insurance"],
  ["duty", "Import duty"],
  ["vat", "VAT"],
  ["excise", "Excise"],
  ["otherFees", "Other import fees"],
  ["lastMile", "Destination handling"],
  ["handling", "Platform handling"],
];

/**
 * Total-landed-cost card shown on each supplier quotation so buyers
 * compare full door cost — supplier price + freight + duties — before
 * awarding. Always labelled as a point-in-time estimate.
 */
export function LandedCostBreakdown({
  snapshot,
  status,
  computedAt,
  supplierAmountMinor,
  currency,
}: LandedCostBreakdownProps) {
  const [open, setOpen] = useState(false);

  if (status === "pending_data" || (!snapshot && status !== "none")) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-3 py-2">
        <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <p className="text-xs text-[var(--text-secondary)]">
          Freight estimate pending — our logistics team is preparing landed cost for this quote.
        </p>
      </div>
    );
  }

  if (!snapshot) return null;

  const freightAndDuties = snapshot.totalMinor - supplierAmountMinor;

  return (
    <div className="rounded-lg border border-[var(--amber)]/30 bg-[var(--amber)]/5 px-3 py-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <Ship className="w-3.5 h-3.5 text-[var(--amber)]" />
          Estimated total landed cost
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
        <span className="text-sm font-bold text-[var(--obsidian)]">
          {fmt(snapshot.totalMinor, snapshot.currency)}
        </span>
      </button>

      {!open && freightAndDuties > 0 && (
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          supplier price + {fmt(freightAndDuties, snapshot.currency)} freight, duties & fees
        </p>
      )}

      {open && (
        <div className="mt-2 space-y-1">
          {COMPONENT_LABELS.map(([key, label]) => {
            const component = snapshot[key];
            if (!component || component.amountMinor === 0) return null;
            return (
              <div key={key} className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-tertiary)]">{label}</span>
                <span className="text-[var(--text-secondary)] font-medium">
                  {fmt(component.amountMinor, snapshot.currency)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--amber)]/20">
            <span className="font-semibold text-[var(--text-primary)]">Total landed</span>
            <span className="font-bold text-[var(--obsidian)]">
              {fmt(snapshot.totalMinor, snapshot.currency)}
            </span>
          </div>
          {/* Tariff estimates — the duty/VAT rates behind the amounts above */}
          {snapshot.tariffMatches && snapshot.tariffMatches.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-[var(--amber)]/20 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Tariff estimates ({snapshot.tariffMatches[0].destinationCountry} import)
              </p>
              {snapshot.tariffMatches.map((t, i) => {
                const otherPct = Object.values(t.otherFeesPct ?? {}).reduce((s, v) => s + v, 0);
                return (
                  <div key={`${t.hsCode}-${i}`} className="text-[11px] text-[var(--text-secondary)]">
                    <span className="font-mono text-[var(--text-tertiary)]">HS {t.hsCode}</span>
                    {" — "}
                    duty {t.dutyPct}% · VAT {t.vatPct}%
                    {t.excisePct > 0 && ` · excise ${t.excisePct}%`}
                    {otherPct > 0 && ` · other fees ${otherPct.toFixed(1)}%`}
                    {t.preferentialRatePct != null && (
                      <span className="text-emerald-600">
                        {" "}· preferential {t.preferentialRatePct}% may apply
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {snapshot.warnings && snapshot.warnings.length > 0 && (
            <div className="flex items-start gap-1.5 pt-1">
              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-700">{snapshot.warnings.join(" · ")}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
        Estimate as of {computedAt ? new Date(computedAt).toLocaleDateString() : "—"} — not a
        contractual price. {currency !== snapshot.currency ? `Shown in ${snapshot.currency}.` : ""}
      </p>
    </div>
  );
}
