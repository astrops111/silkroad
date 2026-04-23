import { createClient } from "@/lib/supabase/server";

// ============================================================
// FX provider for the landed-cost engine.
//
// Reads exchange_rates (populated hourly by /api/cron/exchange-rates)
// to convert lane-currency amounts into the input currency at quote
// time. Mirrors the lookup precedence used by
// src/lib/payments/currency.ts#getExchangeRate but exposes only the
// numeric rate the engine needs — not the source/audit metadata.
//
// Returns null when no rate is available; the engine treats null as
// "fall back to as-is + warning" so missing FX data doesn't silently
// scale a quote by 1.
// ============================================================

export interface FxProvider {
  getRate(from: string, to: string): Promise<number | null>;
}

export class DBFxProvider implements FxProvider {
  async getRate(from: string, to: string): Promise<number | null> {
    if (from === to) return 1;
    const supabase = await createClient();

    // Direct rate first.
    const { data: direct } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", from)
      .eq("to_currency", to)
      .maybeSingle();
    if (direct?.rate) return Number(direct.rate);

    // Via USD.
    const [{ data: fromUsd }, { data: usdTo }] = await Promise.all([
      supabase.from("exchange_rates").select("rate").eq("from_currency", from).eq("to_currency", "USD").maybeSingle(),
      supabase.from("exchange_rates").select("rate").eq("from_currency", "USD").eq("to_currency", to).maybeSingle(),
    ]);
    if (fromUsd?.rate && usdTo?.rate) return Number(fromUsd.rate) * Number(usdTo.rate);

    // Inverse-via-USD: invert USD→from then multiply by USD→to.
    const { data: usdFrom } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", "USD")
      .eq("to_currency", from)
      .maybeSingle();
    if (usdFrom?.rate && usdTo?.rate) return Number(usdTo.rate) / Number(usdFrom.rate);

    return null;
  }
}
