// Trade zone membership for preferential tariff rates

const EAC_MEMBERS = new Set(["KE", "TZ", "UG", "RW", "BI", "CD", "SS"]);
const ECOWAS_MEMBERS = new Set([
  "BJ", "BF", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "ML", "NE", "NG", "SN", "SL", "TG",
]);
const SADC_MEMBERS = new Set([
  "AO", "BW", "CD", "KM", "SZ", "LS", "MG", "MW", "MU", "MZ", "NA", "SC", "ZA", "TZ", "ZM", "ZW",
]);
const CEMAC_MEMBERS = new Set(["CM", "CF", "TD", "CG", "GQ", "GA"]);

export type TradeZone = "EAC" | "ECOWAS" | "SADC" | "CEMAC" | "AfCFTA" | null;

/**
 * Find shared trade zones between two countries
 */
export function getSharedTradeZones(
  countryA: string,
  countryB: string
): TradeZone[] {
  const zones: TradeZone[] = [];

  if (EAC_MEMBERS.has(countryA) && EAC_MEMBERS.has(countryB)) zones.push("EAC");
  if (ECOWAS_MEMBERS.has(countryA) && ECOWAS_MEMBERS.has(countryB)) zones.push("ECOWAS");
  if (SADC_MEMBERS.has(countryA) && SADC_MEMBERS.has(countryB)) zones.push("SADC");
  if (CEMAC_MEMBERS.has(countryA) && CEMAC_MEMBERS.has(countryB)) zones.push("CEMAC");

  // AfCFTA covers all African Union members (54 countries) — broad preference
  if (isAfricanCountry(countryA) && isAfricanCountry(countryB)) {
    zones.push("AfCFTA");
  }

  return zones;
}

/**
 * Get preferential tariff rate for trade zone
 * Returns reduction factor (0 = full duty, 1 = duty-free)
 */
export function getTradeZonePreference(zone: TradeZone): number {
  switch (zone) {
    case "EAC": return 1.0;      // Duty-free within EAC
    case "ECOWAS": return 1.0;   // Duty-free within ECOWAS (ETLS scheme)
    case "SADC": return 0.85;    // 85% reduction (most goods, not all)
    case "CEMAC": return 1.0;    // Duty-free within CEMAC
    case "AfCFTA": return 0.5;   // 50% reduction (phasing in through 2030)
    default: return 0;
  }
}

const AFRICAN_COUNTRIES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
]);

function isAfricanCountry(code: string): boolean {
  return AFRICAN_COUNTRIES.has(code);
}
