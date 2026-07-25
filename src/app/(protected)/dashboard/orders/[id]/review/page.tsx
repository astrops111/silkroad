"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Star, Loader2, Send } from "lucide-react";
import { submitReview } from "@/lib/actions/reviews";
import { toast } from "sonner";

interface SupplierOrderOption {
  id: string;
  order_number: string;
  companies: { name: string } | null;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`w-6 h-6 ${star <= value ? "fill-[var(--amber)] text-[var(--amber)]" : "text-[var(--border-strong)]"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrderOption[]>([]);
  const [supplierOrderId, setSupplierOrderId] = useState("");

  const purchaseOrderId = params.id as string;

  const loadOrder = useCallback(async () => {
    setLoadingOrder(true);
    try {
      const res = await fetch(`/api/orders/${purchaseOrderId}`);
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      const options: SupplierOrderOption[] = order.supplier_orders ?? [];
      setSupplierOrders(options);
      if (options.length === 1) setSupplierOrderId(options[0].id);
    } catch {
      toast.error("Order not found");
      router.push("/dashboard/orders");
    } finally {
      setLoadingOrder(false);
    }
  }, [purchaseOrderId, router]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const [form, setForm] = useState({
    rating: 0,
    title: "",
    content: "",
    productQuality: 0,
    communication: 0,
    shipping: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierOrderId) {
      toast.error("Please select which shipment this review is about");
      return;
    }
    if (form.rating === 0) {
      toast.error("Please select an overall rating");
      return;
    }

    setLoading(true);
    const result = await submitReview(supplierOrderId, {
      rating: form.rating,
      title: form.title || undefined,
      content: form.content || undefined,
      productQualityRating: form.productQuality || undefined,
      communicationRating: form.communication || undefined,
      shippingRating: form.shipping || undefined,
    });

    if (!result.success) {
      toast.error(result.error ?? "Failed to submit review");
      setLoading(false);
      return;
    }

    toast.success("Review submitted! Thank you for your feedback.");
    router.push("/dashboard/orders");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/orders/${purchaseOrderId}`} className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Write a Review
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate your experience</CardTitle>
          <CardDescription>Help other buyers make informed decisions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrder ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {supplierOrders.length > 1 && (
              <div className="space-y-2">
                <Label>Shipment *</Label>
                <Select value={supplierOrderId} onValueChange={setSupplierOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select which shipment this is about" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOrders.map((so) => (
                      <SelectItem key={so.id} value={so.id}>
                        {so.order_number} — {so.companies?.name ?? "Supplier"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Overall Rating */}
            <div className="space-y-2">
              <Label>Overall Rating *</Label>
              <StarRating value={form.rating} onChange={(v) => setForm((p) => ({ ...p, rating: v }))} />
            </div>

            {/* Detailed ratings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Product Quality</Label>
                <StarRating value={form.productQuality} onChange={(v) => setForm((p) => ({ ...p, productQuality: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Communication</Label>
                <StarRating value={form.communication} onChange={(v) => setForm((p) => ({ ...p, communication: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Shipping</Label>
                <StarRating value={form.shipping} onChange={(v) => setForm((p) => ({ ...p, shipping: v }))} />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Review Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Summarize your experience"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Your Review</Label>
              <textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Share details about product quality, delivery, and communication..."
                rows={4}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || form.rating === 0 || !supplierOrderId}>
              {loading ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
