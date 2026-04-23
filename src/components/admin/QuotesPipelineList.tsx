"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PipelineRow,
  PipelineSource,
  PipelineStage,
} from "@/lib/queries/quotes-pipeline";

const SOURCES: PipelineSource[] = ["rfq_quotation", "buyer_request", "ops_freight_quote"];
const STAGES: PipelineStage[] = ["new", "draft", "active", "won", "lost"];

const STAGE_VARIANT: Record<PipelineStage, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  draft: "outline",
  active: "secondary",
  won: "default",
  lost: "destructive",
};

const SOURCE_VARIANT: Record<PipelineSource, "default" | "secondary" | "outline"> = {
  rfq_quotation: "secondary",
  buyer_request: "default",
  ops_freight_quote: "outline",
};

export function QuotesPipelineList({ initialRows }: { initialRows: PipelineRow[] }) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<PipelineSource | "all">("all");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (stageFilter !== "all" && r.stage !== stageFilter) return false;
      if (q) {
        const hay = `${r.number} ${r.title} ${r.requesterName ?? ""} ${r.requesterCompany ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialRows, query, sourceFilter, stageFilter]);

  const countsByStage = useMemo(() => {
    const counts: Record<PipelineStage, number> = { new: 0, draft: 0, active: 0, won: 0, lost: 0 };
    for (const r of filtered) counts[r.stage]++;
    return counts;
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search number / title / requester"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as PipelineSource | "all")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as PipelineStage | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(stageFilter === s ? "all" : s)}
            className={`rounded-md border p-2 text-left transition-colors ${
              stageFilter === s ? "border-foreground/40 bg-muted/60" : "hover:bg-muted/30"
            }`}
          >
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s}</div>
            <div className="text-lg font-semibold">{countsByStage[s]}</div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Requester</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.key} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{r.number}</td>
                <td className="px-3 py-2">
                  <Badge variant={SOURCE_VARIANT[r.source]}>{r.sourceLabel}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="max-w-xs truncate">{r.title}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{r.requesterName ?? <span className="text-muted-foreground">—</span>}</div>
                  {r.requesterCompany && <div className="text-xs text-muted-foreground">{r.requesterCompany}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {(r.originCountry ?? "—")} → {(r.destinationCountry ?? "—")}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {r.valueMinor != null
                    ? `${(r.valueMinor / 100).toFixed(2)} ${r.currency ?? ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={STAGE_VARIANT[r.stage]}>{r.stage}</Badge>
                  <div className="text-[10px] text-muted-foreground">{r.rawStatus}</div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={r.detailUrl}
                    className="inline-flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  <Filter className="mx-auto mb-1 size-4 opacity-50" />
                  No rows match the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right text-xs text-muted-foreground">
        {filtered.length} of {initialRows.length} rows across {SOURCES.length} sources
      </div>
    </div>
  );
}
