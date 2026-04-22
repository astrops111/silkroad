import type { CompanyType } from "@/lib/supabase/database.types";

/** A company of type 'supplier' or 'both' can act as a supplier on the platform. */
export function canSupply(type: CompanyType | null | undefined): boolean {
  return type === "supplier" || type === "both";
}

/** A company of type 'buyer_org' or 'both' can act as a buyer on the platform. */
export function canBuy(type: CompanyType | null | undefined): boolean {
  return type === "buyer_org" || type === "both";
}

/** A company of type 'logistics' or 'both' can act as a logistics operator. */
export function canShipForPlatform(
  type: CompanyType | null | undefined
): boolean {
  return type === "logistics" || type === "both";
}
