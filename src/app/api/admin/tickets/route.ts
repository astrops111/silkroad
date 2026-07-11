import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { addTicketEvent } from "@/lib/support/tickets";
import { logActivity } from "@/lib/crm/activities";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/tickets — Ticket queue.
 * Query: status?, priority?, assigneeUserId?, page?, pageSize?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeUserId = searchParams.get("assigneeUserId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 200);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, subject, status, priority, source,
      requester_email, sla_due_at, first_response_at, resolved_at, created_at,
      ai_triage, email_thread_id, deal_thread_id,
      companies ( id, name ),
      assignee:user_profiles!tickets_assignee_user_id_fkey ( id, full_name )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (assigneeUserId) query = query.eq("assignee_user_id", assigneeUserId);

  const { data, count, error } = await query;
  if (error) {
    console.error("[admin/tickets]", error);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [], total: count ?? 0 });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
});

/**
 * PATCH /api/admin/tickets — Update status/priority/assignee.
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
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("tickets")
    .select("id, ticket_number, status, priority, company_id, deal_thread_id")
    .eq("id", input.id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status !== undefined) {
    update.status = input.status;
    if (input.status === "resolved" || input.status === "closed") {
      update.resolved_at = new Date().toISOString();
    }
  }
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.assigneeUserId !== undefined) update.assignee_user_id = input.assigneeUserId;

  const { error } = await supabase.from("tickets").update(update).eq("id", input.id);
  if (error) {
    console.error("[admin/tickets] update", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (input.status && input.status !== current.status) {
    await addTicketEvent(input.id, "status_changed", { from: current.status, to: input.status }, auth.profile.id);
    if (input.status === "resolved") {
      await logActivity({
        activityType: "ticket_resolved",
        actorType: "user",
        actorUserId: auth.profile.id,
        companyId: current.company_id,
        dealThreadId: current.deal_thread_id,
        referenceType: "ticket",
        referenceId: current.id,
        metadata: { ticketNumber: current.ticket_number },
      });
    }
  }
  if (input.priority && input.priority !== current.priority) {
    await addTicketEvent(input.id, "priority_changed", { from: current.priority, to: input.priority }, auth.profile.id);
  }
  if (input.assigneeUserId !== undefined) {
    await addTicketEvent(input.id, "assigned", { assigneeUserId: input.assigneeUserId }, auth.profile.id);
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "ticket_updated",
    targetEntity: "ticket",
    targetId: input.id,
    targetLabel: current.ticket_number,
    reason: `fields: ${Object.keys(update).filter((k) => k !== "updated_at").join(", ")}`,
  });

  return NextResponse.json({ success: true });
}
