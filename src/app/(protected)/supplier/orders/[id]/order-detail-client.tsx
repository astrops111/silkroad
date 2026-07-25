"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSupplierOrderStatus } from "@/lib/actions/orders";
import { STATUS_ACTIONS, STATUS_TIMELINE, STATUS_LABELS } from "../status-config";

export interface OrderDetail {
  id: string;
  orderNumber: string;
  buyer: string;
  status: string;
  createdAt: string;
  currency: string;
  totalAmount: number;
  items: {
    id: string;
    name: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  shipping: {
    recipientName: string | null;
    recipientPhone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function OrderDetailClient({
  order,
}: {
  order: OrderDetail;
  currentUserId: string;
}) {
  const router = useRouter();
  const [advancing, startTransition] = useTransition();

  const action = STATUS_ACTIONS[order.status];
  const currentIndex = STATUS_TIMELINE.findIndex((s) => s.key === order.status);

  function handleAdvanceStatus() {
    if (!action) return;
    startTransition(async () => {
      // changed_by is derived server-side from the authenticated session in
      // updateSupplierOrderStatus() — never trust a client-supplied actor id.
      const result = await updateSupplierOrderStatus(order.id, action.next);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update order");
        return;
      }
      toast.success(`Order updated to: ${STATUS_LABELS[action.next] ?? action.next}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/orders"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {order.orderNumber}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {order.buyer} ·{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        {action && (
          <Button onClick={handleAdvanceStatus} disabled={advancing}>
            {advancing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <action.icon className="w-4 h-4" />
            )}
            {action.label}
          </Button>
        )}
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STATUS_TIMELINE.map((step, i) => {
              const isCompleted = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={step.key} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? "bg-[var(--success)] text-white"
                        : "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]"
                    } ${isCurrent ? "ring-2 ring-[var(--success)]/30" : ""}`}
                  >
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCompleted
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STATUS_TIMELINE.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        i < currentIndex
                          ? "bg-[var(--success)]"
                          : "bg-[var(--border-default)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)]"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-xs text-[var(--text-tertiary)]">{item.variantName}</p>
                      )}
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {item.quantity} units ×{" "}
                        {formatPrice(item.unitPrice, order.currency)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice(item.subtotal, order.currency)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-sm font-semibold">Total</span>
                  <span
                    className="text-lg font-bold text-[var(--obsidian)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatPrice(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{order.buyer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipping.address ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {order.shipping.recipientName && <>{order.shipping.recipientName}<br /></>}
                  {order.shipping.address}
                  <br />
                  {order.shipping.city}
                  {order.shipping.city && order.shipping.country && ", "}
                  {order.shipping.country}
                  {order.shipping.recipientPhone && <><br />{order.shipping.recipientPhone}</>}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">Not provided</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
