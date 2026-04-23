// ============================================================
// OpenSanctions Match API provider.
// https://api.opensanctions.org/#tag/Reconciliation
//
// Free tier requires an API key; the public endpoint without a key
// is rate-limited and not for production. If no key is configured
// the provider stays enabled but logs a warning and downgrades
// to the public endpoint — useful for dev / preview.
//
// Score threshold (SCREENING_MIN_MATCH_SCORE, default 0.7) decides
// hit vs clear. Anything at-or-above threshold is a hit, even if
// the provider returned multiple low-score matches.
// ============================================================

import type {
  ScreeningMatch,
  ScreeningProvider,
  ScreeningQuery,
  ScreeningResponse,
} from "./types";

const DEFAULT_BASE = "https://api.opensanctions.org";
const DEFAULT_DATASET = "default";  // covers OFAC SDN, EU FSF, UK HMT, UN, PEPs

interface MatchResultEntity {
  id: string;
  caption?: string;
  schema?: string;
  properties?: {
    name?: string[];
    country?: string[];
    topics?: string[];
  };
  datasets?: string[];
  score?: number;
  match?: boolean;
}

interface MatchResponseBody {
  responses?: Record<string, { results?: MatchResultEntity[] }>;
}

export class OpenSanctionsProvider implements ScreeningProvider {
  readonly id = "opensanctions";
  private readonly baseUrl = process.env.OPENSANCTIONS_API_BASE ?? DEFAULT_BASE;
  private readonly apiKey = process.env.OPENSANCTIONS_API_KEY;
  private readonly threshold = Number(process.env.SCREENING_MIN_MATCH_SCORE ?? "0.7");

  // Always enabled — we fall back to the unauth endpoint when no key
  // is set so dev environments don't silently skip screening.
  get enabled(): boolean { return true; }

  async screen(query: ScreeningQuery): Promise<ScreeningResponse> {
    if (!query.name && !query.company) {
      return { result: "clear", matches: [], topScore: null };
    }

    const url = `${this.baseUrl}/match/${DEFAULT_DATASET}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers["Authorization"] = `ApiKey ${this.apiKey}`;

    const body = {
      queries: {
        ...(query.name && {
          person: {
            schema: "Person",
            properties: {
              name: [query.name],
              ...(query.country && { country: [query.country.toLowerCase()] }),
            },
          },
        }),
        ...(query.company && {
          org: {
            schema: "Organization",
            properties: {
              name: [query.company],
              ...(query.country && { country: [query.country.toLowerCase()] }),
            },
          },
        }),
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      return {
        result: "error",
        matches: [],
        topScore: null,
        errorMessage: `OpenSanctions request failed: ${(e as Error).message}`,
      };
    }

    if (!response.ok) {
      return {
        result: "error",
        matches: [],
        topScore: null,
        errorMessage: `OpenSanctions ${response.status}: ${await response.text().catch(() => "")}`,
      };
    }

    const json = (await response.json()) as MatchResponseBody;
    const matches: ScreeningMatch[] = [];
    for (const block of Object.values(json.responses ?? {})) {
      for (const entity of block.results ?? []) {
        matches.push({
          entityId: entity.id,
          name: entity.caption ?? entity.properties?.name?.[0] ?? entity.id,
          lists: entity.datasets ?? [],
          score: typeof entity.score === "number" ? entity.score : 0,
          url: `https://www.opensanctions.org/entities/${entity.id}/`,
          countries: entity.properties?.country,
          topics: entity.properties?.topics,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topScore = matches.length > 0 ? matches[0].score : null;
    const result: "clear" | "hit" =
      topScore !== null && topScore >= this.threshold ? "hit" : "clear";

    return { result, matches: matches.slice(0, 10), topScore };
  }
}

export const openSanctionsProvider = new OpenSanctionsProvider();
