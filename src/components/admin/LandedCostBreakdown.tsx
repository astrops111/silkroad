import { AlertTriangle, EyeOff, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  CostBreakdown,
  CostComponent,
  TradeTerm,
} from "@/lib/logistics/landed-cost";

// Internal-only: render this under (protected)/admin/* surfaces, never on
// buyer-facing pages. The full component breakdown is for ops eyes only;
// buyers see the rolled-up `totalMinor` as their final price.

type Props = {
  breakdown: CostBreakdown;
  className?: string;
  // Show line items even when the seller's incoterm doesn't include them.
  // Default true — ops want full visibility into the cost structure.
  showOutOfScope?: boolean;
};

const ROW_ORDER: Array<{ key: keyof CostBreakdown; label: string; hint?: string }> = [
  { key: "goods",      label: "Goods (supplier cost)" },
  { key: "firstMile",  label: "First mile",   hint: "Origin handling, export clearance, port of loading" },
  { key: "mainLeg",    label: "Main leg",     hint: "Ocean / air freight + fuel surcharge" },
  { key: "insurance",  label: "Insurance",    hint: "Marine cargo cover, 110% CIF basis" },
  { key: "duty",       label: "Duty",         hint: "Import duty per HS classification" },
  { key: "vat",        label: "VAT / GST",    hint: "Levied on CIF + duty" },
  { key: "excise",     label: "Excise" },
  { key: "otherFees",  label: "Other fees",   hint: "IDF, RDL, port levies, etc." },
  { key: "lastMile",   label: "Last mile",    hint: "Port of discharge + inland to door" },
  { key: "handling",   label: "Platform handling" },
];

export function LandedCostBreakdown({ breakdown, className, showOutOfScope = true }: Props) {
  const fmt = (minor: number) => formatMinor(minor, breakdown.currency);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Landed cost breakdown</CardTitle>
            <CardDescription>
              <span className="uppercase">{breakdown.incoterm}</span>
              {" · "}
              {humanContainer(breakdown.containerType)}
              {" · "}
              {breakdown.shippingMethod.replace(/_/g, " ")}
              {breakdown.laneId ? ` · lane ${breakdown.laneId}` : ""}
            </CardDescription>
          </div>
          <Badge variant="secondary">Internal — ops view</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {breakdown.warnings.length > 0 && (
          <ul className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            {breakdown.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {ROW_ORDER.map(({ key, label, hint }) => {
                const c = breakdown[key] as CostComponent;
                if (!showOutOfScope && !c.includedInQuote) return null;
                const dim = !c.includedInQuote;
                return (
                  <tr key={key} className={cn("border-t first:border-t-0", dim && "text-muted-foreground")}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{label}</span>
                        {dim && (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="size-3" />
                            buyer pays
                          </Badge>
                        )}
                      </div>
                      {hint && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Info className="size-3" />
                          {hint}
                        </div>
                      )}
                      {c.notes && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{c.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {fmt(c.amountMinor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Separator />

        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <SummaryRow label="Subtotal — full landed (all components)" value={fmt(breakdown.subtotalLandedMinor)} muted />
          <SummaryRow label={`Quoted subtotal (${incotermScopeLabel(breakdown.incoterm)})`} value={fmt(breakdown.quotedSubtotalMinor)} />
          <SummaryRow label={`Platform markup (${(breakdown.markupMultiplier * 100 - 100).toFixed(0)}%)`} value={fmt(breakdown.markupMinor)} />
          <SummaryRow label="Total to buyer / requester" value={fmt(breakdown.totalMinor)} bold />
        </dl>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
          <Stat label="Quantity" value={breakdown.totals.quantity.toLocaleString()} />
          <Stat label="Weight" value={`${breakdown.totals.weightKg.toLocaleString()} kg`} />
          <Stat label="Volume" value={`${breakdown.totals.volumeCbm.toLocaleString()} CBM`} />
          <Stat label="Containers" value={String(breakdown.totals.containerCount)} />
        </div>

        {breakdown.tariffMatches.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tariff matches
            </div>
            <ul className="space-y-1 text-xs">
              {breakdown.tariffMatches.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="font-mono">{t.hsCode}</span>
                  <span className="text-muted-foreground">
                    matched prefix <span className="font-mono">{t.matchedPrefix}</span> → {t.destinationCountry}
                  </span>
                  <span>duty {t.dutyPct}%</span>
                  <span>VAT {t.vatPct}%</span>
                  {t.excisePct > 0 && <span>excise {t.excisePct}%</span>}
                  {t.preferentialRatePct !== undefined && (
                    <Badge variant="secondary" className="text-[10px]">FTA {t.preferentialRatePct}%</Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-right text-[11px] text-muted-foreground">
          engine {breakdown.source} · computed {new Date(breakdown.computedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 sm:col-span-2", muted && "text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className={cn("font-mono tabular-nums", bold && "text-base font-semibold")}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase tracking-wide">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function formatMinor(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

function humanContainer(c: string): string {
  switch (c) {
    case "lcl": return "LCL";
    case "fcl_20": return "20ft FCL";
    case "fcl_40": return "40ft FCL";
    case "fcl_40hc": return "40ft HC FCL";
    case "fcl_45": return "45ft FCL";
    case "air_express": return "Air express";
    case "air_freight": return "Air freight";
    default: return c;
  }
}

function incotermScopeLabel(t: TradeTerm): string {
  switch (t) {
    case "exw": return "goods + handling only";
    case "fca":
    case "fob": return "through origin port";
    case "cpt": return "through main leg";
    case "cif": return "through main leg + insurance";
    case "dap": return "delivered, buyer pays duties";
    case "ddp": return "fully landed";
  }
}
