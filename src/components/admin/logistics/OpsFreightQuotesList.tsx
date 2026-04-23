"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ExternalLink, Filter, Plus } from "lucide-react";
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
import type {
  OpsFreightQuoteRow,
  OpsQuoteRequesterType,
  OpsQuoteStatus,
} from "@/lib/queries/ops-freight-quotes";

const STATUSES: OpsQuoteStatus[] = [
  "draft", "pending_screening", "quoted", "sent", "accepted", "declined", "expired", "archived",
];

const STATUS_VARIANT: Record<OpsQuoteStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending_screening: "destructive",
  quoted: "secondary",
  sent: "default",
  accepted: "default",
  declined: "destructive",
  expired: "outline",
  archived: "outline",
};

const REQUESTER_TYPES: OpsQuoteRequesterType[] = [
  "forwarder", "walk_in", "partner", "internal", "other",
];

export function OpsFreightQuotesList({ initialQuotes }: { initialQuotes: OpsFreightQuoteRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpsQuoteStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<OpsQuoteRequesterType | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialQuotes.filter((qr) => {
      if (statusFilter !== "all" && qr.status !== statusFilter) return false;
      if (typeFilter !== "all" && qr.requester_type !== typeFilter) return false;
      if (q) {
        const hay = `${qr.quote_number} ${qr.requester_name ?? ""} ${qr.requester_company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialQuotes, query, statusFilter, typeFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search quote # / requester"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OpsQuoteStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as OpsQuoteRequesterType | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requester types</SelectItem>
            {REQUESTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto" />
        <Button asChild size="sm">
          <Link href="/admin/logistics/quotes/new">
            <Plus className="mr-1 size-4" /> New quote
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Quote #</th>
              <th className="px-3 py-2 text-left">Requester</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Container</th>
              <th className="px-3 py-2 text-right">Quoted</th>
              <th className="px-3 py-2 text-left">Valid until</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{q.quote_number}</td>
                <td className="px-3 py-2">
                  <div>{q.requester_name ?? <span className="text-muted-foreground">—</span>}</div>
                  {q.requester_company && (
                    <div className="text-xs text-muted-foreground">{q.requester_company}</div>
                  )}
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {q.requester_type.replace("_", " ")}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {q.origin_country ?? "—"} → {q.destination_country ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs">{q.container_type ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {q.quoted_amount != null
                    ? `${(q.quoted_amount / 100).toFixed(2)} ${q.quoted_currency ?? ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {q.valid_until ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {q.valid_until}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/logistics/quotes/${q.id}`}>
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  <Filter className="mx-auto mb-1 size-4 opacity-50" />
                  No quotes match the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right text-xs text-muted-foreground">
        {filtered.length} of {initialQuotes.length} quotes
      </div>
    </div>
  );
}
