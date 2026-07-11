import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/crm/opportunities — Pipeline list (kanban/table source).
 * Query: stage?, companyId?, page?, pageSize?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const stage = searchParams.get("stage");
  const companyId = searchParams.get("companyId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "100", 10), 200);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("crm_opportunities")
    .select(
      `
      id, name, stage, amount_minor, currency, expected_close_date, lost_reason,
      deal_thread_id, created_at, updated_at,
      companies ( id, name, country_code ),
      crm_contacts!crm_opportunities_primary_contact_id_fkey ( id, full_name, email ),
      user_profiles!crm_opportunities_owner_user_id_fkey ( id, full_name )
    `,
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (stage) query = query.eq("stage", stage);
  if (companyId) query = query.eq("company_id", companyId);

  const { data, count, error } = await query;
  if (error) {
    console.error("[admin/crm/opportunities]", error);
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }

  return NextResponse.json({ opportunities: data ?? [], total: count ?? 0 });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(["lead", "rfq_submitted", "quoted", "negotiation", "won", "lost"]).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
  name: z.string().min(1).max(200).optional(),
});

/**
 * PATCH /api/admin/crm/opportunities — Manual stage/owner adjustments.
 * (Lifecycle hooks keep stages in sync automatically; this is the
 * human override for e.g. marking lost with a reason.)
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.stage !== undefined) update.stage = input.stage;
  if (input.ownerUserId !== undefined) update.owner_user_id = input.ownerUserId;
  if (input.expectedCloseDate !== undefined) update.expected_close_date = input.expectedCloseDate;
  if (input.lostReason !== undefined) update.lost_reason = input.lostReason;
  if (input.name !== undefined) update.name = input.name;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_opportunities")
    .update(update)
    .eq("id", input.id);

  if (error) {
    console.error("[admin/crm/opportunities] update", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
