"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Crown, Star, Shield, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Zap,
    color: "var(--text-tertiary)",
    features: [
      "Up to 10 product listings",
      "Basic analytics",
      "Standard support",
      "Community badge",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: "$49",
    period: "/month",
    icon: Star,
    color: "var(--indigo)",
    popular: false,
    features: [
      "Up to 100 product listings",
      "Advanced analytics",
      "Priority support",
      "Standard badge",
      "Featured in search results",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: "$149",
    period: "/month",
    icon: Crown,
    color: "var(--amber)",
    popular: true,
    features: [
      "Unlimited product listings",
      "Full analytics suite",
      "Dedicated account manager",
      "Gold verified badge",
      "Top search placement",
      "Promoted listings (5/mo)",
      "RFQ priority notifications",
    ],
  },
  {
    id: "verified",
    name: "Verified",
    price: "$299",
    period: "/month",
    icon: Shield,
    color: "var(--success)",
    features: [
      "Everything in Gold",
      "Verified trust badge",
      "Custom storefront branding",
      "API access",
      "Promoted listings (20/mo)",
      "Trade assurance priority",
      "Multi-user accounts",
    ],
  },
];

export default function SubscriptionPage() {
  const [currentTier] = useState("free");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  async function handleUpgrade(tierId: string) {
    setUpgrading(tierId);
    try {
      const { createSubscription } = await import("@/lib/actions/subscriptions");
      const result = await createSubscription("current", tierId as "standard" | "gold" | "verified");
      if (result.success && result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        toast.error(result.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setUpgrading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          Supplier Plans
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Upgrade your plan to unlock more features and reach more buyers
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          return (
            <Card
              key={tier.id}
              className={`relative ${tier.popular ? "border-[var(--amber)] shadow-lg ring-2 ring-[var(--amber)]/20" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[var(--amber)] text-[var(--obsidian)]">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ background: `color-mix(in srgb, ${tier.color} 12%, transparent)` }}
                >
                  <tier.icon className="w-6 h-6" style={{ color: tier.color }} />
                </div>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
                    {tier.price}
                  </span>
                  <span className="text-sm text-[var(--text-tertiary)]">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentTier ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : tier.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={upgrading === tier.id}
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {upgrading === tier.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
