import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/products/search — Full-text product search with filters
 *
 * Query params:
 *   q          — search query (matches name, description via tsvector)
 *   category   — category slug or ID
 *   minPrice   — minimum price (stored units)
 *   maxPrice   — maximum price (stored units)
 *   minMoq     — minimum MOQ
 *   maxMoq     — maximum MOQ
 *   country    — supplier country code
 *   currency   — filter by currency
 *   tradeTerm  — fob, cif, exw, etc.
 *   verified   — "true" to show only verified suppliers
 *   featured   — "true" to show only featured products
 *   sort       — relevance, price_asc, price_desc, newest, moq_asc
 *   limit      — default 24
 *   offset     — default 0
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minMoq = searchParams.get("minMoq");
  const maxMoq = searchParams.get("maxMoq");
  const country = searchParams.get("country");
  const currency = searchParams.get("currency");
  const tradeTerm = searchParams.get("tradeTerm");
  const verified = searchParams.get("verified");
  const featured = searchParams.get("featured");
  const sort = searchParams.get("sort") || "relevance";
  const limit = parseInt(searchParams.get("limit") || "24", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Base query — only active, approved products
  let query = supabase
    .from("products")
    .select(
      `
      id, name, slug, description, base_price, compare_price, currency,
      moq, lead_time_days, trade_term, sample_available, sample_price,
      is_featured, origin_country, weight_kg, created_at,
      supplier_id,
      companies!products_supplier_id_fkey (
        id, name, slug, country_code, verification_status,
        supplier_profiles ( average_rating, total_orders, tier, response_rate )
      ),
      categories ( id, name, slug ),
      product_images ( id, url, alt_text, is_primary ),
      product_pricing_tiers ( id, min_quantity, max_quantity, unit_price, currency )
    `,
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("moderation_status", "approved")
    .range(offset, offset + limit - 1);

  // Full-text search
  if (q) {
    query = query.textSearch("search_vector", q, { type: "websearch" });
  }

  // Category filter
  if (category) {
    // Try as slug first, then UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(category);
    if (isUuid) {
      query = query.eq("category_id", category);
    } else {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .single();
      if (cat) query = query.eq("category_id", cat.id);
    }
  }

  // Price range
  if (minPrice) query = query.gte("base_price", parseInt(minPrice, 10));
  if (maxPrice) query = query.lte("base_price", parseInt(maxPrice, 10));

  // MOQ range
  if (minMoq) query = query.gte("moq", parseInt(minMoq, 10));
  if (maxMoq) query = query.lte("moq", parseInt(maxMoq, 10));

  // Country filter (supplier country)
  if (country) {
    const { data: supplierIds } = await supabase
      .from("companies")
      .select("id")
      .eq("country_code", country)
      .eq("type", "supplier");
    if (supplierIds) {
      query = query.in("supplier_id", supplierIds.map((s) => s.id));
    }
  }

  // Currency filter
  if (currency) query = query.eq("currency", currency);

  // Trade term filter
  if (tradeTerm) query = query.eq("trade_term", tradeTerm);

  // Verified suppliers only
  if (verified === "true") {
    const { data: verifiedIds } = await supabase
      .from("companies")
      .select("id")
      .eq("verification_status", "verified")
      .eq("type", "supplier");
    if (verifiedIds) {
      query = query.in("supplier_id", verifiedIds.map((s) => s.id));
    }
  }

  // Featured only
  if (featured === "true") query = query.eq("is_featured", true);

  // Sorting
  switch (sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "moq_asc":
      query = query.order("moq", { ascending: true });
      break;
    case "relevance":
    default:
      // For text search, Supabase sorts by relevance by default
      // For non-search, sort by featured first then newest
      if (!q) {
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
      }
      break;
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get available categories for filter sidebar
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, level")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Get available countries for filter
  const { data: supplierCountries } = await supabase
    .from("companies")
    .select("country_code")
    .eq("type", "supplier")
    .eq("is_active", true);

  const uniqueCountries = [...new Set((supplierCountries || []).map((c) => c.country_code))];

  return NextResponse.json({
    products: data || [],
    total: count || 0,
    limit,
    offset,
    filters: {
      categories: categories || [],
      countries: uniqueCountries,
      sort,
    },
  });
}
