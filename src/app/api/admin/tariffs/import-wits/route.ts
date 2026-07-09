import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { fetchWitsTariffRate } from "@/lib/logistics/tariffs/wits";

// WITS can take up to ~10s per year attempted (observed in practice, not
// just theoretical — see fetchWitsTariffRate's REQUEST_TIMEOUT_MS), and
// tries up to 5 years per pair. Worst case per pair: ~50s. Bounded pairs +
// concurrency keeps a full batch inside maxDuration; on plans that cap
// maxDuration lower (e.g. Hobby's 60s), Vercel silently clamps this down —
// call again with fewer pairs if imports start failing on such a plan.
export const maxDuration = 300;
const MAX_PAIRS = 20;
const CONCURRENCY = 4;

interface ImportPair {
  hsCode: string;
  destinationCountry: string;
}

interface ImportedRow {
  hsCode: string;
  destinationCountry: string;
  dutyPct: number;
  year: number;
}

interface SkippedRow {
  hsCode: string;
  destinationCountry: string;
  reason: string;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * POST /api/admin/tariffs/import-wits — bulk-pull MFN duty rates from the
 * free WITS TRAINS API for the given HS×destination pairs and upsert them
 * into tariff_rates (source='tariff_db', provider='wits'). Duty only — VAT
 * and excise still need manual entry via /admin/logistics/reference.
 * Body: { pairs: { hsCode, destinationCountry }[], year?: number }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = (await request.json()) as { pairs?: ImportPair[]; year?: number };
  const pairs = body.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return NextResponse.json({ error: "pairs[] is required" }, { status: 400 });
  }
  if (pairs.length > MAX_PAIRS) {
    return NextResponse.json(
      { error: `Max ${MAX_PAIRS} pairs per import — call again for the rest` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const imported: ImportedRow[] = [];
  const skipped: SkippedRow[] = [];

  await mapWithConcurrency(pairs, CONCURRENCY, async (pair) => {
    try {
      const rate = await fetchWitsTariffRate({
        destinationCountry: pair.destinationCountry,
        hsCode: pair.hsCode,
        year: body.year,
      });
      if (!rate) {
        skipped.push({ ...pair, reason: "No WITS data for this HS code / country in recent years" });
        return;
      }

      const { error } = await supabase.from("tariff_rates").upsert(
        {
          hs_prefix: rate.hsCode,
          destination_country: rate.destinationCountry,
          duty_pct: rate.dutyPct,
          vat_pct: 0, // WITS TRAINS is duty-only — set VAT/excise manually
          excise_pct: 0,
          source: "tariff_db",
          provider: "wits",
          notes:
            `Imported from WITS TRAINS: ${rate.tariffType} (${rate.measure}), ` +
            `reported year ${rate.year}, ${rate.totalLines} tariff line(s) averaged. ` +
            `VAT/excise NOT sourced from WITS — verify and set manually.`,
          effective_from: today,
          is_active: true,
        },
        { onConflict: "hs_prefix,destination_country,effective_from" }
      );

      if (error) {
        skipped.push({ ...pair, reason: error.message });
        return;
      }
      imported.push({
        hsCode: rate.hsCode,
        destinationCountry: rate.destinationCountry,
        dutyPct: rate.dutyPct,
        year: rate.year,
      });
    } catch (e) {
      skipped.push({ ...pair, reason: (e as Error).message });
    }
  });

  return NextResponse.json({ success: true, imported, skipped });
}
