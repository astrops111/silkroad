import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

interface FilterResult {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * GET /api/admin/mail/filters?type=case|company|rfq|person&search=
 * Small unified autocomplete endpoint backing the mail inbox filter bar.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const rawSearch = (searchParams.get("search") ?? "").trim();
  // Commas/parens are PostgREST .or() filter syntax — strip them so a
  // search containing either doesn't break the query.
  const search = rawSearch.replace(/[,()]/g, "");

  if (!search) {
    return NextResponse.json({ results: [] });
  }

  let results: FilterResult[] = [];

  switch (type) {
    case "case": {
      const { data } = await supabase
        .from("deal_threads")
        .select(
          `
          id, title, status,
          buyer:companies!deal_threads_buyer_company_id_fkey ( name ),
          supplier:companies!deal_threads_supplier_company_id_fkey ( name )
          `
        )
        .ilike("title", `%${search}%`)
        .order("updated_at", { ascending: false })
        .limit(10);
      results = (data ?? []).map((c) => {
        const buyer = Array.isArray(c.buyer) ? c.buyer[0] : c.buyer;
        const supplier = Array.isArray(c.supplier) ? c.supplier[0] : c.supplier;
        return {
          id: c.id,
          label: c.title ?? "(untitled case)",
          sublabel: [buyer?.name, supplier?.name].filter(Boolean).join(" ↔ ") || c.status,
        };
      });
      break;
    }
    case "company": {
      const { data } = await supabase
        .from("companies")
        .select("id, name, type")
        .ilike("name", `%${search}%`)
        .limit(10);
      results = (data ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.type ?? undefined }));
      break;
    }
    case "rfq": {
      const { data } = await supabase
        .from("rfqs")
        .select("id, rfq_number, title, companies:buyer_company_id ( name )")
        .or(`rfq_number.ilike.%${search}%,title.ilike.%${search}%`)
        .limit(10);
      results = (data ?? []).map((r) => {
        const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
        return {
          id: r.id,
          label: `${r.rfq_number} — ${r.title ?? ""}`.trim(),
          sublabel: company?.name ?? undefined,
        };
      });
      break;
    }
    case "person": {
      const { data } = await supabase
        .from("crm_contacts")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(10);
      results = (data ?? []).map((p) => ({
        id: p.id,
        label: p.full_name || p.email || "Unknown",
        sublabel: p.full_name ? (p.email ?? undefined) : undefined,
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ results });
}
