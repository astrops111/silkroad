"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, Loader2, Plus, Send, Ship, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { LandedCostBreakdown } from "@/components/admin/LandedCostBreakdown";
import {
  convertOpsQuoteToShipment,
  createOpsQuote,
  previewLandedCost,
  setOpsQuoteStatus,
  updateOpsQuote,
  type OpsQuoteFormInput,
} from "@/lib/actions/ops-freight-quotes";
import type {
  CargoItem,
  ContainerType,
  CostBreakdown,
  ShippingMethod,
  TradeTerm,
} from "@/lib/logistics/landed-cost";
import type {
  OpsFreightQuoteRow,
  OpsQuoteRequesterType,
  OpsQuoteStatus,
} from "@/lib/queries/ops-freight-quotes";
import type { PortRow } from "@/lib/queries/logistics-reference";

const REQUESTER_TYPES: OpsQuoteRequesterType[] = ["forwarder", "walk_in", "partner", "internal", "other"];
const CONTAINER_TYPES: ContainerType[] = [
  "lcl", "fcl_20", "fcl_40", "fcl_40hc", "fcl_45", "air_express", "air_freight",
];
const SHIPPING_METHODS: ShippingMethod[] = [
  "platform_freight", "platform_express", "platform_standard",
  "platform_cold_chain", "supplier_self", "buyer_pickup", "third_party",
];
const TRADE_TERMS: TradeTerm[] = ["exw", "fca", "fob", "cpt", "cif", "dap", "ddp"];

const EMPTY_ITEM: CargoItem = {
  description: "",
  hsCode: "",
  quantity: 1,
  unitCostMinor: 0,
  weightKgPerUnit: 0,
  volumeCbmPerUnit: 0,
};

interface Props {
  mode: "create" | "edit";
  ports: PortRow[];
  existing?: OpsFreightQuoteRow | null;
  initialBreakdown?: CostBreakdown | null;
}

