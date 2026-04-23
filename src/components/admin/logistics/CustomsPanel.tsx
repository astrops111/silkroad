"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Lock,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markCustomsCleared,
  openCustomsHold,
  resolveCustomsHold,
  saveCustomsBroker,
  setCustomsStatus,
} from "@/lib/actions/customs";
import type {
  CustomsHoldReason,
  CustomsHoldRow,
  CustomsStatus,
} from "@/lib/queries/customs";

const STATUSES: CustomsStatus[] = [
  "not_required", "pending", "preparing", "submitted", "on_hold", "cleared", "rejected",
];

const STATUS_VARIANT: Record<CustomsStatus, "default" | "secondary" | "outline" | "destructive"> = {
  not_required: "outline",
  pending: "outline",
  preparing: "secondary",
  submitted: "secondary",
  on_hold: "destructive",
  cleared: "default",
  rejected: "destructive",
};

const HOLD_REASONS: CustomsHoldReason[] = [
  "missing_documents", "valuation_query", "classification_dispute",
  "license_required", "inspection_pending", "duty_unpaid", "restricted_goods", "other",
];

interface Props {
  shipmentId: string;
  shipment: {
    customs_status: CustomsStatus;
    customs_declaration_no: string | null;
    customs_broker_name: string | null;
    customs_broker_ref: string | null;
    customs_filed_at: string | null;
    customs_cleared_at: string | null;
    customs_duty_paid_minor: number | null;
    customs_vat_paid_minor: number | null;
    customs_other_paid_minor: number | null;
    customs_paid_currency: string | null;
    customs_notes: string | null;
    delivery_country: string | null;
  };
  holds: CustomsHoldRow[];
}

type DialogKind = "advance" | "broker" | "hold" | "resolve" | "cleared" | null;

