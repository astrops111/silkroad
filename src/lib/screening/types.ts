// ============================================================
// Denied-party / sanctions screening provider interface.
// Wraps the actual screening API (OpenSanctions today; could be
// Dow Jones / Refinitiv later) behind a stable shape so the
// runner and DB schema don't change when the vendor does.
// ============================================================

export type SubjectType = "ops_quote" | "buyer_request" | "company" | "user";

export interface ScreeningQuery {
  // What we're screening — typically a person + their company + country.
  // All fields optional because sources vary; provider must handle gracefully.
  name?: string;
  company?: string;
  country?: string;       // ISO-2
  email?: string;
  phone?: string;
}

export interface ScreeningMatch {
  entityId: string;       // provider-specific opaque ID
  name: string;           // canonical name on the list
  lists: string[];        // e.g. ["us_ofac_sdn", "eu_fsf"]
  score: number;          // 0..1 confidence
  url?: string;           // permalink to provider record (for human review)
  countries?: string[];
  topics?: string[];      // 'sanction', 'crime', 'pep', etc.
}

export interface ScreeningResponse {
  result: "clear" | "hit" | "error";
  matches: ScreeningMatch[];
  topScore: number | null;
  errorMessage?: string;
}

export interface ScreeningProvider {
  readonly id: string;            // 'opensanctions' | 'dowjones' | etc.
  readonly enabled: boolean;      // gated by env (API key present)
  screen(query: ScreeningQuery): Promise<ScreeningResponse>;
}
