/* Platform markup applied to buyer-facing prices.
   Supplier costs are stored in the DB as-is; every buyer-facing surface
   must route through applyMarkup before rendering. */
export const PLATFORM_MARKUP = 1.4;

export function applyMarkup(cost: number): number {
  return cost * PLATFORM_MARKUP;
}
