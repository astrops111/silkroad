"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingCart, ArrowRight } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Order Placed Successfully!
        </h1>
        <p className="text-[var(--text-secondary)]">
          Thank you for your order. You&apos;ll receive a confirmation email
          shortly. The supplier will review and confirm your order.
        </p>
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
