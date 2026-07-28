import type { MarketRegion } from "@/lib/supabase/database.types";

export interface OnboardingCountry {
  code: string;
  name: string;
  region: MarketRegion;
}

// African countries the platform actively supports, plus China (the
// platform's original manufacturing corridor) and a curated set of
// additional world markets so buyers/suppliers outside Africa and China
// can register with their real country too ("Africa ↔ World").
export const ONBOARDING_COUNTRIES: OnboardingCountry[] = [
  { code: "GH", name: "Ghana", region: "africa_west" },
  { code: "NG", name: "Nigeria", region: "africa_west" },
  { code: "KE", name: "Kenya", region: "africa_east" },
  { code: "TZ", name: "Tanzania", region: "africa_east" },
  { code: "UG", name: "Uganda", region: "africa_east" },
  { code: "RW", name: "Rwanda", region: "africa_east" },
  { code: "ET", name: "Ethiopia", region: "africa_east" },
  { code: "ZA", name: "South Africa", region: "africa_south" },
  { code: "CM", name: "Cameroon", region: "africa_central" },
  { code: "CD", name: "DR Congo", region: "africa_central" },
  { code: "EG", name: "Egypt", region: "africa_north" },
  { code: "MA", name: "Morocco", region: "africa_north" },
  { code: "SN", name: "Senegal", region: "africa_west" },
  { code: "CI", name: "Ivory Coast", region: "africa_west" },
  { code: "CN", name: "China", region: "cn" },
  { code: "US", name: "United States", region: "global" },
  { code: "GB", name: "United Kingdom", region: "global" },
  { code: "DE", name: "Germany", region: "global" },
  { code: "FR", name: "France", region: "global" },
  { code: "NL", name: "Netherlands", region: "global" },
  { code: "ES", name: "Spain", region: "global" },
  { code: "IT", name: "Italy", region: "global" },
  { code: "AE", name: "United Arab Emirates", region: "global" },
  { code: "SA", name: "Saudi Arabia", region: "global" },
  { code: "TR", name: "Turkey", region: "global" },
  { code: "IN", name: "India", region: "global" },
  { code: "SG", name: "Singapore", region: "global" },
  { code: "JP", name: "Japan", region: "global" },
  { code: "KR", name: "South Korea", region: "global" },
  { code: "VN", name: "Vietnam", region: "global" },
  { code: "AU", name: "Australia", region: "global" },
  { code: "CA", name: "Canada", region: "global" },
  { code: "BR", name: "Brazil", region: "global" },
  { code: "MX", name: "Mexico", region: "global" },
];
