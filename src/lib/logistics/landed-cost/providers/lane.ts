import type {
  ContainerType,
  FreightLaneRate,
  RouteEnd,
  ShippingMethod,
} from "../types";

export interface LaneLookupInput {
  origin: RouteEnd;
  destination: RouteEnd;
  shippingMethod: ShippingMethod;
  containerType: ContainerType;
  asOf?: Date;        // for validity window check; defaults to now
}

export interface FreightLaneProvider {
  /**
   * Resolve a freight lane rate for the given route/method/container.
   * Implementations should prefer the most specific match in this order:
   *   1. origin port → destination port
   *   2. origin port → destination country
   *   3. origin country → destination port
   *   4. origin country → destination country
   * Return `null` when no active, in-validity lane matches.
   */
  resolve(input: LaneLookupInput): Promise<FreightLaneRate | null>;
}

/**
 * In-memory provider for tests / local dev. Returns the first lane matching
 * shipping method + container type whose route bounds intersect the input.
 */
export class StaticFreightLaneProvider implements FreightLaneProvider {
  constructor(
    private readonly lanes: Array<
      FreightLaneRate & {
        originPortCode?: string;
        originCountry?: string;
        destinationPortCode?: string;
        destinationCountry?: string;
        shippingMethod: ShippingMethod;
        containerType: ContainerType;
        validFrom?: string;
        validTo?: string;
      }
    >,
  ) {}

  async resolve(input: LaneLookupInput): Promise<FreightLaneRate | null> {
    const asOf = input.asOf ?? new Date();
    const candidates = this.lanes.filter((l) => {
      if (l.shippingMethod !== input.shippingMethod) return false;
      if (l.containerType !== input.containerType) return false;
      if (l.validFrom && new Date(l.validFrom) > asOf) return false;
      if (l.validTo && new Date(l.validTo) < asOf) return false;

      const originMatches =
        (l.originPortCode && l.originPortCode === input.origin.portCode) ||
        (l.originCountry && l.originCountry === input.origin.country);
      const destinationMatches =
        (l.destinationPortCode && l.destinationPortCode === input.destination.portCode) ||
        (l.destinationCountry && l.destinationCountry === input.destination.country);
      return Boolean(originMatches && destinationMatches);
    });

    if (candidates.length === 0) return null;

    // Specificity score: port-port > port-country > country-port > country-country
    const score = (l: (typeof candidates)[number]) =>
      (l.originPortCode === input.origin.portCode ? 2 : 1) +
      (l.destinationPortCode === input.destination.portCode ? 2 : 1);

    candidates.sort((a, b) => score(b) - score(a));
    return candidates[0]!;
  }
}
