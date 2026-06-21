"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Edit, Loader2, Plus, ShieldCheck } from "lucide-react";
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
  "platform_cold_chain", "supplier_self", "third_party",
];

const FCL_TYPES = new Set<ContainerType>(["fcl_20", "fcl_40", "fcl_40hc", "fcl_45"]);
const AIR_TYPES = new Set<ContainerType>(["air_express", "air_freight"]);

// ============================================================
// Form shape — uses dollar amounts (not cents) for human-friendly
// rate entry. Converted to cents in toFreightLaneInput() on submit.
// ============================================================
interface BsaForm {
  id?: string;
  carrier: string;
  agreementRef: string;
  originPortId: string | null;
  originCountry: string;
  destinationPortId: string | null;
  destinationCountry: string;
  shippingMethod: ShippingMethodDb;
  containerType: ContainerType;
  currency: string;
  perContainerUsd: number;
  perCbmUsd: number;
  perKgUsd: number;
  minChargeUsd: number;
  fuelSurchargePct: number;
  transitDaysMin: number | "";
  transitDaysMax: number | "";
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

const EMPTY: BsaForm = {
  carrier: "",
  agreementRef: "",
  originPortId: null,
  originCountry: "CN",
  destinationPortId: null,
  destinationCountry: "",
  shippingMethod: "platform_freight",
  containerType: "fcl_40",
  currency: "USD",
  perContainerUsd: 0,
  perCbmUsd: 0,
  perKgUsd: 0,
  minChargeUsd: 0,
  fuelSurchargePct: 0,
  transitDaysMin: "",
  transitDaysMax: "",
  validFrom: "",
  validTo: "",
  isActive: true,
};

// ============================================================
// Status helpers
// ============================================================

type BsaStatus = "active" | "expiring" | "expired" | "inactive";

function getBsaStatus(lane: FreightLaneRow): BsaStatus {
  if (!(lane.is_active ?? true)) return "inactive";
  if (!lane.valid_to) return "active";
  const daysLeft = Math.ceil(
    (new Date(lane.valid_to).getTime() - Date.now()) / 86_400_000,
  );
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring";
  return "active";
}

function daysUntilExpiry(validTo: string | null): number | null {
  if (!validTo) return null;
  return Math.ceil((new Date(validTo).getTime() - Date.now()) / 86_400_000);
}

function StatusBadge({ status, daysLeft }: { status: BsaStatus; daysLeft: number | null }) {
  if (status === "active") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        <ShieldCheck className="size-3" /> Active
      </Badge>
    );
  }
  if (status === "expiring") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
        <AlertTriangle className="size-3" /> Expiring {daysLeft}d
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="destructive" className="gap-1">
        <CalendarClock className="size-3" /> Expired
      </Badge>
    );
  }
  return <Badge variant="outline">Inactive</Badge>;
}

function rateSummary(lane: FreightLaneRow): string {
  const fmt = (cents: number | null) => `$${((cents ?? 0) / 100).toFixed(2)}`;
  if ((lane.per_container_rate ?? 0) > 0) return `${fmt(lane.per_container_rate)} / ctr`;
  if ((lane.per_cbm_rate ?? 0) > 0) return `${fmt(lane.per_cbm_rate)} / CBM`;
  if ((lane.per_kg_rate ?? 0) > 0) return `${fmt(lane.per_kg_rate)} / kg`;
  return `${fmt(lane.base_rate)} flat`;
}

// ============================================================
// Main component
// ============================================================

