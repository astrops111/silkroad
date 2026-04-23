"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Edit, Loader2, Plus } from "lucide-react";
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
  setTariffRateActive,
  upsertTariffRate,
  type TariffRateInput,
} from "@/lib/actions/logistics-reference";
import type { RateSource, TariffRateRowView } from "@/lib/queries/logistics-reference";

const SOURCES: RateSource[] = ["tariff_db", "tariff_api"];

type Form = TariffRateInput & {
  otherFeesText?: string;        // raw JSON in textarea
  preferentialOriginsText?: string; // comma-separated ISO-2 codes
};

const EMPTY: Form = {
  hsPrefix: "",
  destinationCountry: "",
  dutyPct: 0,
  vatPct: 0,
  excisePct: 0,
  source: "tariff_db",
  isActive: true,
  otherFeesText: "{}",
  preferentialOriginsText: "",
};

export function TariffRatesManager({
  initialTariffs,
  portCountries,
}: {
  initialTariffs: TariffRateRowView[];
  portCountries: string[];
}) {
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return initialTariffs.filter((t) => {
      if (filterCountry !== "all" && t.destination_country !== filterCountry) return false;
      if (query && !t.hs_prefix.toLowerCase().startsWith(query.toLowerCase())) return false;
      return true;
    });
  }, [initialTariffs, filterCountry, query]);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(t: TariffRateRowView) {
    setForm({
      id: t.id,
      hsPrefix: t.hs_prefix,
      destinationCountry: t.destination_country,
      dutyPct: t.duty_pct ?? 0,
      vatPct: t.vat_pct ?? 0,
      excisePct: t.excise_pct ?? 0,
      otherFees: t.other_fees ?? {},
      otherFeesText: JSON.stringify(t.other_fees ?? {}, null, 2),
      preferentialRatePct: t.preferential_rate_pct ?? undefined,
      preferentialOriginCountries: t.preferential_origin_countries ?? undefined,
      preferentialOriginsText: (t.preferential_origin_countries ?? []).join(", "),
      notes: t.notes ?? "",
      source: t.source,
      provider: t.provider ?? "",
      effectiveFrom: t.effective_from ?? "",
      effectiveTo: t.effective_to ?? "",
      isActive: t.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    let otherFees: Record<string, number> = {};
    try {
      otherFees = JSON.parse(form.otherFeesText || "{}");
      if (typeof otherFees !== "object" || Array.isArray(otherFees)) throw new Error("must be object");
    } catch (e) {
      toast.error(`Other fees must be valid JSON object: ${(e as Error).message}`);
      return;
    }
    const prefOrigins = (form.preferentialOriginsText ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length === 2);

    startTransition(async () => {
      const res = await upsertTariffRate({
        ...form,
        otherFees,
        preferentialOriginCountries: prefOrigins.length > 0 ? prefOrigins : undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Tariff updated" : "Tariff created");
      setOpen(false);
    });
  }

  function toggleActive(t: TariffRateRowView) {
    startTransition(async () => {
      const res = await setTariffRateActive(t.id, !(t.is_active ?? true));
      if (!res.success) toast.error(res.error);
      else toast.success((t.is_active ?? true) ? "Deactivated" : "Activated");
    });
  }

  const countries = useMemo(() => {
    const set = new Set<string>(portCountries);
    for (const t of initialTariffs) set.add(t.destination_country);
    return [...set].sort();
  }, [initialTariffs, portCountries]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="HS prefix starts with…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto" />
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Add tariff
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">HS prefix</th>
              <th className="px-3 py-2 text-left">Dest</th>
              <th className="px-3 py-2 text-right">Duty</th>
              <th className="px-3 py-2 text-right">VAT</th>
              <th className="px-3 py-2 text-right">Excise</th>
              <th className="px-3 py-2 text-left">Other fees</th>
              <th className="px-3 py-2 text-left">FTA</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-mono">{t.hs_prefix}</td>
                <td className="px-3 py-2">{t.destination_country}</td>
                <td className="px-3 py-2 text-right">{t.duty_pct}%</td>
                <td className="px-3 py-2 text-right">{t.vat_pct}%</td>
                <td className="px-3 py-2 text-right">{t.excise_pct}%</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {t.other_fees && Object.keys(t.other_fees).length > 0
                    ? Object.entries(t.other_fees).map(([k, v]) => `${k}: ${v}%`).join(", ")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.preferential_rate_pct !== null
                    ? `${t.preferential_rate_pct}% (${(t.preferential_origin_countries ?? []).join(",")})`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{t.source.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">
                  {(t.is_active ?? true) ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(t)} disabled={pending}>
                    {(t.is_active ?? true) ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No tariffs match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit tariff rate" : "Add tariff rate"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="HS prefix (2/4/6/8/10 digits)">
              <Input value={form.hsPrefix} onChange={(e) => setForm({ ...form, hsPrefix: e.target.value })} placeholder="8517" />
            </Field>
            <Field label="Destination (ISO-2)">
              <Input
                value={form.destinationCountry}
                onChange={(e) => setForm({ ...form, destinationCountry: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="KE"
              />
            </Field>

            <Field label="Duty %">
              <Input type="number" step="0.01" value={form.dutyPct ?? 0} onChange={(e) => setForm({ ...form, dutyPct: Number(e.target.value) })} />
            </Field>
            <Field label="VAT %">
              <Input type="number" step="0.01" value={form.vatPct ?? 0} onChange={(e) => setForm({ ...form, vatPct: Number(e.target.value) })} />
            </Field>
            <Field label="Excise %">
              <Input type="number" step="0.01" value={form.excisePct ?? 0} onChange={(e) => setForm({ ...form, excisePct: Number(e.target.value) })} />
            </Field>

            <Field label="Source">
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as RateSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Other fees (JSON)" className="col-span-2">
              <textarea
                className="font-mono text-xs w-full rounded-md border bg-transparent px-3 py-2"
                rows={3}
                value={form.otherFeesText ?? "{}"}
                onChange={(e) => setForm({ ...form, otherFeesText: e.target.value })}
                placeholder='{"idf_pct": 2.5, "rdl_pct": 2.0}'
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Object of <code>fee_name: percent</code>. Applied on CIF base, summed into the otherFees component.
              </p>
            </Field>

            <Field label="Preferential rate %">
              <Input
                type="number"
                step="0.01"
                value={form.preferentialRatePct ?? ""}
                onChange={(e) => setForm({ ...form, preferentialRatePct: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="(none)"
              />
            </Field>
            <Field label="Preferential origins (ISO-2, comma-separated)">
              <Input
                value={form.preferentialOriginsText ?? ""}
                onChange={(e) => setForm({ ...form, preferentialOriginsText: e.target.value })}
                placeholder="CN, VN"
              />
            </Field>

            <Field label="Provider">
              <Input value={form.provider ?? ""} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="ops / Zonos / Avalara" />
            </Field>
            <Field label="Effective from">
              <Input type="date" value={form.effectiveFrom ?? ""} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </Field>
            <Field label="Effective to">
              <Input type="date" value={form.effectiveTo ?? ""} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
            </Field>

            <Field label="Notes" className="col-span-2">
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}
