"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRfqShippingContext,
  reopenRfqShippingConfirmation,
  saveRfqShippingConfirmation,
} from "@/lib/actions/rfq-shipping";
import { computeRfqFreight, type RfqExpenseLine } from "@/lib/logistics/rates/rfq-freight";
import type { ShippingMethodDb } from "@/lib/queries/logistics-reference";

const SHIPPING_METHODS: ShippingMethodDb[] = [
  "platform_express",
  "platform_freight",
  "platform_standard",
  "platform_cold_chain",
  "supplier_self",
  "buyer_pickup",
  "third_party",
];

interface FormState {
  originCountry: string;
  destinationCountry: string;
  shippingMethod: ShippingMethodDb;
  forwarder: string;
  quoteReference: string;
  quoteReceivedAt: string;
  validUntil: string;
  chargeableWeightKg: number;
  volumeCbm: number;
  cartonCount: number;
  perKgRate: number;
  perCbmRate: number;
  minChargeableKg: number;
  reboxFeePerCarton: number;
  documentationFee: number;
  expenses: RfqExpenseLine[];
  currency: string;
  notes: string;
}

const EMPTY: FormState = {
  originCountry: "",
  destinationCountry: "",
  shippingMethod: "platform_express",
  forwarder: "",
  quoteReference: "",
  quoteReceivedAt: "",
  validUntil: "",
  chargeableWeightKg: 0,
  volumeCbm: 0,
  cartonCount: 0,
  perKgRate: 0,
  perCbmRate: 0,
  minChargeableKg: 0,
  reboxFeePerCarton: 0,
  documentationFee: 0,
  expenses: [],
  currency: "USD",
  notes: "",
};

const money = (minor: number, ccy: string) =>
  `${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${ccy}`;

