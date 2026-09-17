"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Edit, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  setShippingRateActive,
  upsertShippingRate,
  type ShippingRateInput,
} from "@/lib/actions/logistics-reference";
import type {
  MissingRateCard,
  ShippingRateRow,
  ShippingMethodDb,
} from "@/lib/queries/logistics-reference";

const SHIPPING_METHODS: ShippingMethodDb[] = [
  "platform_express",
  "platform_freight",
  "platform_standard",
  "platform_cold_chain",
  "supplier_self",
  "buyer_pickup",
  "third_party",
];

// Which product `shipping_mode` values land on each method — shown in the
// form so ops can tell which listings a card will actually price.
const METHOD_HINT: Partial<Record<ShippingMethodDb, string>> = {
  platform_express: "air, air_express",
  platform_freight: "sea_lcl, sea_fcl, ocean_lcl, ocean_fcl",
  platform_cold_chain: "cold_chain, refrigerated",
  platform_standard: "anything else / unset",
};

type Form = ShippingRateInput;

const EMPTY: Form = {
  originCountry: "",
  shippingMethod: "platform_express",
  baseRate: 0,
  perKgRate: 0,
  perCbmRate: 0,
  minCharge: 0,
  minChargeableKg: 0,
  roundUpChargeableKg: false,
  reboxFeePerCarton: 0,
  cartonVolumeCbm: null,
  documentationFee: 0,
  freeShippingThreshold: null,
  currency: "USD",
  isActive: true,
};

const fmtMinor = (n: number | null | undefined, ccy: string) =>
  `${((n ?? 0) / 100).toFixed(2)} ${ccy}`;

