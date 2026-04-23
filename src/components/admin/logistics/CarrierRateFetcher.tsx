"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Radar, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { fetchCarrierRates, saveCarrierQuoteAsLane } from "@/lib/actions/carrier-rates";
import type {
  AggregatedRateResponse,
  CarrierRateQuote,
  CarrierRateQuoteRequest,
} from "@/lib/logistics/carriers/types";
import type { ContainerType, ShippingMethod } from "@/lib/logistics/landed-cost";
import type { PortRow } from "@/lib/queries/logistics-reference";

const CONTAINER_TYPES: ContainerType[] = [
  "lcl", "fcl_20", "fcl_40", "fcl_40hc", "fcl_45", "air_express", "air_freight",
];
const SHIPPING_METHODS: ShippingMethod[] = [
  "platform_freight", "platform_express", "platform_standard",
];

export function CarrierRateFetcher({ ports }: { ports: PortRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState<CarrierRateQuoteRequest>({
    originCountry: "CN",
    destinationCountry: "KE",
    shippingMethod: "platform_freight",
    containerType: "fcl_40",
  });
  const [response, setResponse] = useState<AggregatedRateResponse | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [fetching, startFetch] = useTransition();
  const [saving, startSave] = useTransition();

  const originPorts = ports.filter((p) => p.is_origin);
  const destPorts = ports.filter((p) => p.is_destination);

  function fetch() {
    startFetch(async () => {
      const res = await fetchCarrierRates(req);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResponse(res.data ?? null);
      setSavedIds(new Set());
      toast.success(`Fetched ${res.data!.totalQuotes} quotes from ${res.data!.responses.length} adapters`);
    });
  }

  function save(quote: CarrierRateQuote) {
    startSave(async () => {
      const res = await saveCarrierQuoteAsLane({ quote, request: req });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const key = `${quote.adapterId}:${quote.externalRef ?? quote.summary}`;
      setSavedIds((s) => new Set(s).add(key));
      toast.success(`Saved ${quote.providerName} as lane`);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Radar className="mr-1 size-4" /> Fetch from carriers
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fetch carrier rates</DialogTitle>
            <DialogDescription>
              Queries every enabled carrier/aggregator adapter in parallel, then lets you save any result as a freight lane (source=carrier_api).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <F label="Origin port">
                <PortSelect
                  value={req.originPortCode ?? ""}
                  onChange={(v) => setReq({ ...req, originPortCode: v || undefined })}
                  ports={originPorts}
                />
              </F>
              <F label="Origin country *">
                <Input value={req.originCountry} onChange={(e) => setReq({ ...req, originCountry: e.target.value.toUpperCase() })} maxLength={2} />
              </F>
              <F label="Destination port">
                <PortSelect
                  value={req.destinationPortCode ?? ""}
                  onChange={(v) => setReq({ ...req, destinationPortCode: v || undefined })}
                  ports={destPorts}
                />
              </F>
              <F label="Destination country *">
                <Input value={req.destinationCountry} onChange={(e) => setReq({ ...req, destinationCountry: e.target.value.toUpperCase() })} maxLength={2} />
              </F>
              <F label="Shipping method">
                <Select value={req.shippingMethod} onValueChange={(v) => setReq({ ...req, shippingMethod: v as ShippingMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIPPING_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Container">
                <Select value={req.containerType} onValueChange={(v) => setReq({ ...req, containerType: v as ContainerType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <div className="col-span-2 flex items-end">
                <Button onClick={fetch} disabled={fetching} className="w-full">
                  {fetching ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Radar className="mr-1 size-4" />}
                  Fetch rates
                </Button>
              </div>
            </div>

            {response && (
              <div className="space-y-3">
                {response.errors.length > 0 && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mr-1 inline size-3" />
                    {response.errors.map((e) => `${e.adapterId}: ${e.error}`).join(" · ")}
                  </div>
                )}
                {response.responses.map((r) => (
                  <div key={r.adapterId} className="rounded-md border">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                      <div className="text-xs font-medium uppercase tracking-wide">{r.adapterId}</div>
                      <div className="text-xs text-muted-foreground">{r.quotes.length} quotes · fetched {new Date(r.fetchedAt).toLocaleTimeString()}</div>
                    </div>
                    {r.warnings.length > 0 && (
                      <div className="border-b bg-amber-50/50 px-3 py-1 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        {r.warnings.join(" · ")}
                      </div>
                    )}
                    {r.quotes.length === 0 ? (
                      <div className="px-3 py-3 text-center text-sm text-muted-foreground">No quotes.</div>
                    ) : (
                      <ul className="divide-y">
                        {r.quotes.map((q) => {
                          const key = `${q.adapterId}:${q.externalRef ?? q.summary}`;
                          const saved = savedIds.has(key);
                          return (
                            <li key={key} className="flex items-start gap-3 px-3 py-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary">{q.providerName}</Badge>
                                  {q.transitDaysMin && q.transitDaysMax && (
                                    <span className="text-xs text-muted-foreground">{q.transitDaysMin}–{q.transitDaysMax} days</span>
                                  )}
                                  {q.validUntil && (
                                    <span className="text-xs text-muted-foreground">valid → {q.validUntil}</span>
                                  )}
                                  {q.externalRef && <span className="font-mono text-[10px] text-muted-foreground">{q.externalRef}</span>}
                                </div>
                                <div className="mt-0.5 text-xs">{q.summary}</div>
                              </div>
                              <Button
                                variant={saved ? "ghost" : "outline"}
                                size="sm"
                                disabled={saved || saving}
                                onClick={() => save(q)}
                              >
                                {saved ? (<><Check className="mr-1 size-4" /> Saved</>) : (<><Save className="mr-1 size-4" /> Save as lane</>)}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
