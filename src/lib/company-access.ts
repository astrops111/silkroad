// Inputs are typed as `string | null | undefined` because companies.type comes
// from the DB as `string` (CHECK constraint, not Postgres enum). The guards
// below validate the value at runtime against the allowed set.

/** A company of type 'supplier' or 'both' can act as a supplier on the platform. */
export function canSupply(type: string | null | undefined): boolean {
  return type === "supplier" || type === "both";
}

/** A company of type 'buyer_org' or 'both' can act as a buyer on the platform. */
export function canBuy(type: string | null | undefined): boolean {
  return type === "buyer_org" || type === "both";
}

/** A company of type 'logistics' or 'both' can act as a logistics operator. */
export function canShipForPlatform(
  type: string | null | undefined
): boolean {
  return type === "logistics" || type === "both";
}
