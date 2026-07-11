import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { logActivity } from "@/lib/crm/activities";

/**
 * GET /api/admin/crm/activities — Timeline entries.
 * Query: companyId? | dealThreadId? | opportunityId? | contactId?, limit?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  let query = supabase
    .from("crm_activities")
    .select(`
      id, activity_type, actor_type, occurred_at, reference_type, reference_id,
      deal_thread_id, opportunity_id, email_message_id, metadata,
      user_profiles!crm_activities_actor_user_id_fkey ( id, full_name ),
      crm_contacts!crm_activities_contact_id_fkey ( id, full_name, email )
    `)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  const companyId = searchParams.get("companyId");
  const dealThreadId = searchParams.get("dealThreadId");
  const opportunityId = searchParams.get("opportunityId");
  const contactId = searchParams.get("contactId");

  if (companyId) query = query.eq("company_id", companyId);
  if (dealThreadId) query = query.eq("deal_thread_id", dealThreadId);
  if (opportunityId) query = query.eq("opportunity_id", opportunityId);
  if (contactId) query = query.eq("contact_id", contactId);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/crm/activities]", error);
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [] });
}

const noteSchema = z.object({
  body: z.string().min(1).max(5000),
  companyId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  opportunityId: z.string().uuid().nullable().optional(),
  dealThreadId: z.string().uuid().nullable().optional(),
});

/**
 * POST /api/admin/crm/activities — Add a manual note (crm_notes row +
 * a 'note' activity on the timeline).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = noteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from("crm_notes")
    .insert({
      body: input.body,
      company_id: input.companyId ?? null,
      contact_id: input.contactId ?? null,
      opportunity_id: input.opportunityId ?? null,
      author_user_id: auth.profile.id,
    })
    .select("id")
    .single();

  if (error || !note) {
    console.error("[admin/crm/activities] note insert", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }

  await logActivity({
    activityType: "note",
    actorType: "user",
    actorUserId: auth.profile.id,
    companyId: input.companyId ?? null,
    contactId: input.contactId ?? null,
    opportunityId: input.opportunityId ?? null,
    dealThreadId: input.dealThreadId ?? null,
    referenceType: "crm_note",
    referenceId: note.id,
    metadata: { preview: input.body.slice(0, 140) },
  });

  return NextResponse.json({ success: true, noteId: note.id });
}
