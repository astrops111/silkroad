"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Clock, CheckCircle2, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const DISPUTES = [
  {
    id: "d1",
    title: "Damaged goods on arrival",
    type: "damaged",
    buyer: "TechHub Ghana",
    supplier: "SunTech Shenzhen",
    orderNumber: "SR-20260408-003",
    amount: "$2,400",
    status: "open",
    createdAt: "2026-04-14",
  },
  {
    id: "d2",
    title: "Wrong item received - ordered blue, received red",
    type: "wrong_item",
    buyer: "Nairobi Imports Ltd",
    supplier: "Silk Valley Textiles",
    orderNumber: "SR-20260405-012",
    amount: "$560",
    status: "under_review",
    createdAt: "2026-04-12",
  },
  {
    id: "d3",
    title: "Quantity mismatch - received 450 of 500 ordered",
    type: "quantity_mismatch",
    buyer: "Cairo Electronics",
    supplier: "BrightPath Lighting",
    orderNumber: "SR-20260401-008",
    amount: "$1,425",
    status: "awaiting_evidence",
    createdAt: "2026-04-10",
  },
];

const STATUS_COLORS: Record<string, string> = {
  open: "destructive",
  under_review: "secondary",
  awaiting_evidence: "outline",
  resolved: "default",
};

type Resolution = "full_pay_supplier" | "partial_refund_buyer" | "full_refund_buyer" | "dismissed";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState(DISPUTES);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<Record<string, string>>({});

  async function handleResolve(disputeId: string) {
    const resolution = selectedResolution[disputeId];
    if (!resolution) {
      toast.error("Please select a resolution");
      return;
    }
    setResolvingId(disputeId);
    await new Promise((r) => setTimeout(r, 800));
    setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
    setResolvingId(null);
    toast.success("Dispute resolved");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Disputes
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {disputes.length} open disputes requiring attention
        </p>
      </div>

      {disputes.length === 0 ? (
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
                      <span>Order: {dispute.orderNumber}</span>
                      <span>Buyer: {dispute.buyer}</span>
                      <span>Supplier: {dispute.supplier}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={STATUS_COLORS[dispute.status] as "default" | "destructive" | "secondary" | "outline"}>
                      {dispute.status === "open" && <AlertTriangle className="w-3 h-3" />}
                      {dispute.status === "under_review" && <Clock className="w-3 h-3" />}
                      {dispute.status === "awaiting_evidence" && <MessageSquare className="w-3 h-3" />}
                      {dispute.status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-lg font-bold text-[var(--obsidian)] mt-1" style={{ fontFamily: "var(--font-display)" }}>
                      {dispute.amount}
                    </p>
                  </div>
                </div>

                {/* Resolution controls */}
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <Select
                    value={selectedResolution[dispute.id] ?? ""}
                    onValueChange={(v) => setSelectedResolution((p) => ({ ...p, [dispute.id]: v }))}
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
                  <Button
                    size="sm"
                    onClick={() => handleResolve(dispute.id)}
                    disabled={resolvingId === dispute.id || !selectedResolution[dispute.id]}
                  >
                    {resolvingId === dispute.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    Resolve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
