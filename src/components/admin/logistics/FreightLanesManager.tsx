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
  setFreightLaneActive,
  upsertFreightLane,
  type FreightLaneInput,
} from "@/lib/actions/logistics-reference";
import { CarrierRateFetcher } from "./CarrierRateFetcher";
import type {
  ContainerType,
  FreightLaneRow,
  PortRow,
  RateSource,
  ShippingMethodDb,
} from "@/lib/queries/logistics-reference";

const CONTAINER_TYPES: ContainerType[] = [
  "lcl", "fcl_20", "fcl_40", "fcl_40hc", "fcl_45", "air_express", "air_freight",
];
const SHIPPING_METHODS: ShippingMethodDb[] = [
  "platform_freight", "platform_express", "platform_standard",
  "platform_cold_chain", "supplier_self", "buyer_pickup", "third_party",
];
const SOURCES: RateSource[] = ["manual_forwarder", "carrier_api", "rate_card"];

type Form = FreightLaneInput;

const EMPTY: Form = {
  shippingMethod: "platform_freight",
  containerType: "fcl_40",
  source: "manual_forwarder",
  currency: "USD",
  baseRate: 0,
  perContainerRate: 0,
  perCbmRate: 0,
  perKgRate: 0,
  minCharge: 0,
  fuelSurchargePct: 0,
  isActive: true,
};

const fmtMinor = (n: number, ccy: string) => `${(n / 100).toFixed(2)} ${ccy}`;