export function OpsFreightQuoteForm({ mode, ports, existing, initialBreakdown }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<OpsQuoteFormInput>(() => hydrate(existing));
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(initialBreakdown ?? null);
  const [previewing, startPreview] = useTransition();
  const [saving, startSave] = useTransition();
  const [lifecycling, startLifecycle] = useTransition();
  const [converting, startConvert] = useTransition();

  const originPorts = ports.filter((p) => p.is_origin);
  const destPorts = ports.filter((p) => p.is_destination);

  function set<K extends keyof OpsQuoteFormInput>(key: K, value: OpsQuoteFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(idx: number, patch: Partial<CargoItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function preview() {
    startPreview(async () => {
      const res = await previewLandedCost(form);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setBreakdown(res.data ?? null);
      toast.success("Landed cost computed");
    });
  }

  function save() {
    startSave(async () => {
      if (mode === "create") {
        const res = await createOpsQuote(form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        if (res.data!.status === "pending_screening") {
          toast.message(`Quote ${res.data!.quoteNumber} saved — sent to compliance review`);
        } else {
          toast.success(`Created ${res.data!.quoteNumber}`);
        }
        router.push(`/admin/logistics/quotes/${res.data!.id}`);
      } else if (existing) {
        const res = await updateOpsQuote(existing.id, form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Saved");
        router.refresh();
      }
    });
  }

  function lifecycle(status: OpsQuoteStatus) {
    if (!existing) return;
    startLifecycle(async () => {
      const res = await setOpsQuoteStatus(existing.id, status);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Marked ${status}`);
      router.refresh();
    });
  }

  function convert() {
    if (!existing) return;
    startConvert(async () => {
      const res = await convertOpsQuoteToShipment(existing.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Shipment ${res.data!.shipmentNumber} created`);
      router.push(`/admin/logistics/shipments/${res.data!.shipmentId}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <Section title="Requester">
          <div className="grid grid-cols-2 gap-3">
            <F label="Type">
              <Select value={form.requesterType} onValueChange={(v) => set("requesterType", v as OpsQuoteRequesterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUESTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Source channel">
              <Input value={form.sourceChannel ?? ""} onChange={(e) => set("sourceChannel", e.target.value)} placeholder="wechat / whatsapp / email / phone" />
            </F>
            <F label="Name">
              <Input value={form.requesterName ?? ""} onChange={(e) => set("requesterName", e.target.value)} />
            </F>
            <F label="Company">
              <Input value={form.requesterCompany ?? ""} onChange={(e) => set("requesterCompany", e.target.value)} />
            </F>
            <F label="Email">
              <Input type="email" value={form.requesterEmail ?? ""} onChange={(e) => set("requesterEmail", e.target.value)} />
            </F>
            <F label="Phone">
              <Input value={form.requesterPhone ?? ""} onChange={(e) => set("requesterPhone", e.target.value)} />
            </F>
            <F label="Requester country (ISO-2)">
              <Input value={form.requesterCountry ?? ""} onChange={(e) => set("requesterCountry", e.target.value.toUpperCase())} maxLength={2} />
            </F>
            <F label="Source reference">
              <Input value={form.sourceReference ?? ""} onChange={(e) => set("sourceReference", e.target.value)} placeholder="message id / ticket / thread" />
            </F>
          </div>
        </Section>

        <Section title="Routing">
          <div className="grid grid-cols-2 gap-3">
            <F label="Origin port (optional)">
              <PortSelect value={form.originPortCode ?? ""} onChange={(v) => set("originPortCode", v || undefined)} ports={originPorts} />
            </F>
            <F label="Origin country (ISO-2) *">
              <Input value={form.originCountry ?? ""} onChange={(e) => set("originCountry", e.target.value.toUpperCase())} maxLength={2} placeholder="CN" />
            </F>
            <F label="Destination port (optional)">
              <PortSelect value={form.destinationPortCode ?? ""} onChange={(v) => set("destinationPortCode", v || undefined)} ports={destPorts} />
            </F>
            <F label="Destination country (ISO-2) *">
              <Input value={form.destinationCountry ?? ""} onChange={(e) => set("destinationCountry", e.target.value.toUpperCase())} maxLength={2} placeholder="KE" />
            </F>
            <F label="Shipping method">
              <Select value={form.shippingMethod} onValueChange={(v) => set("shippingMethod", v as ShippingMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIPPING_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Container type">
              <Select value={form.containerType} onValueChange={(v) => set("containerType", v as ContainerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Container count">
              <Input type="number" min={1} value={form.containerCount ?? 1} onChange={(e) => set("containerCount", Number(e.target.value) || 1)} />
            </F>
            <F label="Trade term (Incoterm)">
              <Select value={form.trade_term} onValueChange={(v) => set("trade_term", v as TradeTerm)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRADE_TERMS.map((t) => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
        </Section>

        <Section title="Cargo">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Description (summary)">
                <Input value={form.cargoDescription ?? ""} onChange={(e) => set("cargoDescription", e.target.value)} />
              </F>
              <F label="Goods currency">
                <Input value={form.goodsCurrency ?? "USD"} onChange={(e) => set("goodsCurrency", e.target.value.toUpperCase())} maxLength={3} />
              </F>
              <F label="Goods value override (cents)">
                <Input
                  type="number"
                  value={form.goodsValueOverrideMinor ?? ""}
                  onChange={(e) => set("goodsValueOverrideMinor", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="(use sum of line items)"
                />
              </F>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.isFragile ?? false} onChange={(e) => set("isFragile", e.target.checked)} />
                  Fragile
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.requiresColdChain ?? false} onChange={(e) => set("requiresColdChain", e.target.checked)} />
                  Cold chain
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.isHazardous ?? false} onChange={(e) => set("isHazardous", e.target.checked)} />
                  Hazardous
                </label>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Line items ({form.items.length})</div>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 size-4" /> Add line
                </Button>
              </div>
              {form.items.map((it, i) => (
                <div key={i} className="rounded-md border p-2">
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">HS code</Label>
                      <Input value={it.hsCode} onChange={(e) => updateItem(i, { hsCode: e.target.value })} placeholder="8517.13" />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit cost (¢)</Label>
                      <Input type="number" value={it.unitCostMinor} onChange={(e) => updateItem(i, { unitCostMinor: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Weight/unit (kg)</Label>
                      <Input type="number" step="0.01" value={it.weightKgPerUnit} onChange={(e) => updateItem(i, { weightKgPerUnit: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Vol/unit (CBM)</Label>
                      <Input type="number" step="0.0001" value={it.volumeCbmPerUnit ?? 0} onChange={(e) => updateItem(i, { volumeCbmPerUnit: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-4 mt-1 flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={it.isFragile ?? false} onChange={(e) => updateItem(i, { isFragile: e.target.checked })} /> Fragile
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={it.requiresColdChain ?? false} onChange={(e) => updateItem(i, { requiresColdChain: e.target.checked })} /> Cold chain
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={it.isHazardous ?? false} onChange={(e) => updateItem(i, { isHazardous: e.target.checked })} /> Hazmat
                      </label>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => removeItem(i)} disabled={form.items.length === 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Commercial & timing">
          <div className="grid grid-cols-2 gap-3">
            <F label="First-mile (cents)">
              <Input type="number" value={form.firstMileMinor ?? 0} onChange={(e) => set("firstMileMinor", Number(e.target.value) || 0)} />
            </F>
            <F label="Last-mile (cents)">
              <Input type="number" value={form.lastMileMinor ?? 0} onChange={(e) => set("lastMileMinor", Number(e.target.value) || 0)} />
            </F>
            <F label="Platform handling (cents)">
              <Input type="number" value={form.handlingFeeMinor ?? 0} onChange={(e) => set("handlingFeeMinor", Number(e.target.value) || 0)} />
            </F>
            <F label="Markup multiplier (override)">
              <Input type="number" step="0.01" value={form.markupMultiplier ?? ""} onChange={(e) => set("markupMultiplier", e.target.value ? Number(e.target.value) : undefined)} placeholder="(platform default)" />
            </F>
            <F label="Insurance mode">
              <Select
                value={form.insurance?.mode ?? "auto"}
                onValueChange={(v) => set("insurance", v === "auto" ? { mode: "auto" } : v === "none" ? { mode: "none" } : { mode: "manual", ratePct: 0.3 })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">auto (0.3% default)</SelectItem>
                  <SelectItem value="none">none</SelectItem>
                  <SelectItem value="manual">manual rate</SelectItem>
                </SelectContent>
              </Select>
            </F>
            {form.insurance?.mode === "manual" && (
              <F label="Insurance rate % (manual)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.insurance.ratePct}
                  onChange={(e) => set("insurance", { mode: "manual", ratePct: Number(e.target.value) || 0 })}
                />
              </F>
            )}
            <F label="Cargo ready date">
              <Input type="date" value={form.cargoReadyDate ?? ""} onChange={(e) => set("cargoReadyDate", e.target.value)} />
            </F>
            <F label="Required by">
              <Input type="date" value={form.requiredBy ?? ""} onChange={(e) => set("requiredBy", e.target.value)} />
            </F>
            <F label="Quote valid until">
              <Input type="date" value={form.validUntil ?? ""} onChange={(e) => set("validUntil", e.target.value)} />
            </F>
          </div>
          <div className="mt-2">
            <Label className="text-xs">Notes</Label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={preview} disabled={previewing} variant="outline">
            {previewing ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Calculator className="mr-1 size-4" />}
            Compute landed cost
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {mode === "create" ? "Create quote" : "Save"}
          </Button>
          {existing && existing.status === "draft" && (
            <Button variant="secondary" onClick={() => lifecycle("sent")} disabled={lifecycling}>
              <Send className="mr-1 size-4" /> Mark sent
            </Button>
          )}
          {existing && (existing.status === "sent" || existing.status === "quoted") && (
            <>
              <Button variant="secondary" onClick={() => lifecycle("accepted")} disabled={lifecycling}>Accepted</Button>
              <Button variant="outline" onClick={() => lifecycle("declined")} disabled={lifecycling}>Declined</Button>
            </>
          )}
          {existing && existing.status === "accepted" && !existing.converted_shipment_id && (
            <Button variant="default" onClick={convert} disabled={converting}>
              {converting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Ship className="mr-1 size-4" />}
              Convert to shipment
            </Button>
          )}
          {existing?.converted_shipment_id && (
            <Button variant="outline" asChild>
              <Link href={`/admin/logistics/shipments/${existing.converted_shipment_id}`}>
                <Ship className="mr-1 size-4" /> View shipment
              </Link>
            </Button>
          )}
          {existing && existing.status !== "archived" && (
            <Button variant="ghost" onClick={() => lifecycle("archived")} disabled={lifecycling}>
              <X className="mr-1 size-4" /> Archive
            </Button>
          )}
          {existing && (
            <Badge variant="outline" className="ml-auto">
              {existing.quote_number} · {existing.status}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {breakdown ? (
          <LandedCostBreakdown breakdown={breakdown} />
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Fill in routing + at least one cargo line, then click <b>Compute landed cost</b> to see the breakdown.
          </div>
        )}
      </div>
    </div>
  );
}

function hydrate(row: OpsFreightQuoteRow | null | undefined): OpsQuoteFormInput {
  if (!row) {
    return {
      requesterType: "walk_in",
      items: [{ ...EMPTY_ITEM }],
      originCountry: "",
      destinationCountry: "",
      shippingMethod: "platform_freight",
      containerType: "lcl",
      trade_term: "cif",
      containerCount: 1,
      goodsCurrency: "USD",
    };
  }

  // Line items are stored on metadata for reconstruction.
  const meta = (row.metadata ?? {}) as { lineItems?: CargoItem[] };
  const items = meta.lineItems && meta.lineItems.length > 0 ? meta.lineItems : [{ ...EMPTY_ITEM }];

  return {
    requesterType: row.requester_type,
    requesterName: row.requester_name ?? "",
    requesterCompany: row.requester_company ?? "",
    requesterEmail: row.requester_email ?? "",
    requesterPhone: row.requester_phone ?? "",
    requesterCountry: row.requester_country ?? "",
    sourceChannel: row.source_channel ?? "",
    sourceReference: row.source_reference ?? "",
    items,
    cargoDescription: row.cargo_description ?? "",
    isFragile: row.is_fragile ?? false,
    requiresColdChain: row.requires_cold_chain ?? false,
    isHazardous: row.is_hazardous ?? false,
    goodsValueOverrideMinor: row.goods_value ?? undefined,
    goodsCurrency: row.goods_currency ?? "USD",
    originCountry: row.origin_country ?? "",
    destinationCountry: row.destination_country ?? "",
    shippingMethod: (row.shipping_method ?? "platform_freight") as ShippingMethod,
    containerType: (row.container_type ?? "lcl") as ContainerType,
    containerCount: 1,
    trade_term: (row.trade_term ?? "cif") as TradeTerm,
    cargoReadyDate: row.cargo_ready_date ?? "",
    requiredBy: row.required_by ?? "",
    validUntil: row.valid_until ?? "",
    notes: row.notes ?? "",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}

function PortSelect({ value, onChange, ports }: { value: string; onChange: (v: string) => void; ports: PortRow[] }) {
  return (
    <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder="(country fallback)" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">(country fallback)</SelectItem>
        {ports.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} — {p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
