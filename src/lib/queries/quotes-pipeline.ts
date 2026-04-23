"use server";

import { createClient } from "@/lib/supabase/server";

// Unified pipeline view across the three work surfaces ops handles:
//   - rfq quotations  (supplier response to a buyer RFQ)
//   - buyer_requests  (freeform inbound buyer ask, needs enrichment)
//   - ops_freight_quotes (ops-originated quote, no buyer on platform)
//
// Each source normalizes into a single PipelineRow shape so the UI is uniform.

export type PipelineSource = "rfq_quotation" | "buyer_request" | "ops_freight_quote";

// Universal lifecycle bucket. Per-source statuses collapse into this.
export type PipelineStage =
  | "new"        // just came in, nothing started
  | "active"     // in progress (draft, in_review, submitted, quoted, sent)
  | "won"        // accepted / matched
  | "lost"       // declined / rejected / expired / withdrawn / closed / archived
  | "draft";     // ops still composing (draft states)

export interface PipelineRow {
  key: string;                      // `${source}:${id}` for React keys
  id: string;
  source: PipelineSource;
  sourceLabel: string;
  number: string;                   // human id: quote_number / rfq_number / truncated uuid
  title: string;
  requesterName: string | null;
  requesterCompany: string | null;
  requesterCountry: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
  rawStatus: string;                // per-source status text
  stage: PipelineStage;
  valueMinor: number | null;
  currency: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
  detailUrl: string;
}

export interface PipelineFilters {
  sources?: PipelineSource[];       // default: all three
  stages?: PipelineStage[];
  query?: string;                   // matches number / title / requester
  createdWithinDays?: number;
}