export function FreightLanesManager({
  initialLanes,
  ports,
}: {
  initialLanes: FreightLaneRow[];
  ports: PortRow[];
}) {
  const [filterContainer, setFilterContainer] = useState<ContainerType | "all">("all");
  const [filterMethod, setFilterMethod] = useState<ShippingMethodDb | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const portById = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);
  const originPorts = ports.filter((p) => p.is_origin);
  const destPorts = ports.filter((p) => p.is_destination);

  const filtered = useMemo(() => {
    return initialLanes.filter((l) => {
      if (filterContainer !== "all" && l.container_type !== filterContainer) return false;
      if (filterMethod !== "all" && l.shipping_method !== filterMethod) return false;
      return true;
    });
  }, [initialLanes, filterContainer, filterMethod]);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(l: FreightLaneRow) {
    setForm({
      id: l.id,
      originPortId: l.origin_port_id,
      originCountry: l.origin_country,
      destinationPortId: l.destination_port_id,
      destinationCountry: l.destination_country,
      shippingMethod: l.shipping_method,
      containerType: l.container_type,
      baseRate: l.base_rate ?? 0,
      perContainerRate: l.per_container_rate ?? 0,
      perCbmRate: l.per_cbm_rate ?? 0,
      perKgRate: l.per_kg_rate ?? 0,
      minCharge: l.min_charge ?? 0,
      fuelSurchargePct: l.fuel_surcharge_pct ?? 0,
      currency: l.currency ?? "USD",
      transitDaysMin: l.transit_days_min ?? undefined,
      transitDaysMax: l.transit_days_max ?? undefined,
      consolidationDays: l.consolidation_days ?? undefined,
      source: l.source,
      provider: l.provider ?? "",
      externalRef: l.external_ref ?? "",
      validFrom: l.valid_from ?? "",
      validTo: l.valid_to ?? "",
      isActive: l.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await upsertFreightLane(form);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Lane updated" : "Lane created");
      setOpen(false);
    });
  }

  function toggleActive(l: FreightLaneRow) {
    startTransition(async () => {
      const res = await setFreightLaneActive(l.id, !(l.is_active ?? true));
      if (!res.success) toast.error(res.error);
      else toast.success((l.is_active ?? true) ? "Deactivated" : "Activated");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={filterContainer} onValueChange={(v) => setFilterContainer(v as ContainerType | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All container types</SelectItem>
            {CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMethod} onValueChange={(v) => setFilterMethod(v as ShippingMethodDb | "all")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shipping methods</SelectItem>
            {SHIPPING_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto" />
        <CarrierRateFetcher ports={ports} />
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Add lane
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Origin → Destination</th>
              <th className="px-3 py-2 text-left">Method</th>
              <th className="px-3 py-2 text-left">Container</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Valid</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const o = l.origin_port_id ? portById.get(l.origin_port_id) : undefined;
              const d = l.destination_port_id ? portById.get(l.destination_port_id) : undefined;
              const oLabel = o ? `${o.code}` : (l.origin_country ?? "—");
              const dLabel = d ? `${d.code}` : (l.destination_country ?? "—");
              const rate = laneRateSummary(l);
              return (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{oLabel} → {dLabel}</td>
                  <td className="px-3 py-2">{l.shipping_method.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{l.container_type}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{rate}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs">{l.source.replace(/_/g, " ")}</span>
                    {l.provider && <div className="text-[10px] text-muted-foreground">{l.provider}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.valid_from ?? "—"} → {l.valid_to ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {(l.is_active ?? true) ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Edit className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(l)} disabled={pending}>
                      {(l.is_active ?? true) ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No lanes match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit freight lane" : "Add freight lane"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin port (optional)">
              <PortSelect
                value={form.originPortId ?? ""}
                onChange={(v) => setForm({ ...form, originPortId: v || null })}
                ports={originPorts}
              />
            </Field>
            <Field label="Origin country (fallback)">
              <Input
                value={form.originCountry ?? ""}
                onChange={(e) => setForm({ ...form, originCountry: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="CN"
              />
            </Field>
            <Field label="Destination port (optional)">
              <PortSelect
                value={form.destinationPortId ?? ""}
                onChange={(v) => setForm({ ...form, destinationPortId: v || null })}
                ports={destPorts}
              />
            </Field>
            <Field label="Destination country (fallback)">
              <Input
                value={form.destinationCountry ?? ""}
                onChange={(e) => setForm({ ...form, destinationCountry: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="KE"
              />
            </Field>

            <Field label="Shipping method">
              <Select value={form.shippingMethod} onValueChange={(v) => setForm({ ...form, shippingMethod: v as ShippingMethodDb })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIPPING_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Container type">
              <Select value={form.containerType} onValueChange={(v) => setForm({ ...form, containerType: v as ContainerType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Base rate (cents)">
              <Input type="number" value={form.baseRate ?? 0} onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })} />
            </Field>
            <Field label="Per container (cents) — FCL">
              <Input type="number" value={form.perContainerRate ?? 0} onChange={(e) => setForm({ ...form, perContainerRate: Number(e.target.value) })} />
            </Field>
            <Field label="Per CBM (cents) — LCL/sea">
              <Input type="number" value={form.perCbmRate ?? 0} onChange={(e) => setForm({ ...form, perCbmRate: Number(e.target.value) })} />
            </Field>
            <Field label="Per kg (cents) — air">
              <Input type="number" value={form.perKgRate ?? 0} onChange={(e) => setForm({ ...form, perKgRate: Number(e.target.value) })} />
            </Field>
            <Field label="Min charge (cents)">
              <Input type="number" value={form.minCharge ?? 0} onChange={(e) => setForm({ ...form, minCharge: Number(e.target.value) })} />
            </Field>
            <Field label="Fuel surcharge %">
              <Input type="number" step="0.1" value={form.fuelSurchargePct ?? 0} onChange={(e) => setForm({ ...form, fuelSurchargePct: Number(e.target.value) })} />
            </Field>

            <Field label="Currency">
              <Input value={form.currency ?? "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
            </Field>
            <Field label="Source">
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as RateSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Provider">
              <Input value={form.provider ?? ""} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Maersk / COSCO / Freightos" />
            </Field>
            <Field label="External ref">
              <Input value={form.externalRef ?? ""} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} />
            </Field>

            <Field label="Transit min (days)">
              <Input type="number" value={form.transitDaysMin ?? ""} onChange={(e) => setForm({ ...form, transitDaysMin: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <Field label="Transit max (days)">
              <Input type="number" value={form.transitDaysMax ?? ""} onChange={(e) => setForm({ ...form, transitDaysMax: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>

            <Field label="Valid from">
              <Input type="date" value={form.validFrom ?? ""} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
            </Field>
            <Field label="Valid to">
              <Input type="date" value={form.validTo ?? ""} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
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

function PortSelect({ value, onChange, ports }: { value: string; onChange: (v: string) => void; ports: PortRow[] }) {
  return (
    <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder="(use country fallback)" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">(use country fallback)</SelectItem>
        {ports.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function laneRateSummary(l: FreightLaneRow): string {
  const ccy = l.currency ?? "USD";
  if ((l.per_container_rate ?? 0) > 0) return `${fmtMinor(l.per_container_rate ?? 0, ccy)} / ctr`;
  if ((l.per_cbm_rate ?? 0) > 0) return `${fmtMinor(l.per_cbm_rate ?? 0, ccy)} / CBM`;
  if ((l.per_kg_rate ?? 0) > 0) return `${fmtMinor(l.per_kg_rate ?? 0, ccy)} / kg`;
  return `${fmtMinor(l.base_rate ?? 0, ccy)} flat`;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}