export function BSAManager({
  initialLanes,
  ports,
}: {
  initialLanes: FreightLaneRow[];
  ports: PortRow[];
}) {
  const [filterContainer, setFilterContainer] = useState<ContainerType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<BsaStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BsaForm>(EMPTY);
  const [pending, startTransition] = useTransition();

  const portById = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);
  const originPorts = ports.filter((p) => p.is_origin);
  const destPorts = ports.filter((p) => p.is_destination);

  const lanesWithStatus = useMemo(
    () => initialLanes.map((l) => ({ lane: l, status: getBsaStatus(l) })),
    [initialLanes],
  );

  const filtered = useMemo(
    () =>
      lanesWithStatus.filter(({ lane, status }) => {
        if (filterContainer !== "all" && lane.container_type !== filterContainer) return false;
        if (filterStatus !== "all" && status !== filterStatus) return false;
        return true;
      }),
    [lanesWithStatus, filterContainer, filterStatus],
  );

  const expiringCount = lanesWithStatus.filter(({ status }) => status === "expiring").length;

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(l: FreightLaneRow) {
    setForm({
      id: l.id,
      carrier: l.provider ?? "",
      agreementRef: (l as Record<string, unknown>).external_ref as string ?? "",
      originPortId: l.origin_port_id ?? null,
      originCountry: l.origin_country ?? "CN",
      destinationPortId: l.destination_port_id ?? null,
      destinationCountry: l.destination_country ?? "",
      shippingMethod: l.shipping_method,
      containerType: l.container_type,
      currency: l.currency ?? "USD",
      perContainerUsd: (l.per_container_rate ?? 0) / 100,
      perCbmUsd: (l.per_cbm_rate ?? 0) / 100,
      perKgUsd: (l.per_kg_rate ?? 0) / 100,
      minChargeUsd: (l.min_charge ?? 0) / 100,
      fuelSurchargePct: l.fuel_surcharge_pct ?? 0,
      transitDaysMin: l.transit_days_min ?? "",
      transitDaysMax: l.transit_days_max ?? "",
      validFrom: l.valid_from ?? "",
      validTo: l.valid_to ?? "",
      isActive: l.is_active ?? true,
    });
    setOpen(true);
  }

  function submit() {
    if (!form.carrier.trim()) {
      toast.error("Carrier name is required");
      return;
    }
    if (!form.validFrom || !form.validTo) {
      toast.error("Contract start and end dates are required");
      return;
    }
    if (new Date(form.validTo) <= new Date(form.validFrom)) {
      toast.error("Contract end date must be after start date");
      return;
    }

    startTransition(async () => {
      const input: FreightLaneInput = {
        id: form.id,
        originPortId: form.originPortId,
        originCountry: form.originCountry,
        destinationPortId: form.destinationPortId,
        destinationCountry: form.destinationCountry,
        shippingMethod: form.shippingMethod,
        containerType: form.containerType,
        source: "bsa" as RateSource,
        provider: form.carrier.trim(),
        externalRef: form.agreementRef.trim() || undefined,
        currency: form.currency,
        perContainerRate: Math.round(form.perContainerUsd * 100),
        perCbmRate: Math.round(form.perCbmUsd * 100),
        perKgRate: Math.round(form.perKgUsd * 100),
        minCharge: Math.round(form.minChargeUsd * 100),
        fuelSurchargePct: form.fuelSurchargePct,
        transitDaysMin: form.transitDaysMin !== "" ? Number(form.transitDaysMin) : undefined,
        transitDaysMax: form.transitDaysMax !== "" ? Number(form.transitDaysMax) : undefined,
        validFrom: form.validFrom,
        validTo: form.validTo,
        isActive: form.isActive,
      };

      const res = await upsertFreightLane(input);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "BSA contract updated" : "BSA contract created");
      setOpen(false);
    });
  }

  function toggleActive(l: FreightLaneRow) {
    startTransition(async () => {
      const res = await setFreightLaneActive(l.id, !(l.is_active ?? true));
      if (!res.success) toast.error(res.error);
      else toast.success((l.is_active ?? true) ? "Contract deactivated" : "Contract activated");
    });
  }

  const isFcl = FCL_TYPES.has(form.containerType);
  const isAir = AIR_TYPES.has(form.containerType);

  return (
    <div className="space-y-4">
      {/* Expiry alert */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {expiringCount} BSA contract{expiringCount > 1 ? "s are" : " is"} expiring within
            30 days — renew before expiry to avoid falling back to market rates.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Select
          value={filterContainer}
          onValueChange={(v) => setFilterContainer(v as ContainerType | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All containers</SelectItem>
            {CONTAINER_TYPES.map((c) => (
              <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as BsaStatus | "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto" />

        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 size-4" /> Add BSA contract
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Carrier</th>
              <th className="px-3 py-2 text-left">Agreement ref</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Container</th>
              <th className="px-3 py-2 text-right">Negotiated rate</th>
              <th className="px-3 py-2 text-center">Transit</th>
              <th className="px-3 py-2 text-left">Contract term</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ lane: l, status }) => {
              const o = l.origin_port_id ? portById.get(l.origin_port_id) : undefined;
              const d = l.destination_port_id ? portById.get(l.destination_port_id) : undefined;
              const oLabel = o ? o.code : (l.origin_country ?? "—");
              const dLabel = d ? d.code : (l.destination_country ?? "—");
              const days = daysUntilExpiry(l.valid_to);

              return (
                <tr key={l.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{l.provider ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {(l as Record<string, unknown>).external_ref as string || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {oLabel} → {dLabel}
                  </td>
                  <td className="px-3 py-2 text-xs uppercase">{l.container_type}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {rateSummary(l)}
                    {(l.fuel_surcharge_pct ?? 0) > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{l.fuel_surcharge_pct}% FSC
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {l.transit_days_min ?? "?"}–{l.transit_days_max ?? "?"} d
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{l.valid_from ?? "—"}</div>
                    <div className="text-muted-foreground">→ {l.valid_to ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={status} daysLeft={days} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(l)}
                        disabled={pending}
                        className="text-xs"
                      >
                        {(l.is_active ?? true) ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                  {initialLanes.length === 0
                    ? "No BSA contracts yet. Add your first negotiated lane to unlock priority rates."
                    : "No contracts match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit BSA contract" : "Add BSA contract"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Negotiated rate that takes priority over all market quotes for the matched route.
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Carrier & agreement */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Carrier details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Carrier / forwarder *">
                  <Input
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    placeholder="Evergreen Line"
                  />
                </Field>
                <Field label="Agreement reference #">
                  <Input
                    value={form.agreementRef}
                    onChange={(e) => setForm({ ...form, agreementRef: e.target.value })}
                    placeholder="BSA-2026-EV-001"
                  />
                </Field>
              </div>
            </section>

            {/* Route */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Route
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Origin port">
                  <PortSelect
                    value={form.originPortId ?? ""}
                    onChange={(v) => setForm({ ...form, originPortId: v || null })}
                    ports={originPorts}
                  />
                </Field>
                <Field label="Origin country (fallback)">
                  <Input
                    value={form.originCountry}
                    onChange={(e) =>
                      setForm({ ...form, originCountry: e.target.value.toUpperCase() })
                    }
                    maxLength={2}
                    placeholder="CN"
                  />
                </Field>
                <Field label="Destination port">
                  <PortSelect
                    value={form.destinationPortId ?? ""}
                    onChange={(v) => setForm({ ...form, destinationPortId: v || null })}
                    ports={destPorts}
                  />
                </Field>
                <Field label="Destination country (fallback)">
                  <Input
                    value={form.destinationCountry}
                    onChange={(e) =>
                      setForm({ ...form, destinationCountry: e.target.value.toUpperCase() })
                    }
                    maxLength={2}
                    placeholder="NG"
                  />
                </Field>
                <Field label="Shipping method">
                  <Select
                    value={form.shippingMethod}
                    onValueChange={(v) =>
                      setForm({ ...form, shippingMethod: v as ShippingMethodDb })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Container type">
                  <Select
                    value={form.containerType}
                    onValueChange={(v) =>
                      setForm({ ...form, containerType: v as ContainerType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINER_TYPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            {/* Rates */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Negotiated rates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency">
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value.toUpperCase() })
                    }
                    maxLength={3}
                    placeholder="USD"
                  />
                </Field>
                <div />

                {isFcl && (
                  <Field label={`Per container (${form.currency})`}>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.perContainerUsd || ""}
                      onChange={(e) =>
                        setForm({ ...form, perContainerUsd: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="850.00"
                    />
                  </Field>
                )}
                {!isFcl && !isAir && (
                  <Field label={`Per CBM (${form.currency})`}>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.perCbmUsd || ""}
                      onChange={(e) =>
                        setForm({ ...form, perCbmUsd: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="110.00"
                    />
                  </Field>
                )}
                {isAir && (
                  <Field label={`Per kg (${form.currency})`}>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.perKgUsd || ""}
                      onChange={(e) =>
                        setForm({ ...form, perKgUsd: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="3.50"
                    />
                  </Field>
                )}

                <Field label={`Min charge (${form.currency})`}>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.minChargeUsd || ""}
                    onChange={(e) =>
                      setForm({ ...form, minChargeUsd: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="600.00"
                  />
                </Field>
                <Field label="Fuel surcharge %">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={form.fuelSurchargePct || ""}
                    onChange={(e) =>
                      setForm({ ...form, fuelSurchargePct: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="8.5"
                  />
                </Field>
                <Field label="Transit min (days)">
                  <Input
                    type="number"
                    min={0}
                    value={form.transitDaysMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transitDaysMin: e.target.value ? Number(e.target.value) : "",
                      })
                    }
                    placeholder="21"
                  />
                </Field>
                <Field label="Transit max (days)">
                  <Input
                    type="number"
                    min={0}
                    value={form.transitDaysMax}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transitDaysMax: e.target.value ? Number(e.target.value) : "",
                      })
                    }
                    placeholder="28"
                  />
                </Field>
              </div>
            </section>

            {/* Contract term */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contract term *
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valid from">
                  <Input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </Field>
                <Field label="Valid to">
                  <Input
                    type="date"
                    value={form.validTo}
                    onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                  />
                </Field>
              </div>
              {form.validFrom && form.validTo && new Date(form.validTo) > new Date(form.validFrom) && (
                <p className="text-xs text-muted-foreground">
                  Contract duration:{" "}
                  {Math.ceil(
                    (new Date(form.validTo).getTime() - new Date(form.validFrom).getTime()) /
                      86_400_000,
                  )}{" "}
                  days
                </p>
              )}
            </section>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active (rates applied immediately in landed-cost engine)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}
              {form.id ? "Save changes" : "Create contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function PortSelect({
  value,
  onChange,
  ports,
}: {
  value: string;
  onChange: (v: string) => void;
  ports: PortRow[];
}) {
  return (
    <Select
      value={value || "_none"}
      onValueChange={(v) => onChange(v === "_none" ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="(use country)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">(use country fallback)</SelectItem>
        {ports.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.code} — {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}
