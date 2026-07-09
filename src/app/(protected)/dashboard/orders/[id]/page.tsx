"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  FileText,
  ExternalLink,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/stores/cart";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────── types */

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  currency: string;
}

interface StatusEntry {
  id: string;
  status: string;
  changed_at: string;
  note: string | null;
}

interface SupplierOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  companies: { name: string; country_code: string } | null;
  supplier_order_items: OrderItem[];
  order_status_history: StatusEntry[];
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  subtotal: number;
  total_shipping: number;
  total_tax: number;
  grand_total: number;
  buyer_company_id: string | null;
  buyer_company_name: string | null;
  buyer_tax_id: string | null;
  note: string | null;
  created_at: string;
  supplier_orders: SupplierOrder[];
}

/* ─────────────────────────────────────────────────────────── helpers */

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  pending_payment: { label: "Payment Due", variant: "destructive", icon: AlertCircle },
  paid:            { label: "Paid",         variant: "secondary",  icon: CheckCircle2 },
  confirmed:       { label: "Confirmed",    variant: "secondary",  icon: CheckCircle2 },
  in_production:   { label: "In Production",variant: "secondary",  icon: Clock },
  in_transit:      { label: "In Transit",   variant: "outline",    icon: Truck },
  delivered:       { label: "Delivered",    variant: "default",    icon: Package },
  completed:       { label: "Completed",    variant: "default",    icon: CheckCircle2 },
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─────────────────────────────────────────────────────────── page */

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      setOrder(order);
    } catch {
      toast.error("Order not found");
      router.push("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => { load(); }, [load]);

  async function handleReorder() {
    if (!order) return;
    setReordering(true);
    let count = 0;
    for (const so of order.supplier_orders) {
      const supplierName = so.companies?.name ?? "Supplier";
      for (const item of so.supplier_order_items) {
        addItem({
          productId: item.product_id,
          supplierId: so.supplier_id,
          supplierName,
          productName: item.product_name,
          variantName: item.variant_name ?? undefined,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          currency: item.currency,
          moq: 1,
        });
        count++;
      }
    }
    toast.success(`${count} item${count !== 1 ? "s" : ""} added to cart`);
    setReordering(false);
    router.push("/cart");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (!order) return null;

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.paid;
  const HeaderIcon = config.icon;
  const canTrack   = ["in_transit", "delivered"].includes(order.status);
  const canConfirm = order.status === "delivered";
  const canReorder = ["delivered", "completed"].includes(order.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard/orders"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors mt-0.5"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-2xl font-bold text-[var(--obsidian)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {order.order_number}
            </h1>
            <Badge variant={config.variant} className="flex items-center gap-1">
              <HeaderIcon className="w-3 h-3" />
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Placed {fmtDate(order.created_at)}
            {order.buyer_company_name && ` · ${order.buyer_company_name}`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {canTrack && (
            <Link href={`/dashboard/orders/${orderId}/tracking`}>
              <Button variant="outline" size="sm">
                <Truck className="w-4 h-4" />
                Track
              </Button>
            </Link>
          )}
          {canConfirm && (
            <Link href={`/dashboard/orders/${orderId}/confirm-delivery`}>
              <Button size="sm">
                <CheckCircle2 className="w-4 h-4" />
                Confirm Delivery
              </Button>
            </Link>
          )}
          {canReorder && (
            <Button variant="outline" size="sm" onClick={handleReorder} disabled={reordering}>
              {reordering
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RotateCcw className="w-4 h-4" />}
              Re-order
            </Button>
          )}
        </div>
      </div>

      {/* ── Payment banner */}
      {order.status === "pending_payment" && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-medium text-red-700">
              Payment is required to confirm this order with the supplier.
            </p>
          </div>
          <Link href="/dashboard/payments">
            <Button size="sm" className="shrink-0">
              Pay Now <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Supplier sub-orders */}
      {order.supplier_orders.map((so) => {
        const soConfig = STATUS_CONFIG[so.status] ?? STATUS_CONFIG.paid;
        const SoIcon = soConfig.icon;
        const supplierName = so.companies?.name ?? "Supplier";
        const countryCode  = so.companies?.country_code ?? "";

        return (
          <Card key={so.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
                  {supplierName}
                  {countryCode && (
                    <span className="text-xs text-[var(--text-tertiary)] font-normal">
                      ({countryCode})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">{so.order_number}</span>
                  <Badge variant={soConfig.variant} className="flex items-center gap-1 text-xs">
                    <SoIcon className="w-3 h-3" />
                    {soConfig.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Line items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      {["Product", "Qty", "Unit Price", "Total"].map((h) => (
                        <th
                          key={h}
                          className="pb-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {so.supplier_order_items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--border-subtle)] last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-medium text-[var(--obsidian)]">
                            {item.product_name}
                          </span>
                          {item.variant_name && (
                            <span className="block text-xs text-[var(--text-tertiary)]">
                              {item.variant_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {fmt(item.unit_price, item.currency)}
                        </td>
                        <td className="py-3 font-semibold text-[var(--obsidian)]">
                          {fmt(item.subtotal, item.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group cost breakdown */}
              <div className="rounded-lg bg-[var(--surface-secondary)] p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Goods subtotal</span>
                  <span>{fmt(so.subtotal, so.currency)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Shipping &amp; freight</span>
                  <span>{fmt(so.shipping_fee, so.currency)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Duties &amp; taxes</span>
                  <span>{fmt(so.tax_amount, so.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--obsidian)] pt-2 border-t border-[var(--border-subtle)]">
                  <span>Group total</span>
                  <span>{fmt(so.total_amount, so.currency)}</span>
                </div>
              </div>

              {/* Status timeline */}
              {so.order_status_history.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase">
                    Status History
                  </p>
                  <div className="space-y-1.5">
                    {[...so.order_status_history]
                      .sort(
                        (a, b) =>
                          new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
                      )
                      .map((h) => {
                        const hc = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.paid;
                        return (
                          <div
                            key={h.id}
                            className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                          >
                            <span className="w-2 h-2 rounded-full bg-[var(--border-subtle)] shrink-0" />
                            <span className="font-medium">{hc.label}</span>
                            <span className="text-[var(--text-tertiary)]">·</span>
                            <span className="text-[var(--text-tertiary)]">{fmtDate(h.changed_at)}</span>
                            {h.note && (
                              <>
                                <span className="text-[var(--text-tertiary)]">—</span>
                                <span className="text-[var(--text-tertiary)]">{h.note}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Grand total summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Goods subtotal</span>
              <span>{fmt(order.subtotal, order.currency)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Shipping &amp; freight</span>
              <span>{fmt(order.total_shipping, order.currency)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Duties &amp; taxes</span>
              <span>{fmt(order.total_tax, order.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-[var(--obsidian)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Grand Total</span>
              <span>{fmt(order.grand_total, order.currency)}</span>
            </div>
          </div>

          {order.note && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">
                Order Notes
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{order.note}</p>
            </div>
          )}

          {order.buyer_tax_id && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">
                Tax ID
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{order.buyer_tax_id}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Footer actions */}
      <div className="flex flex-wrap gap-3 pb-4">
        {canConfirm && (
          <Link href={`/dashboard/orders/${orderId}/dispute`}>
            <Button variant="outline" size="sm">
              <AlertCircle className="w-4 h-4" />
              Open Dispute
            </Button>
          </Link>
        )}
        <Link href={`/dashboard/orders/${orderId}/review`}>
          <Button variant="ghost" size="sm" className="text-[var(--text-tertiary)]">
            Leave a Review
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="sm" className="text-[var(--text-tertiary)]">
            <FileText className="w-4 h-4" />
            View Invoices
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