export function CustomsPanel({ shipmentId, shipment, holds }: Props) {
  const router = useRouter();
  const [pending, startMutation] = useTransition();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [resolveTarget, setResolveTarget] = useState<CustomsHoldRow | null>(null);

  const [advanceTo, setAdvanceTo] = useState<CustomsStatus>(shipment.customs_status);
  const [broker, setBroker] = useState({
    name: shipment.customs_broker_name ?? "",
    ref: shipment.customs_broker_ref ?? "",
    declaration: shipment.customs_declaration_no ?? "",
    notes: shipment.customs_notes ?? "",
  });
  const [hold, setHold] = useState({ reason: "missing_documents" as CustomsHoldReason, notes: "", externalRef: "" });
  const [resolveNotes, setResolveNotes] = useState("");
  const [cleared, setCleared] = useState({
    declarationNo: shipment.customs_declaration_no ?? "",
    brokerName: shipment.customs_broker_name ?? "",
    brokerRef: shipment.customs_broker_ref ?? "",
    dutyMajor: "",
    vatMajor: "",
    otherMajor: "",
    currency: shipment.customs_paid_currency ?? "USD",
    notes: "",
  });

  const openHolds = holds.filter((h) => !h.resolved_at);
  const resolvedHolds = holds.filter((h) => h.resolved_at);

  function fmt(minor: number | null): string {
    if (minor == null) return "—";
    return `${(minor / 100).toFixed(2)} ${shipment.customs_paid_currency ?? ""}`;
  }

  function submitAdvance() {
    startMutation(async () => {
      const res = await setCustomsStatus(shipmentId, advanceTo);
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`Status: ${advanceTo}`);
      setDialog(null);
      router.refresh();
    });
  }

  function submitBroker() {
    startMutation(async () => {
      const res = await saveCustomsBroker({
        shipmentId,
        brokerName: broker.name,
        brokerRef: broker.ref,
        declarationNo: broker.declaration,
        notes: broker.notes,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Broker details saved");
      setDialog(null);
      router.refresh();
    });
  }

  function submitHold() {
    if (hold.notes.trim().length < 5) {
      toast.error("Notes are required (min 5 chars)");
      return;
    }
    startMutation(async () => {
      const res = await openCustomsHold({
        shipmentId,
        reason: hold.reason,
        notes: hold.notes,
        externalRef: hold.externalRef || undefined,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Hold opened");
      setHold({ reason: "missing_documents", notes: "", externalRef: "" });
      setDialog(null);
      router.refresh();
    });
  }

  function submitResolve() {
    if (!resolveTarget) return;
    if (resolveNotes.trim().length < 5) {
      toast.error("Resolution notes are required (min 5 chars)");
      return;
    }
    startMutation(async () => {
      const res = await resolveCustomsHold(resolveTarget.id, resolveNotes);
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Hold resolved");
      setResolveTarget(null);
      setResolveNotes("");
      setDialog(null);
      router.refresh();
    });
  }

  function submitCleared() {
    startMutation(async () => {
      const toMinor = (s: string) => (s ? Math.round(Number(s) * 100) : undefined);
      const res = await markCustomsCleared({
        shipmentId,
        declarationNo: cleared.declarationNo || undefined,
        brokerName: cleared.brokerName || undefined,
        brokerRef: cleared.brokerRef || undefined,
        dutyPaidMinor: toMinor(cleared.dutyMajor),
        vatPaidMinor: toMinor(cleared.vatMajor),
        otherPaidMinor: toMinor(cleared.otherMajor),
        paidCurrency: cleared.currency,
        notes: cleared.notes || undefined,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Marked cleared — duty/VAT recorded as cost actuals");
      setDialog(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={STATUS_VARIANT[shipment.customs_status]} className="text-sm">
          {shipment.customs_status.replace(/_/g, " ")}
        </Badge>
        {shipment.delivery_country && (
          <span className="text-xs text-muted-foreground">→ {shipment.delivery_country}</span>
        )}
        {shipment.customs_declaration_no && (
          <span className="font-mono text-xs">SAD #{shipment.customs_declaration_no}</span>
        )}
        {shipment.customs_broker_name && (
          <span className="text-xs text-muted-foreground">via {shipment.customs_broker_name}</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setAdvanceTo(shipment.customs_status); setDialog("advance"); }}>
            <Send className="mr-1 size-3" /> Set status
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("broker")}>
            <ClipboardList className="mr-1 size-3" /> Broker / SAD
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDialog("hold")}>
            <AlertTriangle className="mr-1 size-3" /> Open hold
          </Button>
          {shipment.customs_status !== "cleared" && (
            <Button size="sm" onClick={() => setDialog("cleared")}>
              <CheckCircle2 className="mr-1 size-3" /> Mark cleared
            </Button>
          )}
        </div>
      </div>

      {/* Open holds banner */}
      {openHolds.length > 0 && (
        <div className="space-y-2">
          {openHolds.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-red-700" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px]">{h.reason.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-red-900">opened {new Date(h.opened_at).toLocaleString()}</span>
                  {h.external_ref && (
                    <span className="font-mono text-xs text-red-900">ref: {h.external_ref}</span>
                  )}
                </div>
                <p className="text-red-900">{h.notes}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setResolveTarget(h); setResolveNotes(""); setDialog("resolve"); }}
              >
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Filing + clearance summary */}
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <KV k="Filed at" v={shipment.customs_filed_at ? new Date(shipment.customs_filed_at).toLocaleString() : "—"} />
        <KV k="Cleared at" v={shipment.customs_cleared_at ? new Date(shipment.customs_cleared_at).toLocaleString() : "—"} />
        <KV k="Duty paid" v={fmt(shipment.customs_duty_paid_minor)} />
        <KV k="VAT paid" v={fmt(shipment.customs_vat_paid_minor)} />
        <KV k="Other fees" v={fmt(shipment.customs_other_paid_minor)} />
        <KV k="Broker ref" v={shipment.customs_broker_ref ?? "—"} />
        <KV k="Notes" v={shipment.customs_notes ?? "—"} />
      </div>

      {/* Resolved holds history */}
      {resolvedHolds.length > 0 && (
        <details className="rounded-md border bg-muted/20 p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Resolved holds ({resolvedHolds.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {resolvedHolds.map((h) => (
              <li key={h.id} className="rounded border bg-background p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{h.reason.replace(/_/g, " ")}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(h.opened_at).toLocaleDateString()} → {h.resolved_at ? new Date(h.resolved_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="mt-1">{h.notes}</div>
                {h.resolution_notes && (
                  <div className="mt-1 text-muted-foreground">
                    <ShieldCheck className="mr-1 inline size-3" />
                    {h.resolution_notes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Dialogs */}
      <Dialog open={dialog === "advance"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set customs status</DialogTitle>
            <DialogDescription>Manual override. Auto-stamps filed_at on submitted, cleared_at on cleared.</DialogDescription>
          </DialogHeader>
          <Select value={advanceTo} onValueChange={(v) => setAdvanceTo(v as CustomsStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>
            <Button onClick={submitAdvance} disabled={pending}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "broker"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broker & declaration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Broker name">
              <Input value={broker.name} onChange={(e) => setBroker({ ...broker, name: e.target.value })} placeholder="e.g. Mitchell Cotts" />
            </Field>
            <Field label="Broker reference">
              <Input value={broker.ref} onChange={(e) => setBroker({ ...broker, ref: e.target.value })} placeholder="Internal broker case #" />
            </Field>
            <Field label="Declaration #">
              <Input value={broker.declaration} onChange={(e) => setBroker({ ...broker, declaration: e.target.value })} placeholder="SAD / Form C / etc." />
            </Field>
            <Field label="Notes">
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={broker.notes}
                onChange={(e) => setBroker({ ...broker, notes: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>
            <Button onClick={submitBroker} disabled={pending}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "hold"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open customs hold</DialogTitle>
            <DialogDescription>Flips the shipment to on_hold and surfaces in the customs queue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Reason">
              <Select value={hold.reason} onValueChange={(v) => setHold({ ...hold, reason: v as CustomsHoldReason })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLD_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Customs reference (optional)">
              <Input value={hold.externalRef} onChange={(e) => setHold({ ...hold, externalRef: e.target.value })} placeholder="Hold case # from authority" />
            </Field>
            <Field label="Notes (required)">
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                rows={3}
                value={hold.notes}
                onChange={(e) => setHold({ ...hold, notes: e.target.value })}
                placeholder="What was flagged? What's needed to release?"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>
            <Button variant="destructive" onClick={submitHold} disabled={pending || hold.notes.trim().length < 5}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}Open hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "resolve"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve hold</DialogTitle>
            <DialogDescription>
              {resolveTarget && (
                <>
                  <Badge variant="outline" className="mr-1">{resolveTarget.reason.replace(/_/g, " ")}</Badge>
                  Opened {resolveTarget && new Date(resolveTarget.opened_at).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {resolveTarget && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Original notes</div>
              {resolveTarget.notes}
            </div>
          )}
          <Field label="Resolution notes (required)">
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              rows={3}
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="What was done to resolve this?"
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>
            <Button onClick={submitResolve} disabled={pending || resolveNotes.trim().length < 5}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cleared"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark customs cleared</DialogTitle>
            <DialogDescription>
              Records duty / VAT / other fees actually paid. These also flow into Cost Actuals so the variance card
              picks them up automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Declaration #">
              <Input value={cleared.declarationNo} onChange={(e) => setCleared({ ...cleared, declarationNo: e.target.value })} />
            </Field>
            <Field label="Currency">
              <Input
                value={cleared.currency}
                onChange={(e) => setCleared({ ...cleared, currency: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
              />
            </Field>
            <Field label="Broker name">
              <Input value={cleared.brokerName} onChange={(e) => setCleared({ ...cleared, brokerName: e.target.value })} />
            </Field>
            <Field label="Broker ref">
              <Input value={cleared.brokerRef} onChange={(e) => setCleared({ ...cleared, brokerRef: e.target.value })} />
            </Field>
            <Field label={`Duty paid (${cleared.currency})`}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={cleared.dutyMajor}
                onChange={(e) => setCleared({ ...cleared, dutyMajor: e.target.value })}
              />
            </Field>
            <Field label={`VAT paid (${cleared.currency})`}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={cleared.vatMajor}
                onChange={(e) => setCleared({ ...cleared, vatMajor: e.target.value })}
              />
            </Field>
            <Field label={`Other fees (${cleared.currency})`}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={cleared.otherMajor}
                onChange={(e) => setCleared({ ...cleared, otherMajor: e.target.value })}
                placeholder="Excise / IDF / RDL / etc."
              />
            </Field>
            <Field label="Notes">
              <Input value={cleared.notes} onChange={(e) => setCleared({ ...cleared, notes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</Button>
            <Button onClick={submitCleared} disabled={pending}>
              {pending && <Loader2 className="mr-1 size-4 animate-spin" />}Mark cleared
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate text-xs font-medium">{v}</div>
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
