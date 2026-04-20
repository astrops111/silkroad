"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { confirmDelivery } from "@/lib/actions/delivery";
import { toast } from "sonner";

export default function ConfirmDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const orderId = params.id as string;

  async function handleConfirm() {
    setLoading(true);
    const result = await confirmDelivery(orderId, "current-user");

    if (!result.success) {
      toast.error(result.error ?? "Failed to confirm delivery");
      setLoading(false);
      return;
    }

    setConfirmed(true);
    toast.success("Delivery confirmed! Settlement has been initiated.");
  }

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Delivery Confirmed
        </h1>
        <p className="text-[var(--text-secondary)]">
          The supplier will receive their payment shortly. You can now leave a review for this order.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={`/dashboard/orders/${orderId}/review`}>
            <Button>Leave a Review</Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/orders/${orderId}`} className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Confirm Delivery
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            Before you confirm
          </CardTitle>
          <CardDescription>
            Please verify that you have received all items and they match your order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
              All ordered items have been received
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
              Items match the product descriptions and specifications
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
              Quantities are correct
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
              No visible damage to goods
            </li>
          </ul>

          <div className="p-3 rounded-lg bg-[var(--amber-glow)] border border-[var(--amber)]/20">
            <p className="text-xs text-[var(--amber-dark)] font-medium">
              Once confirmed, payment will be released to the supplier. If there are any issues, please open a dispute instead.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleConfirm} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "Confirming..." : "Confirm Delivery"}
            </Button>
            <Link href={`/dashboard/orders/${orderId}/dispute`} className="flex-1">
              <Button variant="outline" className="w-full">Open Dispute</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
