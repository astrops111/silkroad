import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/crm/contacts — Contact list, or one contact + timeline.
 * Query: id? (detail mode), search?, companyId?, source?, page?, pageSize?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (id) {
    const [{ data: contact }, { data: activities }] = await Promise.all([
      supabase
        .from("crm_contacts")
        .select(`
          id, user_id, full_name, email, phone, title, country_code, source, created_at,
          companies ( id, name, type, country_code )
        `)
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("crm_activities")
        .select("id, activity_type, actor_type, occurred_at, reference_type, reference_id, deal_thread_id, metadata")
        .eq("contact_id", id)
        .order("occurred_at", { ascending: false })
        .limit(100),
    ]);

    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ contact, activities: activities ?? [] });
  }

  const search = searchParams.get("search");
  const companyId = searchParams.get("companyId");
  const source = searchParams.get("source");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 200);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("crm_contacts")
    .select(
      `
      id, user_id, full_name, email, phone, country_code, source, created_at,
      companies ( id, name, type )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (companyId) query = query.eq("company_id", companyId);
  if (source) query = query.eq("source", source);

  const { data, count, error } = await query;
  if (error) {
    console.error("[admin/crm/contacts]", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [], total: count ?? 0 });
}