export async function listPipeline(filters: PipelineFilters = {}): Promise<PipelineRow[]> {
  const supabase = await createClient();
  const sources = filters.sources ?? (["rfq_quotation", "buyer_request", "ops_freight_quote"] as PipelineSource[]);
  const sinceIso = filters.createdWithinDays !== undefined
    ? new Date(Date.now() - filters.createdWithinDays * 86_400_000).toISOString()
    : undefined;

  const tasks: Promise<PipelineRow[]>[] = [];
  if (sources.includes("rfq_quotation")) tasks.push(fetchRfqQuotations(supabase, sinceIso));
  if (sources.includes("buyer_request")) tasks.push(fetchBuyerRequests(supabase, sinceIso));
  if (sources.includes("ops_freight_quote")) tasks.push(fetchOpsFreightQuotes(supabase, sinceIso));

  const merged = (await Promise.all(tasks)).flat();

  let rows = merged;
  if (filters.stages && filters.stages.length > 0) {
    const set = new Set(filters.stages);
    rows = rows.filter((r) => set.has(r.stage));
  }
  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    rows = rows.filter((r) => {
      const hay = `${r.number} ${r.title} ${r.requesterName ?? ""} ${r.requesterCompany ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  rows.sort((a, b) => (b.createdAt.localeCompare(a.createdAt)));
  return rows;
}

// ============================================================
// Per-source fetchers + mappers
// ============================================================

type Supa = Awaited<ReturnType<typeof createClient>>;

async function fetchRfqQuotations(supabase: Supa, sinceIso?: string): Promise<PipelineRow[]> {
  let q = supabase
    .from("quotations")
    .select(`
      id, quotation_number, status, total_amount, currency, valid_until,
      created_at, updated_at, supplier_name,
      rfq:rfqs ( id, rfq_number, title, buyer_country, buyer_company_name, delivery_country )
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  if (sinceIso) q = q.gte("created_at", sinceIso);

  const { data, error } = await q;
  if (error) {
    console.error("fetchRfqQuotations failed", error);
    return [];
  }

  type Row = {
    id: string;
    quotation_number: string;
    status: string;
    total_amount: number;
    currency: string | null;
    valid_until: string | null;
    created_at: string | null;
    updated_at: string | null;
    supplier_name: string | null;
    rfq: {
      id: string;
      rfq_number: string;
      title: string;
      buyer_country: string | null;
      buyer_company_name: string | null;
      delivery_country: string | null;
    } | null;
  };

  return (data as unknown as Row[]).map((r) => ({
    key: `rfq_quotation:${r.id}`,
    id: r.id,
    source: "rfq_quotation" as const,
    sourceLabel: "RFQ quote",
    number: r.quotation_number,
    title: r.rfq?.title ?? `Quotation ${r.quotation_number}`,
    requesterName: r.supplier_name ?? null,          // supplier for context; buyer is on rfq
    requesterCompany: r.rfq?.buyer_company_name ?? null,
    requesterCountry: r.rfq?.buyer_country ?? null,
    originCountry: null,
    destinationCountry: r.rfq?.delivery_country ?? null,
    rawStatus: r.status,
    stage: mapQuotationStage(r.status),
    valueMinor: r.total_amount,
    currency: r.currency,
    validUntil: r.valid_until,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? null,
    detailUrl: r.rfq ? `/admin/logistics/quotes?rfq=${r.rfq.id}` : `/admin`,
  }));
}

async function fetchBuyerRequests(supabase: Supa, sinceIso?: string): Promise<PipelineRow[]> {
  let q = supabase
    .from("buyer_requests")
    .select("id, name, email, company_name, country_code, title, status, budget_usd, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sinceIso) q = q.gte("created_at", sinceIso);

  const { data, error } = await q;
  if (error) {
    console.error("fetchBuyerRequests failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    key: `buyer_request:${r.id}`,
    id: r.id,
    source: "buyer_request" as const,
    sourceLabel: "Buyer request",
    number: r.id.slice(0, 8).toUpperCase(),
    title: r.title,
    requesterName: r.name ?? null,
    requesterCompany: r.company_name ?? null,
    requesterCountry: r.country_code ?? null,
    originCountry: null,
    destinationCountry: r.country_code ?? null,
    rawStatus: r.status,
    stage: mapBuyerRequestStage(r.status),
    valueMinor: null,
    currency: null,
    validUntil: null,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? null,
    detailUrl: `/admin/buyer-requests/${r.id}`,  // future page
  }));
}

async function fetchOpsFreightQuotes(supabase: Supa, sinceIso?: string): Promise<PipelineRow[]> {
  let q = supabase
    .from("ops_freight_quotes")
    .select(`
      id, quote_number, status, quoted_amount, quoted_currency, valid_until,
      created_at, updated_at,
      requester_name, requester_company, requester_country,
      origin_country, destination_country, cargo_description
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  if (sinceIso) q = q.gte("created_at", sinceIso);

  const { data, error } = await q;
  if (error) {
    console.error("fetchOpsFreightQuotes failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    key: `ops_freight_quote:${r.id}`,
    id: r.id,
    source: "ops_freight_quote" as const,
    sourceLabel: "Ops quote",
    number: r.quote_number,
    title: r.cargo_description || `Freight quote ${r.quote_number}`,
    requesterName: r.requester_name,
    requesterCompany: r.requester_company,
    requesterCountry: r.requester_country,
    originCountry: r.origin_country,
    destinationCountry: r.destination_country,
    rawStatus: r.status,
    stage: mapOpsQuoteStage(r.status),
    valueMinor: r.quoted_amount,
    currency: r.quoted_currency,
    validUntil: r.valid_until,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? null,
    detailUrl: `/admin/logistics/quotes/${r.id}`,
  }));
}

function mapQuotationStage(s: string): PipelineStage {
  switch (s) {
    case "draft": return "draft";
    case "submitted":
    case "revised": return "active";
    case "accepted": return "won";
    case "rejected":
    case "expired":
    case "withdrawn": return "lost";
    default: return "active";
  }
}

function mapBuyerRequestStage(s: string): PipelineStage {
  switch (s) {
    case "pending": return "new";
    case "in_review": return "active";
    case "matched": return "won";
    case "closed": return "lost";
    default: return "active";
  }
}

function mapOpsQuoteStage(s: string): PipelineStage {
  switch (s) {
    case "draft": return "draft";
    case "quoted":
    case "sent": return "active";
    case "accepted": return "won";
    case "declined":
    case "expired":
    case "archived": return "lost";
    default: return "active";
  }
}
