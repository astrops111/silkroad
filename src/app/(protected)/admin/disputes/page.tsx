"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Clock, CheckCircle2, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Dispute {
  id: string;
  title: string;
  type: string;
  status: string;
  disputed_amount: number | null;
  currency: string | null;
  created_at: string;
  buyer: { name: string } | null;
  supplier: { name: string } | null;
  order: { order_number: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "destructive",
  under_review: "secondary",
  awaiting_evidence: "outline",
  escalated: "destructive",
};

type Resolution = "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "dismissed";

function formatAmount(amount: number | null, currency: string | null) {
  if (!amount) return "—";
  return `${currency ?? "USD"} ${(amount / 100).toFixed(2)}`;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<Record<string, Resolution | "">>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});

  async function loadDisputes() {
    const res = await fetch("/api/admin/disputes");
    if (!res.ok) {
      toast.error("Failed to load disputes");
      setDisputes([]);
      return;
    }
    const data = await res.json();
    setDisputes(data.disputes ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDisputes();
  }, []);

  async function handleResolve(disputeId: string) {
    const resolution = selectedResolution[disputeId];
    if (!resolution) {
      toast.error("Please select a resolution");
      return;
    }
    setResolvingId(disputeId);
    const res = await fetch("/api/admin/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disputeId,
        resolution,
        refundAmount:
          resolution === "partial_refund_buyer" && refundAmounts[disputeId]
            ? Math.round(Number(refundAmounts[disputeId]) * 100)
            : undefined,
      }),
    });
    const data = await res.json();
    setResolvingId(null);
    if (!res.ok) {
      toast.error(data.error || "Failed to resolve dispute");
      return;
    }
    setDisputes((prev) => (prev ?? []).filter((d) => d.id !== disputeId));
    toast.success("Dispute resolved");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Disputes
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {disputes === null ? "Loading…" : `${disputes.length} open disputes requiring attention`}
        </p>
      </div>

      {disputes === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : disputes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
            <p className="text-lg font-semibold">No open disputes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Gavel className="w-4 h-4 text-[var(--danger)]" />
                      <p className="font-semibold text-[var(--obsidian)]">{dispute.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>Order: {dispute.order?.order_number ?? "—"}</span>
                      <span>Buyer: {dispute.buyer?.name ?? "—"}</span>
                      <span>Supplier: {dispute.supplier?.name ?? "—"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={(STATUS_COLORS[dispute.status] as "default" | "destructive" | "secondary" | "outline") ?? "outline"}>
                      {dispute.status === "open" && <AlertTriangle className="w-3 h-3" />}
                      {dispute.status === "under_review" && <Clock className="w-3 h-3" />}
                      {dispute.status === "awaiting_evidence" && <MessageSquare className="w-3 h-3" />}
                      {dispute.status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-lg font-bold text-[var(--obsidian)] mt-1" style={{ fontFamily: "var(--font-display)" }}>
                      {formatAmount(dispute.disputed_amount, dispute.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)] flex-wrap">
                  <Select
                    value={selectedResolution[dispute.id] ?? ""}
                    onValueChange={(v) => setSelectedResolution((p) => ({ ...p, [dispute.id]: v as Resolution }))}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select resolution..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_pay_supplier">Release payment to supplier</SelectItem>
                      <SelectItem value="partial_refund_buyer">Partial refund to buyer</SelectItem>
                      <SelectItem value="full_refund_buyer">Full refund to buyer</SelectItem>
                      <SelectItem value="dismissed">Dismiss dispute</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedResolution[dispute.id] === "partial_refund_buyer" && (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Refund amount"
                      className="w-36"
                      value={refundAmounts[dispute.id] ?? ""}
                      onChange={(e) => setRefundAmounts((p) => ({ ...p, [dispute.id]: e.target.value }))}
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleResolve(dispute.id)}
                    disabled={resolvingId === dispute.id || !selectedResolution[dispute.id]}
                  >
                    {resolvingId === dispute.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    Resolve
                  </Button>
                  <Link
                    href={`/admin/disputes/${dispute.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80"
                    style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
                  >
                    View Details
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
