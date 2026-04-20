"use server";

import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Stripe price IDs for each tier (configure in Stripe dashboard)
const TIER_PRICES: Record<string, string> = {
  standard: process.env.STRIPE_PRICE_STANDARD ?? "price_standard",
  gold: process.env.STRIPE_PRICE_GOLD ?? "price_gold",
  verified: process.env.STRIPE_PRICE_VERIFIED ?? "price_verified",
};

const TIER_FEATURES: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: "Free",
    price: "$0/mo",
    features: [
      "Up to 10 product listings",
      "Basic analytics",
      "Standard support",
      "Community badge",
    ],
  },
  standard: {
    name: "Standard",
    price: "$49/mo",
    features: [
      "Up to 100 product listings",
      "Advanced analytics",
      "Priority support",
      "Standard badge",
      "Featured in search results",
    ],
  },
  gold: {
    name: "Gold",
    price: "$149/mo",
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
  verified: {
    name: "Verified",
    price: "$299/mo",
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
};

export async function getTierFeatures() {
  return TIER_FEATURES;
}

export async function createSubscription(
  companyId: string,
  tier: "standard" | "gold" | "verified"
): Promise<ActionResult<{ checkoutUrl: string }>> {
  const supabase = await createClient();

  // Get supplier's Stripe account info
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("stripe_account_id")
    .eq("company_id", companyId)
    .single();

  // Get company email
  const { data: members } = await supabase
    .from("company_members")
    .select("user_profiles (email)")
    .eq("company_id", companyId)
    .eq("is_primary", true)
    .limit(1);

  const email = (members?.[0]?.user_profiles as unknown as { email: string })?.email;

  const priceId = TIER_PRICES[tier];
  if (!priceId) {
    return { success: false, error: "Invalid tier" };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/subscription?success=true&tier=${tier}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/subscription?cancelled=true`,
      metadata: {
        company_id: companyId,
        tier,
      },
    });

    return { success: true, data: { checkoutUrl: session.url! } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create subscription" };
  }
}

export async function cancelSubscription(companyId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Reset to free tier
  const { error } = await supabase
    .from("supplier_profiles")
    .update({
      tier: "free",
      tier_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateSupplierTier(
  companyId: string,
  tier: string,
  expiresAt?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("supplier_profiles")
    .update({
      tier,
      tier_expires_at: expiresAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
