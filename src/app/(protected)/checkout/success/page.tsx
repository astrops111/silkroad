"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingCart, ArrowRight, Clock, XCircle, Loader2 } from "lucide-react";

type OrderState = "loading" | "no-order" | "paid" | "pending" | "failed";

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [state, setState] = useState<OrderState>(orderId ? "loading" : "no-order");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    fetch(`/api/orders/${orderId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ order }) => {
        if (cancelled) return;
        if (order.status === "pending_payment") setState("pending");
        else if (order.status === "cancelled") setState("failed");
        else setState("paid");
      })
      .catch(() => {
        if (!cancelled) setState("no-order");
      });

    return () => { cancelled = true; };
  }, [orderId]);

  if (state === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (state === "pending") {
    return (
      <StatusScreen
        icon={<Clock className="w-8 h-8 text-amber-600" />}
        iconBg="bg-amber-100"
        title="Payment Processing"
        message="We're still confirming your payment with the gateway. This can take a few minutes — you'll get a confirmation email once it clears."
      />
    );
  }

  if (state === "failed") {
    return (
      <StatusScreen
        icon={<XCircle className="w-8 h-8 text-red-600" />}
        iconBg="bg-red-100"
        title="Payment Not Completed"
        message="This order wasn't completed. If you were charged, contact support — otherwise you can try paying again from your orders page."
      />
    );
  }

  return (
    <StatusScreen
      icon={<CheckCircle2 className="w-8 h-8 text-green-600" />}
      iconBg="bg-green-100"
      title="Order Placed Successfully!"
      message="Thank you for your order. You'll receive a confirmation email shortly. The supplier will review and confirm your order."
    />
  );
}

function StatusScreen({
  icon,
  iconBg,
  title,
  message,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md space-y-6">
        <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mx-auto`}>
          {icon}
        </div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <p className="text-[var(--text-secondary)]">{message}</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/orders">
            <Button>
              <ShoppingCart className="w-4 h-4" />
              View Orders
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline">
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
