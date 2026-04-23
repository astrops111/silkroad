"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addCostActual, deleteCostActual } from "@/lib/actions/cost-actuals";
import type {
  ShipmentCostActualRow,
  ShipmentCostCategory,
} from "@/lib/queries/cost-actuals";

const CATEGORIES: ShipmentCostCategory[] = [
  "freight", "fuel", "thc", "customs_duty", "customs_vat", "customs_other",
  "insurance", "first_mile", "last_mile", "handling", "demurrage", "detention", "docs", "other",
];

interface Props {
  shipmentId: string;
  shipmentCurrency: string;
  quotedTotalMinor: number | null;
  actualTotalMinor: number | null;
  costVarianceMinor: number | null;
  initialActuals: ShipmentCostActualRow[];
}

export function CostActualsPanel({
  shipmentId,
  shipmentCurrency,
  quotedTotalMinor,
  actualTotalMinor,
  costVarianceMinor,
  initialActuals,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startMutation] = useTransition();
  const [form, setForm] = useState({
    category: "freight" as ShipmentCostCategory,
    vendor: "",
    invoiceRef: "",
    invoiceDate: "",
    amountMajor: "",
    currency: shipmentCurrency,
    notes: "",
    attachmentUrl: "",
  });

  function reset() {
    setForm({
      category: "freight",
      vendor: "",
      invoiceRef: "",
      invoiceDate: "",
      amountMajor: "",
      currency: shipmentCurrency,
      notes: "",
      attachmentUrl: "",
    });
  }

  function submit() {
    const amountMinor = Math.round(Number(form.amountMajor) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    startMutation(async () => {
      const res = await addCostActual({
        shipmentId,
        category: form.category,
        vendor: form.vendor || undefined,
        invoiceRef: form.invoiceRef || undefined,
        invoiceDate: form.invoiceDate || undefined,
        amountMinor,
        currency: form.currency,
        notes: form.notes || undefined,
        attachmentUrl: form.attachmentUrl || undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Cost line added");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this cost line?")) return;
    startMutation(async () => {
      const res = await deleteCostActual(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed");
      router.refresh();
    });
  }

  const variancePct =
    costVarianceMinor != null && quotedTotalMinor && quotedTotalMinor > 0
      ? (costVarianceMinor / quotedTotalMinor) * 100
      : null;
  const varianceTone =
    costVarianceMinor == null
      ? "outline"
      : costVarianceMinor > 0
        ? "destructive"
        : "default";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Quoted" value={fmt(quotedTotalMinor, shipmentCurrency)} />
        <Stat label="Actual" value={fmt(actualTotalMinor, shipmentCurrency)} />
        <div className="rounded-md border p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Variance</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-semibold tabular-nums">
              {fmt(costVarianceMinor, shipmentCurrency)}
            </span>
            {variancePct != null && (
              <Badge variant={varianceTone as "default" | "destructive" | "outline"}>
                {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {costVarianceMinor == null ? "Awaiting actuals" : costVarianceMinor > 0 ? "Over budget" : "Under budget"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span>Carrier / forwarder / customs invoice lines</span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1 size-3" /> Add line
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Vendor / invoice</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">FX→USD</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initialActuals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No invoice lines yet. Add one as carrier and customs invoices arrive.
                </td>
              </tr>
            ) : (
              initialActuals.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="px-3 py-2 text-xs">{line.category.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <div>{line.vendor ?? <span className="text-muted-foreground">—</span>}</div>
                    {line.invoice_ref && (
                      <div className="font-mono text-[10px] text-muted-foreground">{line.invoice_ref}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{line.invoice_date ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {(line.amount_minor / 100).toFixed(2)} {line.currency}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    {line.fx_rate_to_usd ? Number(line.fx_rate_to_usd).toFixed(4) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(line.id)} disabled={pending}>
                      <Trash2 className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add cost line</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as ShipmentCostCategory }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vendor">
              <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Maersk / DHL / KRA" />
            </Field>
            <Field label="Invoice ref">
              <Input value={form.invoiceRef} onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))} />
            </Field>
            <Field label="Invoice date">
              <Input type="date" value={form.invoiceDate} onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))} />
            </Field>
            <Field label={`Amount (${form.currency})`}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.amountMajor}
                onChange={(e) => setForm((f) => ({ ...f, amountMajor: e.target.value }))}
                placeholder="e.g. 2450.00"
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                maxLength={3}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Attachment URL (optional)">
                <Input
                  value={form.attachmentUrl}
                  onChange={(e) => setForm((f) => ({ ...f, attachmentUrl: e.target.value }))}
                  placeholder="https://… (paste invoice PDF link)"
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes">
                <textarea
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Save line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function fmt(minor: number | null, currency: string): string {
  if (minor == null) return "—";
  return `${(minor / 100).toFixed(2)} ${currency}`;
}
