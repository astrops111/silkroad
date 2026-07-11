import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/mail/sequences — Sequences with steps + enrollment stats.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const [{ data: sequences, error }, { data: enrollments }] = await Promise.all([
    supabase
      .from("email_sequences")
      .select(`
        id, name, description, trigger_event, is_active, created_at,
        email_sequence_steps ( id, step_order, delay_hours, subject_template )
      `)
      .order("name"),
    supabase
      .from("email_sequence_enrollments")
      .select("sequence_id, status"),
  ]);

  if (error) {
    console.error("[admin/mail/sequences]", error);
    return NextResponse.json({ error: "Failed to load sequences" }, { status: 500 });
  }

  const stats = new Map<string, { active: number; completed: number; stopped: number }>();
  for (const e of enrollments ?? []) {
    const s = stats.get(e.sequence_id) ?? { active: 0, completed: 0, stopped: 0 };
    if (e.status === "active") s.active++;
    else if (e.status === "completed") s.completed++;
    else s.stopped++;
    stats.set(e.sequence_id, s);
  }

  return NextResponse.json({
    sequences: (sequences ?? []).map((s) => ({
      ...s,
      enrollmentStats: stats.get(s.id) ?? { active: 0, completed: 0, stopped: 0 },
    })),
  });
}

const toggleSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

/**
 * PATCH /api/admin/mail/sequences — Enable/disable a sequence.
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

  const parsed = toggleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "id and isActive required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_sequences")
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[admin/mail/sequences] toggle", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_sequence_toggled",
    targetEntity: "email_sequence",
    targetId: parsed.data.id,
    reason: parsed.data.isActive ? "activated" : "deactivated",
  });

  return NextResponse.json({ success: true });
}
