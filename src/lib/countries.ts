export const MARKETPLACE_COUNTRIES = ["CN", "TW", "KR", "JP"] as const;

export type MarketplaceCountry = (typeof MARKETPLACE_COUNTRIES)[number];

export function isMarketplaceCountry(
  value: string | null | undefined
): value is MarketplaceCountry {
  return !!value && (MARKETPLACE_COUNTRIES as readonly string[]).includes(value.toUpperCase());
}
