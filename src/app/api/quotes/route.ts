import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/quotes
 * Buyer submits cart → creates a buyer_quote_request for platform to price.
 *
 * Body: {
 *   items:               CartItem[]   — cart snapshot
 *   destinationCountry:  string       — ISO 3166-1 alpha-2
 *   destinationPortCode: string?      — UN/LOCODE (e.g. NGLOS)
 *   destinationCity:     string?
 *   shippingMode:        string       — lcl | fcl_20 | fcl_40 | fcl_40hc | air_express | air_freight
 *   incoterms:           string       — ddp | fob | cif | exw | dap | cpt | fca
 *   cargoReadyDate:      string?      — ISO date YYYY-MM-DD
 *   buyerNotes:          string?
 *   buyerCompanyName:    string?
 *   buyerTaxId:          string?
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    items,
    destinationCountry,
    destinationPortCode,
    destinationCity,
    shippingMode = "lcl",
    incoterms = "ddp",
    cargoReadyDate,
    buyerNotes,
    buyerCompanyName,
    buyerTaxId,
  } = body as {
    items?: unknown[];
    destinationCountry?: string;
    destinationPortCode?: string;
    destinationCity?: string;
    shippingMode?: string;
    incoterms?: string;
    cargoReadyDate?: string;
    buyerNotes?: string;
    buyerCompanyName?: string;
    buyerTaxId?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required and must not be empty" }, { status: 400 });
  }
  if (!destinationCountry) {
    return NextResponse.json({ error: "destinationCountry is required" }, { status: 400 });
  }

  // Sum goods value from cart items (unitPrice in minor units × quantity)
  const productSubtotal = (items as Array<{ unitPrice?: number; quantity?: number }>).reduce(
    (sum, item) => sum + Math.round((item.unitPrice ?? 0) * (item.quantity ?? 1)),
    0
  );

  const { data: quote, error } = await supabase
    .from("buyer_quote_requests")
    .insert({
      buyer_user_id:        profile.id,
      buyer_company_name:   buyerCompanyName ?? null,
      buyer_tax_id:         buyerTaxId ?? null,
      items,
      destination_country:  destinationCountry,
      destination_port_code: destinationPortCode ?? null,
      destination_city:     destinationCity ?? null,
      shipping_mode:        shippingMode,
      incoterms,
      cargo_ready_date:     cargoReadyDate ?? null,
      buyer_notes:          buyerNotes ?? null,
      status:               "submitted",
      product_subtotal:     productSubtotal,
      currency:             "USD",
      expires_at:           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, quote_number, status, expires_at")
    .single();

  if (error || !quote) {
    console.error("[quotes] insert failed:", error);
    return NextResponse.json({ error: "Failed to create quote request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, quoteId: quote.id, quoteNumber: quote.quote_number });
}

/**
 * GET /api/quotes
 * List the authenticated buyer's quote requests, newest first.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: quotes, error } = await supabase
    .from("buyer_quote_requests")
    .select(`
      id, quote_number, status, destination_country, destination_city,
      shipping_mode, incoterms, product_subtotal, total_amount, currency,
      expires_at, created_at, updated_at
    `)
    .eq("buyer_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }

  return NextResponse.json({ quotes: quotes ?? [] });
}
