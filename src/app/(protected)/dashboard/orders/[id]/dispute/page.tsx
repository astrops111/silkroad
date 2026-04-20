"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gavel, Loader2 } from "lucide-react";
import { openDispute } from "@/lib/actions/disputes";
import { toast } from "sonner";

const DISPUTE_TYPES = [
  { value: "product_quality", label: "Product Quality Issue" },
  { value: "wrong_item", label: "Wrong Item Received" },
  { value: "not_delivered", label: "Not Delivered" },
  { value: "damaged", label: "Damaged Goods" },
  { value: "quantity_mismatch", label: "Quantity Mismatch" },
  { value: "late_delivery", label: "Late Delivery" },
  { value: "fraud", label: "Suspected Fraud" },
  { value: "other", label: "Other" },
];

export default function DisputePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const orderId = params.id as string;

  const [form, setForm] = useState({
    type: "",
    title: "",
    description: "",
    disputedAmount: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.title || !form.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const result = await openDispute(
      orderId,
      "purchase-order-id",
      "current-user",
      "current-company",
      "supplier-company",
      {
        type: form.type,
        title: form.title,
        description: form.description,
        disputedAmount: form.disputedAmount ? parseFloat(form.disputedAmount) : undefined,
      }
    );

    if (!result.success) {
      toast.error(result.error ?? "Failed to open dispute");
      setLoading(false);
      return;
    }

    toast.success("Dispute opened. Our team will review it within 48 hours.");
    router.push("/dashboard/orders");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/orders/${orderId}`} className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Open a Dispute
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-[var(--danger)]" />
            Report an Issue
          </CardTitle>
          <CardDescription>
            Describe the issue with your order. Our team will review and respond within 48 hours.
            Payment to the supplier will be held until the dispute is resolved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the type of issue" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue in detail. Include what you expected vs what you received."
                rows={5}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Disputed Amount (optional)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={form.disputedAmount}
                onChange={(e) => setForm((p) => ({ ...p, disputedAmount: e.target.value }))}
                placeholder="Amount in dispute (USD)"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Gavel className="w-4 h-4" />}
              {loading ? "Submitting..." : "Submit Dispute"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
