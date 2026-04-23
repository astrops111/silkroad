"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
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
import { clearScreening, rejectScreening } from "@/lib/actions/screening";
import type { ScreeningQueueRow } from "@/lib/queries/screening";
import type { ScreeningMatch } from "@/lib/screening/types";

type Action = "clear" | "reject";

export function ScreeningQueueList({ initialQueue }: { initialQueue: ScreeningQueueRow[] }) {
  const router = useRouter();
  const [pending, startReview] = useTransition();
  const [active, setActive] = useState<{ row: ScreeningQueueRow; action: Action } | null>(null);
  const [notes, setNotes] = useState("");

  function open(row: ScreeningQueueRow, action: Action) {
    setActive({ row, action });
    setNotes("");
  }

  function submit() {
    if (!active) return;
    startReview(async () => {
      const fn = active.action === "clear" ? clearScreening : rejectScreening;
      const res = await fn(active.row.id, notes);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(active.action === "clear" ? "Cleared — quote returned to draft" : "Rejected — quote archived");
      setActive(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {initialQueue.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-10 text-center">
          <ShieldCheck className="mx-auto mb-2 size-8 text-emerald-600" />
          <p className="text-sm font-medium">No quotes pending review</p>
          <p className="text-xs text-muted-foreground">All recent screening checks cleared automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialQueue.map((row) => {
            const matches = (row.matches ?? []) as unknown as ScreeningMatch[];
            const query = (row.query ?? {}) as { name?: string; company?: string; country?: string };
            return (
              <div key={row.id} className="overflow-hidden rounded-lg border">
                <div className="flex items-start justify-between gap-4 border-b bg-amber-50 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-700" />
                      <span className="text-sm font-semibold text-amber-900">
                        {row.subject_type === "ops_quote" ? `Quote ${row.quote_number}` : `Subject ${row.subject_id.slice(0, 8)}`}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        score {row.top_score?.toFixed(2) ?? "—"}
                      </Badge>
                    </div>
                    <div className="text-sm text-amber-900">
                      {query.name && <span>{query.name}</span>}
                      {query.company && <span className="text-amber-800"> · {query.company}</span>}
                      {query.country && <span className="text-amber-800"> · {query.country}</span>}
                    </div>
                    <div className="text-xs text-amber-800">
                      Provider: {row.provider} · checked {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {row.subject_type === "ops_quote" && row.quote_number && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/logistics/quotes/${row.subject_id}`}>
                          <ExternalLink className="mr-1 size-3" /> Open quote
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => open(row, "clear")}>
                      <Check className="mr-1 size-3" /> Clear
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => open(row, "reject")}>
                      <X className="mr-1 size-3" /> Reject
                    </Button>
                  </div>
                </div>
                <div className="divide-y">
                  {matches.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground">No match details returned.</div>
                  )}
                  {matches.slice(0, 5).map((m) => (
                    <div key={m.entityId} className="flex items-start justify-between gap-4 px-4 py-2 text-sm">
                      <div className="space-y-0.5">
                        <div className="font-medium">{m.name}</div>
                        <div className="flex flex-wrap gap-1">
                          {m.lists.slice(0, 6).map((l) => (
                            <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
                          ))}
                        </div>
                        {m.topics && m.topics.length > 0 && (
                          <div className="text-xs text-muted-foreground">{m.topics.join(", ")}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className="font-mono text-xs">{m.score.toFixed(3)}</span>
                        {m.url && (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline"
                          >
                            source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {active?.action === "clear" ? "Clear screening hit" : "Reject screening hit"}
            </DialogTitle>
            <DialogDescription>
              {active?.action === "clear"
                ? "Quote will return to draft. The audit row keeps the original hit + matches for compliance."
                : "Quote will be archived and removed from the active pipeline. The hit is preserved on the audit trail."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Decision notes (required)</label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                active?.action === "clear"
                  ? "e.g. Verified false positive — name match only, country and company differ from sanctioned entity."
                  : "e.g. Confirmed match against OFAC SDN — owner is on US sanctions list as of 2025-08."
              }
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)} disabled={pending}>Cancel</Button>
            <Button
              variant={active?.action === "clear" ? "default" : "destructive"}
              onClick={submit}
              disabled={pending || notes.trim().length < 5}
            >
              {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Confirm {active?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
