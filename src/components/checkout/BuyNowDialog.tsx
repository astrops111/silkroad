"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/payments/currency-config";

const COUNTRIES = [
  { code: "GH", name: "Ghana" }, { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" }, { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" }, { code: "ZA", name: "South Africa" },
  { code: "CI", name: "Côte d'Ivoire" }, { code: "SN", name: "Senegal" },
  { code: "ET", name: "Ethiopia" }, { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" }, { code: "RW", name: "Rwanda" },
];

export interface BuyNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  supplierId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number; // minor units, markup already applied
  quantity: number;
  currency: string;
  moq?: number;
}

/**
 * Instant-checkout entry point — skips RFQ/quote negotiation entirely and
 * calls POST /api/orders (the existing buy-now endpoint) directly for a
 * single product at listed price. Collects the minimum shipping fields the
 * endpoint requires (createOrderSchema.shippingAddresses), then hands off
 * to the unified /orders/[id]/pay page for payment-terms + gateway choice.
 */
export default function BuyNowDialog({
  open,
  onOpenChange,
  productId,
  supplierId,
  productName,
  variantId,
  variantName,
  unitPrice,
  quantity,
  currency,
  moq,
}: BuyNowDialogProps) {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = unitPrice * quantity;
  const canSubmit = !!country && !!city && !!address && !!phone && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            productId,
            supplierId,
            productName,
            variantId,
            variantName,
            quantity,
            unitPrice,
            currency,
            moq,
          }],
          shippingAddresses: { [supplierId]: { country, city, address, phone } },
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to place order");
      router.push(`/orders/${data.orderId}/pay`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy Now</DialogTitle>
          <DialogDescription>
            {productName}
            {variantName ? ` — ${variantName}` : ""} · {quantity.toLocaleString()} units
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--surface-secondary)] p-3 flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Order total</span>
            <span className="font-bold text-[var(--text-primary)]">{formatMoney(total, currency)}</span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)]"
              >
                <option value="">Select…</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">City</label>
              <input
                type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Delivery Address</label>
            <input
              type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone Number</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 XXX XXX XXXX"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing order…</> : "Continue to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
