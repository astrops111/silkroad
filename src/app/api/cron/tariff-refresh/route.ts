import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getDefaultTariffApiClient,
  normalizeHsCode,
} from "@/lib/logistics/tariffs/simplyduty";

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  try {
    const expected = Buffer.from(`Bearer ${secret}`, "utf-8");
    const received = Buffer.from(authHeader, "utf-8");
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * GET /api/cron/tariff-refresh — keep tariff_rates current.
 *
 * Two passes, sharing one API-call budget (TARIFF_REFRESH_MAX_CALLS, def. 40):
 *   1. Re-verify — tariff_api rows not confirmed within
 *      TARIFF_REVERIFY_DAYS (default 30), stalest first.
 *   2. Gap fill — (destination country × HS code) pairs seen in products /
 *      ops_freight_quotes that no active tariff_rates prefix covers.
 *
 * Hand-seeded tariff_db rows are never modified — ops owns those.
 * No SIMPLYDUTY_API_KEY → run is a no-op (success with skipped counts).
 *
 * Cron config (vercel.json):
 *   { "path": "/api/cron/tariff-refresh", "schedule": "0 3 * * *" }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = getDefaultTariffApiClient();
  if (!api) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "SIMPLYDUTY_API_KEY not configured",
      timestamp: new Date().toISOString(),
    });
  }

  const maxCalls = Number(process.env.TARIFF_REFRESH_MAX_CALLS ?? 40);
  const reverifyDays = Number(process.env.TARIFF_REVERIFY_DAYS ?? 30);
  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  let checked = 0;
  let refreshed = 0;
  let inserted = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];
  let budget = maxCalls;

  // ---- Pass 1: re-verify stale tariff_api rows ----
  const staleBefore = new Date(Date.now() - reverifyDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleRows } = await supabase
    .from("tariff_rates")
    .select("id, hs_prefix, destination_country, last_verified_at")
    .eq("source", "tariff_api")
    .eq("is_active", true)
    .or(`last_verified_at.is.null,last_verified_at.lt.${staleBefore}`)
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(budget);

  for (const row of staleRows ?? []) {
    if (budget <= 0) {
      skipped++;
      continue;
    }
    checked++;
    budget--;
    try {
      const rate = await api.fetchRate({
        hsCode: row.hs_prefix,
        destinationCountry: row.destination_country,
      });
      if (!rate) {
        skipped++;
        continue;
      }
      const { error } = await supabase
        .from("tariff_rates")
        .update({
          duty_pct: rate.dutyPct,
          vat_pct: rate.vatPct,
          excise_pct: rate.excisePct,
          external_ref: rate.externalRef ?? null,
          last_verified_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      refreshed++;
    } catch (e) {
      failed++;
      errors.push(`${row.destination_country}/${row.hs_prefix}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ---- Pass 2: gap fill for HS×destination pairs with no coverage ----
  if (budget > 0) {
    const [{ data: destPorts }, { data: products }, { data: opsQuotes }] = await Promise.all([
      supabase.from("ports").select("country").eq("is_destination", true).eq("is_active", true),
      supabase.from("products").select("hs_code").not("hs_code", "is", null).limit(500),
      supabase
        .from("ops_freight_quotes")
        .select("hs_codes")
        .not("hs_codes", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const destinations = [...new Set((destPorts ?? []).map((p) => p.country))];
    const hsCodes = [
      ...new Set(
        [
          ...(products ?? []).map((p) => p.hs_code as string),
          ...(opsQuotes ?? []).flatMap((q) => q.hs_codes ?? []),
        ]
          .map(normalizeHsCode)
          .filter((c) => c.length >= 4),
      ),
    ];

    const today = new Date().toISOString().slice(0, 10);

    for (const country of destinations) {
      if (budget <= 0) break;

      const { data: existing } = await supabase
        .from("tariff_rates")
        .select("hs_prefix")
        .eq("destination_country", country)
        .eq("is_active", true);
      const prefixes = (existing ?? []).map((r) => normalizeHsCode(r.hs_prefix));

      const uncovered = hsCodes.filter((code) => !prefixes.some((p) => p && code.startsWith(p)));

      for (const hsCode of uncovered) {
        if (budget <= 0) {
          skipped++;
          continue;
        }
        checked++;
        budget--;
        try {
          const rate = await api.fetchRate({ hsCode, destinationCountry: country });
          if (!rate) {
            skipped++;
            continue;
          }
          const { error } = await supabase.from("tariff_rates").upsert(
            {
              hs_prefix: hsCode,
              destination_country: country,
              duty_pct: rate.dutyPct,
              vat_pct: rate.vatPct,
              excise_pct: rate.excisePct,
              source: "tariff_api",
              provider: api.providerId,
              external_ref: rate.externalRef ?? null,
              effective_from: today,
              last_verified_at: new Date().toISOString(),
              is_active: true,
              notes: "Auto-filled by tariff-refresh cron",
            },
            { onConflict: "hs_prefix,destination_country,effective_from" },
          );
          if (error) throw new Error(error.message);
          inserted++;
        } catch (e) {
          failed++;
          errors.push(`${country}/${hsCode}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  // ---- Audit row (best-effort) ----
  const { error: auditError } = await supabase.from("tariff_refresh_runs").insert({
    provider: api.providerId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    checked,
    refreshed,
    inserted,
    failed,
    skipped,
    details: errors.length > 0 ? { errors: errors.slice(0, 20) } : {},
  });
  if (auditError) {
    console.error("[cron/tariff-refresh] audit insert failed:", auditError.message);
  }

  return NextResponse.json({
    success: failed === 0,
    provider: api.providerId,
    checked,
    refreshed,
    inserted,
    failed,
    skipped,
    timestamp: new Date().toISOString(),
  });
}
