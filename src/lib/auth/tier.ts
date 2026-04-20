import { createClient } from "@/lib/supabase/server";

export type CompanyTier = "free" | "standard" | "gold" | "verified";

export interface TierStatus {
  authenticated: boolean;
  /** True if the caller is a member of at least one paid-tier company. */
  isPaid: boolean;
  /** Company IDs where the caller has an active paid tier. */
  paidCompanyIds: string[];
  /** All company IDs the caller belongs to. */
  companyIds: string[];
}

const PAID_TIERS: CompanyTier[] = ["standard", "gold"];

/**
 * Resolve the paid-tier status of the current caller. Free-tier gated
 * features (e.g. submitting RFQs, sending quotations) should check
 * `isPaid` before proceeding.
 */
export async function getCallerTierStatus(): Promise<TierStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false, isPaid: false, paidCompanyIds: [], companyIds: [] };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return { authenticated: true, isPaid: false, paidCompanyIds: [], companyIds: [] };
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("role, company_id, companies:company_id(id, tier, tier_expires_at)")
    .eq("user_id", profile.id);

  const now = new Date();
  const companyIds: string[] = [];
  const paidCompanyIds: string[] = [];
  let isAdmin = false;

  for (const m of memberships ?? []) {
    if (m.role === "admin_super" || m.role === "admin_moderator" || m.role === "admin_support") {
      isAdmin = true;
    }
    const c = m.companies as unknown as {
      id: string;
      tier: CompanyTier;
      tier_expires_at: string | null;
    } | null;
    if (!c) continue;
    companyIds.push(c.id);
    const tierOk = PAID_TIERS.includes(c.tier);
    const notExpired =
      !c.tier_expires_at || new Date(c.tier_expires_at) > now;
    if (tierOk && notExpired) paidCompanyIds.push(c.id);
  }

  return {
    authenticated: true,
    isPaid: isAdmin || paidCompanyIds.length > 0,
    paidCompanyIds,
    companyIds,
  };
}

export class PaidTierRequiredError extends Error {
  constructor(action: string) {
    super(`Paid tier required to ${action}`);
    this.name = "PaidTierRequiredError";
  }
}
