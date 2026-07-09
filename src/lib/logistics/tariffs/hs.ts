/**
 * Strip dots/spaces, keep digits only — canonical HS code form used by
 * tariff_rates.hs_prefix (e.g. "8517.13" → "851713").
 */
export function normalizeHsCode(hsCode: string): string {
  return hsCode.replace(/[^0-9]/g, "");
}
