"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Container, Loader2, Power, Save } from "lucide-react";
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
import { saveOceanTracking } from "@/lib/actions/ocean-tracking";

interface Props {
  shipmentId: string;
  initial: {
    containerNumber: string | null;
    sealNumber: string | null;
    billOfLading: string | null;
    bookingNumber: string | null;
    carrierScac: string | null;
    vesselName: string | null;
    voyageNo: string | null;
    trackingProvider: string | null;
    trackingExternalRef: string | null;
    lastPolledAt: string | null;
  };
}

const PROVIDER_OPTIONS = [
  { value: "off", label: "Off (manual events only)" },
  { value: "searates", label: "Searates" },
];

export function OceanTrackingPanel({ shipmentId, initial }: Props) {
  const router = useRouter();
  const [pending, startMutation] = useTransition();
  const [form, setForm] = useState({
    containerNumber: initial.containerNumber ?? "",
    sealNumber: initial.sealNumber ?? "",
    billOfLading: initial.billOfLading ?? "",
    bookingNumber: initial.bookingNumber ?? "",
    carrierScac: initial.carrierScac ?? "",
    vesselName: initial.vesselName ?? "",
    voyageNo: initial.voyageNo ?? "",
    trackingProvider: initial.trackingProvider ?? "off",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    const provider = form.trackingProvider === "off" ? null : form.trackingProvider;
    const externalRef = provider ? (form.containerNumber || form.billOfLading || form.bookingNumber) : null;

    if (provider && !externalRef) {
      toast.error("Container #, BoL, or booking # is required to activate tracking");
      return;
    }

    startMutation(async () => {
      const res = await saveOceanTracking({
        shipmentId,
        containerNumber: form.containerNumber,
        sealNumber: form.sealNumber,
        billOfLading: form.billOfLading,
        bookingNumber: form.bookingNumber,
        carrierScac: form.carrierScac,
        vesselName: form.vesselName,
        voyageNo: form.voyageNo,
        trackingProvider: provider,
        trackingExternalRef: externalRef,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(provider ? `Tracking activated via ${provider}` : "Saved");
      router.refresh();
    });
  }

  const trackingActive = initial.trackingProvider != null;

  return (
    <div className="space-y-3">
      {trackingActive && (
        <div className="flex items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          <Power className="size-4 text-emerald-700" />
          <span className="flex-1">
            Auto-tracking active via{" "}
            <Badge variant="secondary">{initial.trackingProvider}</Badge>
            {initial.trackingExternalRef && (
              <> on <span className="font-mono text-xs">{initial.trackingExternalRef}</span></>
            )}
          </span>
          <span className="text-xs text-emerald-800">
            Last polled: {initial.lastPolledAt ? new Date(initial.lastPolledAt).toLocaleString() : "never"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Field label="Container #">
          <Input value={form.containerNumber} onChange={(e) => set("containerNumber", e.target.value.toUpperCase())} placeholder="MSCU1234567" />
        </Field>
        <Field label="Seal #">
          <Input value={form.sealNumber} onChange={(e) => set("sealNumber", e.target.value)} />
        </Field>
        <Field label="Bill of lading">
          <Input value={form.billOfLading} onChange={(e) => set("billOfLading", e.target.value.toUpperCase())} placeholder="MAEU2345678" />
        </Field>
        <Field label="Booking #">
          <Input value={form.bookingNumber} onChange={(e) => set("bookingNumber", e.target.value)} />
        </Field>
        <Field label="Carrier SCAC">
          <Input
            value={form.carrierScac}
            onChange={(e) => set("carrierScac", e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4}
            placeholder="MAEU / MSCU / CMDU"
          />
        </Field>
        <Field label="Tracking provider">
          <Select value={form.trackingProvider} onValueChange={(v) => set("trackingProvider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vessel">
          <Input value={form.vesselName} onChange={(e) => set("vesselName", e.target.value)} />
        </Field>
        <Field label="Voyage #">
          <Input value={form.voyageNo} onChange={(e) => set("voyageNo", e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : form.trackingProvider !== "off" ? <Container className="mr-1 size-4" /> : <Save className="mr-1 size-4" />}
          {form.trackingProvider !== "off" && !trackingActive ? "Activate tracking" : "Save"}
        </Button>
      </div>
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