export function RfqShippingConfirmForm({ rfqId }: { rfqId: string }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [sourceRateId, setSourceRateId] = useState<string | null>(null);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [pending, startTransition] = useTransition();

  // Deliberately does no synchronous setState — `loading` starts true and the
  // mount effect calls straight into the await, so nothing sets state during
  // the effect body. Re-loads after a save keep the form on screen; the
  // buttons show their own pending state.
  const load = useCallback(async () => {
    const res = await getRfqShippingContext(rfqId);
    if (!res.success) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const { confirmation, suggestedRate, originCountry, destinationCountry } = res.data!;

    if (confirmation) {
      const stored = Array.isArray(confirmation.expenses)
        ? (confirmation.expenses as { label?: string; amount_minor?: number }[])
        : [];
      setForm({
        originCountry: confirmation.origin_country ?? originCountry ?? "",
        destinationCountry: confirmation.destination_country ?? destinationCountry ?? "",
        shippingMethod: confirmation.shipping_method,
        forwarder: confirmation.forwarder ?? "",
        quoteReference: confirmation.quote_reference ?? "",
        quoteReceivedAt: confirmation.quote_received_at ?? "",
        validUntil: confirmation.valid_until ?? "",
        chargeableWeightKg: Number(confirmation.chargeable_weight_kg ?? 0),
        volumeCbm: Number(confirmation.volume_cbm ?? 0),
        cartonCount: confirmation.carton_count ?? 0,
        perKgRate: confirmation.per_kg_rate ?? 0,
        perCbmRate: confirmation.per_cbm_rate ?? 0,
        minChargeableKg: Number(confirmation.min_chargeable_kg ?? 0),
        reboxFeePerCarton: confirmation.rebox_fee_per_carton ?? 0,
        documentationFee: confirmation.documentation_fee ?? 0,
        expenses: stored.map((e) => ({
          label: String(e.label ?? ""),
          amountMinor: Number(e.amount_minor ?? 0),
        })),
        currency: confirmation.currency ?? "USD",
        notes: confirmation.notes ?? "",
      });
      setStatus(confirmation.status);
      setConfirmedAt(confirmation.confirmed_at);
      setSourceRateId(confirmation.source_shipping_rate_id);
      setPrefillNote(null);
    } else if (suggestedRate) {
      // First time on this RFQ — start from the standing rate card so ops
      // only has to adjust what the forwarder actually quoted.
      setForm({
        ...EMPTY,
        originCountry: originCountry ?? "",
        destinationCountry: destinationCountry ?? "",
        shippingMethod: suggestedRate.shipping_method,
        perKgRate: suggestedRate.per_kg_rate ?? 0,
        perCbmRate: suggestedRate.per_cbm_rate ?? 0,
        minChargeableKg: Number(suggestedRate.min_chargeable_kg ?? 0),
        reboxFeePerCarton: suggestedRate.rebox_fee_per_carton ?? 0,
        documentationFee: suggestedRate.documentation_fee ?? 0,
        currency: suggestedRate.currency ?? "USD",
      });
      setSourceRateId(suggestedRate.id);
      setPrefillNote(
        `Prefilled from the ${originCountry} ${suggestedRate.shipping_method.replace(/^platform_/, "")} rate card — adjust to the forwarder quote.`
      );
      setStatus("draft");
      setConfirmedAt(null);
    } else {
      setForm({
        ...EMPTY,
        originCountry: originCountry ?? "",
        destinationCountry: destinationCountry ?? "",
      });
      setSourceRateId(null);
      setPrefillNote(
        originCountry
          ? `No rate card for ${originCountry} yet — enter the forwarder quote here, and add the standing card under Logistics → Reference data.`
          : "Enter the forwarder quote for this RFQ."
      );
      setStatus("draft");
      setConfirmedAt(null);
    }
    setLoading(false);
  }, [rfqId]);

  // Fetching the confirmation is exactly the "subscribe to an external system"
  // case an effect is for; the state it sets lands after the await, not during
  // the effect body. Same pattern as admin/system/page.tsx.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totals = computeRfqFreight({ ...form });
  const ccy = form.currency || "USD";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addExpense() {
    set("expenses", [...form.expenses, { label: "", amountMinor: 0 }]);
  }

  function updateExpense(i: number, patch: Partial<RfqExpenseLine>) {
    set(
      "expenses",
      form.expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e))
    );
  }

  function removeExpense(i: number) {
    set(
      "expenses",
      form.expenses.filter((_, idx) => idx !== i)
    );
  }

  function save(confirm: boolean) {
    startTransition(async () => {
      const res = await saveRfqShippingConfirmation({
        rfqId,
        ...form,
        sourceShippingRateId: sourceRateId,
        confirm,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(confirm ? "Shipping rates confirmed" : "Draft saved");
      await load();
    });
  }

  function reopen() {
    startTransition(async () => {
      const res = await reopenRfqShippingConfirmation(rfqId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Reopened for editing");
      await load();
    });
  }

  if (forbidden) return null;

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-6 text-sm text-[var(--text-tertiary)]"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Loader2 className="size-4 animate-spin" /> Loading shipping…
      </div>
    );
  }

  const locked = status === "confirmed";

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-primary)" }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Truck className="size-4 text-[var(--text-tertiary)]" aria-hidden />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Shipping rates &amp; expenses
        </h2>
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">
            <CheckCircle2 className="size-3" /> Confirmed
          </span>
        ) : (
          <span className="rounded-full bg-[var(--amber)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--amber-dark)]">
            Draft
          </span>
        )}
        {locked && confirmedAt && (
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {new Date(confirmedAt).toLocaleString()}
          </span>
        )}
      </div>

      {prefillNote && !locked && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-[var(--surface-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--amber-dark)]" aria-hidden />
          {prefillNote}
        </p>
      )}

      <fieldset disabled={locked || pending} className="space-y-4">
        {/* Forwarder quote */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <F label="Forwarder">
            <Input
              value={form.forwarder}
              onChange={(e) => set("forwarder", e.target.value)}
              placeholder="JEFAE / DHL…"
            />
          </F>
          <F label="Quote ref">
            <Input
              value={form.quoteReference}
              onChange={(e) => set("quoteReference", e.target.value)}
            />
          </F>
          <F label="Quote received">
            <Input
              type="date"
              value={form.quoteReceivedAt}
              onChange={(e) => set("quoteReceivedAt", e.target.value)}
            />
          </F>
          <F label="Valid until">
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
            />
          </F>
        </div>

        {/* Routing */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <F label="Origin">
            <Input
              value={form.originCountry}
              maxLength={2}
              placeholder="TW"
              onChange={(e) => set("originCountry", e.target.value.toUpperCase())}
            />
          </F>
          <F label="Destination">
            <Input
              value={form.destinationCountry}
              maxLength={2}
              placeholder="RW"
              onChange={(e) => set("destinationCountry", e.target.value.toUpperCase())}
            />
          </F>
          <F label="Method" className="md:col-span-2">
            <Select
              value={form.shippingMethod}
              onValueChange={(v) => set("shippingMethod", v as ShippingMethodDb)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
        </div>

        {/* Cargo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <F label="Chargeable weight (kg)">
            <Input
              type="number"
              step="0.01"
              value={form.chargeableWeightKg}
              onChange={(e) => set("chargeableWeightKg", Number(e.target.value))}
            />
          </F>
          <F label="Volume (CBM)">
            <Input
              type="number"
              step="0.0001"
              value={form.volumeCbm}
              onChange={(e) => set("volumeCbm", Number(e.target.value))}
            />
          </F>
          <F label="Cartons">
            <Input
              type="number"
              value={form.cartonCount}
              onChange={(e) => set("cartonCount", Number(e.target.value))}
            />
          </F>
          <F label="Min chargeable (kg)" hint="Carrier minimum">
            <Input
              type="number"
              step="0.01"
              value={form.minChargeableKg}
              onChange={(e) => set("minChargeableKg", Number(e.target.value))}
            />
          </F>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <M label="Per kg" value={form.perKgRate} ccy={ccy} onChange={(v) => set("perKgRate", v)} />
          <M
            label="Per CBM"
            value={form.perCbmRate}
            ccy={ccy}
            onChange={(v) => set("perCbmRate", v)}
          />
          <M
            label="Rebox / carton"
            value={form.reboxFeePerCarton}
            ccy={ccy}
            onChange={(v) => set("reboxFeePerCarton", v)}
          />
          <M
            label="Documentation"
            value={form.documentationFee}
            ccy={ccy}
            onChange={(v) => set("documentationFee", v)}
          />
        </div>

        {/* Expenses */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs">Additional expenses</Label>
            <Button type="button" variant="outline" size="sm" onClick={addExpense}>
              <Plus className="mr-1 size-3.5" /> Add expense
            </Button>
          </div>
          {form.expenses.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">
              None. Add customs inspection, storage, trucking, insurance… as separate lines.
            </p>
          ) : (
            <div className="space-y-2">
              {form.expenses.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={e.label}
                    placeholder="Customs inspection"
                    onChange={(ev) => updateExpense(i, { label: ev.target.value })}
                  />
                  <div className="w-36">
                    <Input
                      type="number"
                      value={e.amountMinor}
                      onChange={(ev) => updateExpense(i, { amountMinor: Number(ev.target.value) })}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-[var(--text-tertiary)]">
                    {money(e.amountMinor || 0, ccy)}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExpense(i)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <F label="Notes">
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What the rate covers, exclusions, assumptions…"
          />
        </F>
      </fieldset>

      {/* Totals — the same computation the server re-runs on save */}
      <dl className="mt-4 space-y-1.5 rounded-lg bg-[var(--surface-secondary)] p-3 text-xs">
        <Row
          label={`Freight — ${totals.chargeableWeightKg} kg chargeable`}
          value={money(totals.weightCharge, ccy)}
        />
        {totals.volumeCharge > 0 && (
          <Row label="Volume" value={money(totals.volumeCharge, ccy)} />
        )}
        {totals.reboxCharge > 0 && (
          <Row
            label={`Rebox — ${form.cartonCount} carton${form.cartonCount === 1 ? "" : "s"}`}
            value={money(totals.reboxCharge, ccy)}
          />
        )}
        {totals.documentationFee > 0 && (
          <Row label="Documentation" value={money(totals.documentationFee, ccy)} />
        )}
        {totals.expensesTotal !== 0 && (
          <Row label="Additional expenses" value={money(totals.expensesTotal, ccy)} />
        )}
        <div className="border-t pt-1.5" style={{ borderColor: "var(--border-subtle)" }}>
          <Row label="Total" value={money(totals.total, ccy)} strong />
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        {locked ? (
          <Button variant="outline" size="sm" onClick={reopen} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 size-4" />
            )}
            Reopen for editing
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => save(false)} disabled={pending}>
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button size="sm" onClick={() => save(true)} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 size-4" />
              )}
              Confirm rates &amp; expenses
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
        {label}
      </dt>
      <dd
        className={`font-mono ${strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function M({
  label,
  value,
  ccy,
  onChange,
}: {
  label: string;
  value: number;
  ccy: string;
  onChange: (v: number) => void;
}) {
  return (
    <F label={`${label} (cents)`} hint={`= ${money(value || 0, ccy)}`}>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </F>
  );
}

function F({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}