export function ShippingRatesManager({
  initialRates,
  missingRateCards,
}: {
  initialRates: ShippingRateRow[];
  missingRateCards: MissingRateCard[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () =>
      [...initialRates].sort(
        (a, b) =>
          (a.origin_country ?? "").localeCompare(b.origin_country ?? "") ||
          a.shipping_method.localeCompare(b.shipping_method)
      ),
    [initialRates]
  );

  function openCreate(prefill?: MissingRateCard) {
    setForm(
      prefill
        ? { ...EMPTY, originCountry: prefill.originCountry, shippingMethod: prefill.shippingMethod }
        : EMPTY
    );
    setOpen(true);
  }

  function openEdit(r: ShippingRateRow) {
    setForm({
      id: r.id,
      originCountry: r.origin_country ?? "",
      shippingMethod: r.shipping_method,
      baseRate: r.base_rate ?? 0,
      perKgRate: r.per_kg_rate ?? 0,
      perCbmRate: r.per_cbm_rate ?? 0,
      minCharge: r.min_charge ?? 0,
      minChargeableKg: r.min_chargeable_kg ?? 0,
      roundUpChargeableKg: r.round_up_chargeable_kg ?? false,
      reboxFeePerCarton: r.rebox_fee_per_carton ?? 0,
      cartonVolumeCbm: r.carton_volume_cbm,
      documentationFee: r.documentation_fee ?? 0,
      freeShippingThreshold: r.free_shipping_threshold,
      currency: r.currency ?? "USD",
      estimatedDaysMin: r.estimated_days_min,
      estimatedDaysMax: r.estimated_days_max,
      notes: r.notes ?? "",
      isActive: r.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertShippingRate(form);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Rate card updated" : "Rate card created");
      setOpen(false);
    });
  }

  function toggleActive(r: ShippingRateRow) {
    startTransition(async () => {
      const next = !(r.is_active ?? true);
      const res = await setShippingRateActive(r.id, next);
      if (!res.success) toast.error(res.error);
      else toast.success(next ? "Activated" : "Deactivated");
    });
  }

  const ccy = form.currency ?? "USD";

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Checkout prices freight <strong>only</strong> from these cards — there is no fallback rate.
        A lane with no active card is blocked at checkout until ops enters the forwarder quote here.
      </div>

      {missingRateCards.length > 0 && (
        <div className="rounded-md border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-[var(--amber-dark)]"
              aria-hidden
            />
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {missingRateCards.length} lane{missingRateCards.length === 1 ? "" : "s"} have live
                products but no rate card — buyers cannot check these out.
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRateCards.map((m) => (
                  <Button
                    key={`${m.originCountry}-${m.shippingMethod}`}
                    variant="outline"
                    size="sm"
                    onClick={() => openCreate(m)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    {m.originCountry} · {m.shippingMethod.replace(/^platform_/, "")} (
                    {m.productCount} product{m.productCount === 1 ? "" : "s"})
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="ml-auto" />
        <Button onClick={() => openCreate()} size="sm">
          <Plus className="mr-1 size-4" /> Add rate card
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Origin</th>
              <th className="px-3 py-2 text-left">Method</th>
              <th className="px-3 py-2 text-right">Freight</th>
              <th className="px-3 py-2 text-right">Min weight</th>
              <th className="px-3 py-2 text-right">Rebox</th>
              <th className="px-3 py-2 text-right">Docs</th>
              <th className="px-3 py-2 text-left">Free over</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const rowCcy = r.currency ?? "USD";
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.origin_country ?? (
                      <span className="text-muted-foreground">all origins</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.shipping_method.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {rateSummary(r, rowCcy)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {(r.min_chargeable_kg ?? 0) > 0 ? `${r.min_chargeable_kg} kg` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {(r.rebox_fee_per_carton ?? 0) > 0
                      ? `${fmtMinor(r.rebox_fee_per_carton, rowCcy)} / ${r.carton_volume_cbm} CBM`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {(r.documentation_fee ?? 0) > 0 ? fmtMinor(r.documentation_fee, rowCcy) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.free_shipping_threshold == null ? (
                      <span className="text-muted-foreground">never</span>
                    ) : (
                      fmtMinor(r.free_shipping_threshold, rowCcy)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {(r.is_active ?? true) ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(r)}
                      disabled={pending}
                    >
                      {(r.is_active ?? true) ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  No rate cards yet — checkout is blocked for every lane until one is added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit rate card" : "Add rate card"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Origin country"
              hint="Blank = global default for origins without their own card"
            >
              <Input
                value={form.originCountry ?? ""}
                onChange={(e) => setForm({ ...form, originCountry: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="TW"
              />
            </Field>
            <Field label="Shipping method" hint={METHOD_HINT[form.shippingMethod]}>
              <Select
                value={form.shippingMethod}
                onValueChange={(v) => setForm({ ...form, shippingMethod: v as ShippingMethodDb })}
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
            </Field>

            <MoneyField
              label="Per kg (air)"
              value={form.perKgRate ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, perKgRate: v })}
            />
            <MoneyField
              label="Per CBM (sea/LCL)"
              value={form.perCbmRate ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, perCbmRate: v })}
            />
            <MoneyField
              label="Base rate (flat)"
              value={form.baseRate ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, baseRate: v })}
            />
            <MoneyField
              label="Min charge"
              value={form.minCharge ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, minCharge: v })}
            />

            <Field label="Min chargeable weight (kg)" hint="Carrier minimum, e.g. air MIN 100 KG">
              <Input
                type="number"
                step="0.01"
                value={form.minChargeableKg ?? 0}
                onChange={(e) => setForm({ ...form, minChargeableKg: Number(e.target.value) })}
              />
            </Field>
            <Field label="Round weight up" hint="Air freight bills whole kg">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.roundUpChargeableKg ?? false}
                  onChange={(e) => setForm({ ...form, roundUpChargeableKg: e.target.checked })}
                />
                Round chargeable weight up
              </label>
            </Field>

            <MoneyField
              label="Rebox fee per carton"
              value={form.reboxFeePerCarton ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, reboxFeePerCarton: v })}
            />
            <Field
              label="Carton volume (CBM)"
              hint="e.g. 60×50×40 cm = 0.12 — required if rebox > 0"
            >
              <Input
                type="number"
                step="0.0001"
                value={form.cartonVolumeCbm ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cartonVolumeCbm: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="0.12"
              />
            </Field>

            <MoneyField
              label="Documentation fee (per shipment)"
              value={form.documentationFee ?? 0}
              ccy={ccy}
              onChange={(v) => setForm({ ...form, documentationFee: v })}
            />
            <Field label="Free shipping over (cents)" hint="Blank = freight is never waived">
              <Input
                type="number"
                value={form.freeShippingThreshold ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    freeShippingThreshold: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="(never)"
              />
            </Field>

            <Field label="Currency">
              <Input
                value={form.currency ?? "USD"}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                maxLength={3}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Transit min (days)">
                <Input
                  type="number"
                  value={form.estimatedDaysMin ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimatedDaysMin: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>
              <Field label="Transit max (days)">
                <Input
                  type="number"
                  value={form.estimatedDaysMax ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimatedDaysMax: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Notes / quote reference" className="col-span-2">
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Forwarder quote ref, validity, what the rate covers…"
              />
            </Field>

            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              {form.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function rateSummary(r: ShippingRateRow, ccy: string): string {
  if ((r.per_kg_rate ?? 0) > 0) return `${fmtMinor(r.per_kg_rate, ccy)} / kg`;
  if ((r.per_cbm_rate ?? 0) > 0) return `${fmtMinor(r.per_cbm_rate, ccy)} / CBM`;
  return `${fmtMinor(r.base_rate, ccy)} flat`;
}

/** Money entry in minor units, with a live major-unit echo so $15.00 vs 1500 is unambiguous. */
function MoneyField({
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
    <Field label={`${label} (cents)`} hint={`= ${fmtMinor(value, ccy)}`}>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function Field({
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
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
