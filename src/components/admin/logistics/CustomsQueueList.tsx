"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Filter, Lock, ShieldCheck } from "lucide-react";
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
import type { CustomsQueueRow, CustomsStatus } from "@/lib/queries/customs";

const STATUS_OPTIONS: (CustomsStatus | "all")[] = [
  "all", "pending", "preparing", "submitted", "on_hold", "cleared", "rejected", "not_required",
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

export function CustomsQueueList({ initialQueue }: { initialQueue: CustomsQueueRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomsStatus | "all">("all");
  const [destFilter, setDestFilter] = useState<string>("all");

  const destinations = useMemo(() => {
    const set = new Set<string>();
    initialQueue.forEach((r) => r.delivery_country && set.add(r.delivery_country));
    return ["all", ...[...set].sort()];
  }, [initialQueue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialQueue.filter((r) => {
      if (statusFilter !== "all" && r.customs_status !== statusFilter) return false;
      if (destFilter !== "all" && r.delivery_country !== destFilter) return false;
      if (q) {
        const hay = `${r.shipment_number} ${r.customs_declaration_no ?? ""} ${r.customs_broker_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialQueue, query, statusFilter, destFilter]);

  const onHoldCount = filtered.filter((r) => r.customs_status === "on_hold").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search shipment / declaration / broker"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CustomsStatus | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All active statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={destFilter} onValueChange={(v) => setDestFilter(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {destinations.map((d) => (
              <SelectItem key={d} value={d}>{d === "all" ? "All countries" : d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {onHoldCount > 0 && (
            <span className="inline-flex items-center gap-1 text-red-700">
              <Lock className="size-3" /> {onHoldCount} on hold
            </span>
          )}
          <span>{filtered.length} of {initialQueue.length}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Shipment</th>
              <th className="px-3 py-2 text-left">Destination</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Declaration / broker</th>
              <th className="px-3 py-2 text-left">Holds</th>
              <th className="px-3 py-2 text-left">ETA</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-1 size-4 opacity-50" />
                  Nothing in the customs queue.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{r.shipment_number}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.delivery_country ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[r.customs_status]}>{r.customs_status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.customs_declaration_no ?? <span className="text-muted-foreground">no SAD #</span>}</div>
                    {r.customs_broker_name && (
                      <div className="text-muted-foreground">{r.customs_broker_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.open_holds > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <AlertTriangle className="size-3" />
                        {r.open_holds} ({r.most_recent_hold_reason?.replace(/_/g, " ")})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.estimated_delivery_at ? new Date(r.estimated_delivery_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/logistics/shipments/${r.id}`}>
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {initialQueue.length === 0 && (
        <div className="text-center text-xs text-muted-foreground">
          <Filter className="mx-auto mb-1 size-3 opacity-50" />
          No active customs work. Shipments enter this queue with status &ldquo;pending&rdquo; on creation.
        </div>
      )}
    </div>
  );
}
