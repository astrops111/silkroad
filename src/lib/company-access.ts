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

export const PLATFORM_ADMIN_ROLES = [
  "admin_super",
  "admin_moderator",
  "admin_support",
] as const;

// Membership rows are not ordered by relevance — users can hold buyer,
// supplier, and admin memberships at once, so `company_members[0]` is the
// wrong row for anyone with more than one. Always select by capability.

/** First membership carrying a platform-admin role, regardless of row order. */
export function findAdminMembership<M extends { role: string }>(
  members: readonly M[] | null | undefined
): M | null {
  return (
    members?.find((m) =>
      (PLATFORM_ADMIN_ROLES as readonly string[]).includes(m.role)
    ) ?? null
  );
}

/**
 * First membership in a company that can act as a supplier, preferring the
 * primary membership when the user belongs to several supplier companies.
 */
export function findSupplierMembership<
  M extends {
    is_primary?: boolean | null;
    companies: { type: string | null } | null;
  },
>(members: readonly M[] | null | undefined): M | null {
  const supplierMembers =
    members?.filter((m) => canSupply(m.companies?.type)) ?? [];
  return supplierMembers.find((m) => m.is_primary) ?? supplierMembers[0] ?? null;
}
