"use server";

import { createClient } from "@/lib/supabase/server";

export interface LogisticsKpis {
  activeQuotes: number;           // ops freight quotes in quoted/sent + rfq quotations in submitted/revised
  expiringThisWeek: number;       // any active quote with valid_until within 7 days
  pipelineValueMinor: number;     // sum of quoted_amount for active ops quotes (USD-ish)
  winRate30d: number | null;      // accepted / (accepted + declined) over last 30 days; null if no decisions
  decisions30d: number;           // accepted + declined count (for context on win rate reliability)
  pendingScreening: number;       // screening hits awaiting compliance review
  openCustomsHolds: number;       // unresolved customs holds across all shipments
}

export interface ExpiringRow {
  id: string;
  number: string;
  title: string;
  validUntil: string;
  detailUrl: string;
  quotedMinor: number | null;
  currency: string | null;
}

export interface ExpiringLaneRow {
  id: string;
  lane: string;              // "CN → KE (lcl · platform_freight)"
  validTo: string;
  provider: string | null;
  source: string;
}

export interface ReferenceSummary {
  ports: { total: number; origin: number; destination: number };
  lanes: { total: number; bySource: Record<string, number>; expiringIn30Days: number };
  tariffs: { total: number; byCountry: Record<string, number> };
}

const ACTIVE_OPS = ["quoted", "sent"] as const;
const ACTIVE_RFQ = ["submitted", "revised"] as const;

export async function getLogisticsKpis(): Promise<LogisticsKpis> {
  const supabase = await createClient();
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [opsActive, rfqActive, opsExpiring, rfqExpiring, opsPipeline, opsDecisions, screeningPending, customsHolds] = await Promise.all([
    supabase.from("ops_freight_quotes").select("*", { count: "exact", head: true }).in("status", ACTIVE_OPS),
    supabase.from("quotations").select("*", { count: "exact", head: true }).in("status", ACTIVE_RFQ),
    supabase.from("ops_freight_quotes").select("*", { count: "exact", head: true })
      .in("status", ACTIVE_OPS).not("valid_until", "is", null).lte("valid_until", in7),
    supabase.from("quotations").select("*", { count: "exact", head: true })
      .in("status", ACTIVE_RFQ).not("valid_until", "is", null).lte("valid_until", in7),
    supabase.from("ops_freight_quotes").select("quoted_amount, quoted_currency").in("status", ACTIVE_OPS),
    supabase.from("ops_freight_quotes").select("status").in("status", ["accepted", "declined"]).gte("updated_at", thirtyDaysAgo),
    supabase.from("screening_checks").select("*", { count: "exact", head: true })
      .eq("result", "hit").is("reviewed_at", null),
    supabase.from("customs_holds").select("*", { count: "exact", head: true })
      .is("resolved_at", null),
  ]);

  const pipelineValueMinor = (opsPipeline.data ?? []).reduce(
    (sum, r) => sum + ((r as { quoted_amount: number | null }).quoted_amount ?? 0),
    0,
  );

  const decisions = opsDecisions.data ?? [];
  const accepted = decisions.filter((d) => (d as { status: string }).status === "accepted").length;
  const decisions30d = decisions.length;
  const winRate30d = decisions30d > 0 ? accepted / decisions30d : null;

  return {
    activeQuotes: (opsActive.count ?? 0) + (rfqActive.count ?? 0),
    expiringThisWeek: (opsExpiring.count ?? 0) + (rfqExpiring.count ?? 0),
    pipelineValueMinor,
    winRate30d,
    decisions30d,
    pendingScreening: screeningPending.count ?? 0,
    openCustomsHolds: customsHolds.count ?? 0,
  };
}

export async function getExpiringOpsQuotes(days = 7): Promise<ExpiringRow[]> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("ops_freight_quotes")
    .select("id, quote_number, cargo_description, valid_until, quoted_amount, quoted_currency, requester_company, requester_name")
    .in("status", ["quoted", "sent"])
    .not("valid_until", "is", null)
    .lte("valid_until", cutoff)
    .order("valid_until", { ascending: true })
    .limit(25);

  if (error) {
    console.error("getExpiringOpsQuotes failed", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.quote_number,
    title: r.cargo_description || (r.requester_company ?? r.requester_name ?? "Freight quote"),
    validUntil: r.valid_until!,
    detailUrl: `/admin/logistics/quotes/${r.id}`,
    quotedMinor: r.quoted_amount,
    currency: r.quoted_currency,
  }));
}

export async function getExpiringLanes(days = 14): Promise<ExpiringLaneRow[]> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("freight_lanes")
    .select(`
      id, origin_country, destination_country, shipping_method, container_type,
      valid_to, provider, source,
      origin_port:ports!freight_lanes_origin_port_id_fkey ( code ),
      destination_port:ports!freight_lanes_destination_port_id_fkey ( code )
    `)
    .eq("is_active", true)
    .not("valid_to", "is", null)
    .lte("valid_to", cutoff)
    .order("valid_to", { ascending: true })
    .limit(25);

  if (error) {
    console.error("getExpiringLanes failed", error);
    return [];
  }

  type Row = {
    id: string;
    origin_country: string | null;
    destination_country: string | null;
    shipping_method: string;
    container_type: string;
    valid_to: string;
    provider: string | null;
    source: string;
    origin_port: { code: string } | null;
    destination_port: { code: string } | null;
  };

  return (data as unknown as Row[]).map((r) => {
    const o = r.origin_port?.code ?? r.origin_country ?? "?";
    const d = r.destination_port?.code ?? r.destination_country ?? "?";
    return {
      id: r.id,
      lane: `${o} → ${d} (${r.container_type} · ${r.shipping_method.replace(/_/g, " ")})`,
      validTo: r.valid_to,
      provider: r.provider,
      source: r.source,
    };
  });
}

export async function getReferenceSummary(): Promise<ReferenceSummary> {
  const supabase = await createClient();
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [portsTotal, portsOrigin, portsDest, lanesTotal, lanesBySource, lanesExpiring, tariffs] = await Promise.all([
    supabase.from("ports").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("ports").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_origin", true),
    supabase.from("ports").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_destination", true),
    supabase.from("freight_lanes").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("freight_lanes").select("source").eq("is_active", true),
    supabase.from("freight_lanes").select("*", { count: "exact", head: true })
      .eq("is_active", true).not("valid_to", "is", null).lte("valid_to", in30),
    supabase.from("tariff_rates").select("destination_country").eq("is_active", true),
  ]);

  const bySource: Record<string, number> = {};
  for (const row of lanesBySource.data ?? []) {
    const s = (row as { source: string }).source;
    bySource[s] = (bySource[s] ?? 0) + 1;
  }

  const byCountry: Record<string, number> = {};
  for (const row of tariffs.data ?? []) {
    const c = (row as { destination_country: string }).destination_country;
    byCountry[c] = (byCountry[c] ?? 0) + 1;
  }

  return {
    ports: {
      total: portsTotal.count ?? 0,
      origin: portsOrigin.count ?? 0,
      destination: portsDest.count ?? 0,
    },
    lanes: {
      total: lanesTotal.count ?? 0,
      bySource,
      expiringIn30Days: lanesExpiring.count ?? 0,
    },
    tariffs: {
      total: tariffs.data?.length ?? 0,
      byCountry,
    },
  };
}
