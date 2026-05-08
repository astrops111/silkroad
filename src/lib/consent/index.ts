export const CONSENT_COOKIE = "sra_consent";
export const CONSENT_VERSION = 1;

export interface ConsentRecord {
  v: number;
  t: number; // unix timestamp of when consent was recorded
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentCategory = keyof Pick<
  ConsentRecord,
  "functional" | "analytics" | "marketing"
>;

export function getConsent(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(CONSENT_COOKIE + "="));
  if (!match) return null;
  try {
    const raw = match.slice(CONSENT_COOKIE.length + 1);
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed?.v !== CONSENT_VERSION) return null;
    return parsed as ConsentRecord;
  } catch {
    return null;
  }
}

export function setConsent(
  prefs: Pick<ConsentRecord, "functional" | "analytics" | "marketing">
): void {
  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    t: Math.floor(Date.now() / 1000),
    necessary: true,
    ...prefs,
  };
  const encoded = encodeURIComponent(JSON.stringify(record));
  const maxAge = 365 * 24 * 60 * 60;
  const isHttps =
    typeof location !== "undefined" && location.protocol === "https:";
  const parts = [
    `${CONSENT_COOKIE}=${encoded}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "SameSite=Lax",
    ...(isHttps ? ["Secure"] : []),
  ];
  document.cookie = parts.join("; ");
}

// Returns true for "necessary" unconditionally; for others requires recorded consent.
export function hasConsent(category: "necessary" | ConsentCategory): boolean {
  if (category === "necessary") return true;
  const c = getConsent();
  return c !== null && c[category] === true;
}

export function isConsentRecorded(): boolean {
  return getConsent() !== null;
}
