"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Loader2, MapPin, Plus } from "lucide-react";
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
  addTrackingEvent,
  setShipmentStatus,
  type ShipmentStatus,
} from "@/lib/actions/tracking";
import type { Tables } from "@/lib/supabase/database.types";

type EventRow = Tables<"shipment_tracking_events">;

const STATUSES: ShipmentStatus[] = [
  "pending", "assigned", "driver_accepted", "picking", "packed",
  "dispatched", "in_transit", "at_hub", "out_for_delivery",
  "delivery_attempted", "delivered", "returned", "lost", "damaged",
];

const STATUS_VARIANT: Partial<Record<ShipmentStatus, "default" | "secondary" | "outline" | "destructive">> = {
  delivered: "default",
  in_transit: "secondary",
  dispatched: "secondary",
  out_for_delivery: "secondary",
  lost: "destructive",
  damaged: "destructive",
  returned: "destructive",
};

export function ShipmentTrackingPanel({
  shipmentId,
  currentStatus,
  events,
}: {
  shipmentId: string;
  currentStatus: ShipmentStatus;
  events: EventRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventType, setEventType] = useState("status_update");
  const [description, setDescription] = useState("");
  const [locLabel, setLocLabel] = useState("");
  const [newStatus, setNewStatus] = useState<ShipmentStatus | "">("");
  const [pending, startTransition] = useTransition();
  const [transitioning, startTransition2] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await addTrackingEvent({
        shipmentId,
        eventType: eventType || "status_update",
        description: description || undefined,
        location: locLabel ? { label: locLabel } : undefined,
        newStatus: newStatus || undefined,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Event added");
      setDialogOpen(false);
      setEventType("status_update");
      setDescription("");
      setLocLabel("");
      setNewStatus("");
      router.refresh();
    });
  }

  function changeStatus(next: ShipmentStatus) {
    startTransition2(async () => {
      const res = await setShipmentStatus(shipmentId, next);
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`Status → ${next}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">Change status:</div>
        <Select value={currentStatus} onValueChange={(v) => changeStatus(v as ShipmentStatus)} disabled={transitioning}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        {transitioning && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto" />
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-4" /> Add event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tracking events yet. Changing status or adding an event will populate this timeline.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-muted pl-4">
          {events.map((e) => {
            const statusFromEvent = e.event_type.startsWith("status_")
              ? (e.event_type.replace("status_", "") as ShipmentStatus)
              : null;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 block size-3 rounded-full border-2 border-background bg-foreground" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{e.event_type.replace(/_/g, " ")}</span>
                  {statusFromEvent && STATUS_VARIANT[statusFromEvent] && (
                    <Badge variant={STATUS_VARIANT[statusFromEvent]}>{statusFromEvent.replace(/_/g, " ")}</Badge>
                  )}
                </div>
                {e.description && <div className="mt-0.5 text-sm">{e.description}</div>}
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </span>
                  {e.location && typeof e.location === "object" && (e.location as { label?: string }).label && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {(e.location as { label: string }).label}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tracking event</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <F label="Event type">
              <Input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="arrived_at_port / customs_hold / bl_released / etc."
              />
            </F>
            <F label="Description">
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </F>
            <F label="Location label">
              <Input
                value={locLabel}
                onChange={(e) => setLocLabel(e.target.value)}
                placeholder="e.g. Mombasa Port / Customs Warehouse B"
              />
            </F>
            <F label="Also advance status to (optional)">
              <Select value={newStatus || "_none"} onValueChange={(v) => setNewStatus(v === "_none" ? "" : (v as ShipmentStatus))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">(don't change status)</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={pending}>
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Add event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
