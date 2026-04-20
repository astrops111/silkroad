import type { GeoPoint } from "./types";

/**
 * Haversine distance between two GPS coordinates (km)
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Road-distance estimate — Haversine * detour factor.
 * African road networks average 1.3-1.5x straight-line distance.
 */
export function estimateRoadDistance(a: GeoPoint, b: GeoPoint): number {
  return haversineKm(a, b) * 1.4;
}

/**
 * Known city center coordinates across BUY's market.
 * Used as fallback when shipments lack GPS data.
 */
const CITY_COORDS: Record<string, GeoPoint> = {
  // East Africa
  "nairobi_ke": { lat: -1.2921, lng: 36.8219 },
  "mombasa_ke": { lat: -4.0435, lng: 39.6682 },
  "kisumu_ke": { lat: -0.1022, lng: 34.7617 },
  "dar es salaam_tz": { lat: -6.7924, lng: 39.2083 },
  "dodoma_tz": { lat: -6.1630, lng: 35.7516 },
  "kampala_ug": { lat: 0.3476, lng: 32.5825 },
  "kigali_rw": { lat: -1.9403, lng: 29.8739 },
  "bujumbura_bi": { lat: -3.3614, lng: 29.3599 },
  "addis ababa_et": { lat: 9.0192, lng: 38.7525 },
  "juba_ss": { lat: 4.8594, lng: 31.5713 },

  // West Africa
  "lagos_ng": { lat: 6.5244, lng: 3.3792 },
  "abuja_ng": { lat: 9.0579, lng: 7.4951 },
  "kano_ng": { lat: 12.0022, lng: 8.5920 },
  "accra_gh": { lat: 5.6037, lng: -0.1870 },
  "kumasi_gh": { lat: 6.6884, lng: -1.6244 },
  "dakar_sn": { lat: 14.7167, lng: -17.4677 },
  "abidjan_ci": { lat: 5.3600, lng: -4.0083 },
  "bamako_ml": { lat: 12.6392, lng: -8.0029 },
  "ouagadougou_bf": { lat: 12.3714, lng: -1.5197 },
  "lome_tg": { lat: 6.1725, lng: 1.2314 },
  "cotonou_bj": { lat: 6.3703, lng: 2.3912 },
  "conakry_gn": { lat: 9.6412, lng: -13.5784 },
  "freetown_sl": { lat: 8.4657, lng: -13.2317 },

  // Southern Africa
  "johannesburg_za": { lat: -26.2041, lng: 28.0473 },
  "cape town_za": { lat: -33.9249, lng: 18.4241 },
  "durban_za": { lat: -29.8587, lng: 31.0218 },
  "lusaka_zm": { lat: -15.3875, lng: 28.3228 },
  "harare_zw": { lat: -17.8252, lng: 31.0335 },
  "maputo_mz": { lat: -25.9692, lng: 32.5732 },
  "lilongwe_mw": { lat: -13.9626, lng: 33.7741 },
  "gaborone_bw": { lat: -24.6282, lng: 25.9231 },
  "windhoek_na": { lat: -22.5609, lng: 17.0658 },

  // Central Africa
  "kinshasa_cd": { lat: -4.4419, lng: 15.2663 },
  "brazzaville_cg": { lat: -4.2634, lng: 15.2429 },
  "douala_cm": { lat: 4.0511, lng: 9.7679 },
  "yaounde_cm": { lat: 3.8480, lng: 11.5021 },
  "libreville_ga": { lat: 0.4162, lng: 9.4673 },
  "bangui_cf": { lat: 4.3947, lng: 18.5582 },

  // North Africa
  "cairo_eg": { lat: 30.0444, lng: 31.2357 },
  "casablanca_ma": { lat: 33.5731, lng: -7.5898 },
  "tunis_tn": { lat: 36.8065, lng: 10.1815 },
  "algiers_dz": { lat: 36.7538, lng: 3.0588 },

  // China (trade partner)
  "guangzhou_cn": { lat: 23.1291, lng: 113.2644 },
  "shenzhen_cn": { lat: 22.5431, lng: 114.0579 },
  "shanghai_cn": { lat: 31.2304, lng: 121.4737 },
  "dongguan_cn": { lat: 23.0489, lng: 113.7400 },
  "yiwu_cn": { lat: 29.3065, lng: 120.0750 },
};

/**
 * Resolve a shipment's delivery location to GPS coordinates.
 * Priority: explicit GPS → city lookup → null
 */
export function resolveLocation(
  gps: GeoPoint | null,
  city: string | null,
  country: string | null
): GeoPoint | null {
  if (gps && gps.lat && gps.lng) return gps;
  if (city && country) {
    const key = `${city.toLowerCase()}_${country.toLowerCase()}`;
    if (CITY_COORDS[key]) return CITY_COORDS[key];
  }
  if (city) {
    // Try without country
    for (const [k, v] of Object.entries(CITY_COORDS)) {
      if (k.startsWith(city.toLowerCase())) return v;
    }
  }
  return null;
}
