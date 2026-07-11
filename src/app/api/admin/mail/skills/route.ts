import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

const ACTIONS = ["draft_reply", "create_ticket", "link_to_rfq", "create_crm_activity", "escalate"] as const;

/**
 * GET /api/admin/mail/skills — Skills + recent run stats.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const [{ data: skills, error }, { data: runs }] = await Promise.all([
    supabase
      .from("email_skills")
      .select(`
        id, name, description, mailbox_id, trigger_conditions, prompt_template,
        allowed_actions, priority, is_active, created_at,
        mailboxes ( address )
      `)
      .order("priority"),
    supabase
      .from("email_skill_runs")
      .select("id, skill_id, status, actions_taken, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (error) {
    console.error("[admin/mail/skills]", error);
    return NextResponse.json({ error: "Failed to load skills" }, { status: 500 });
  }

  return NextResponse.json({ skills: skills ?? [], recentRuns: runs ?? [] });
}

const skillSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  mailboxId: z.string().uuid().nullable().optional(),
  triggerConditions: z
    .object({
      from_pattern: z.string().max(300).optional(),
      subject_pattern: z.string().max(300).optional(),
    })
    .default({}),
  promptTemplate: z.string().min(10).max(10_000),
  allowedActions: z.array(z.enum(ACTIONS)).min(1),
  priority: z.number().int().min(1).max(1000).default(100),
  isActive: z.boolean().default(true),
});

/**
 * POST /api/admin/mail/skills — Create a skill.
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

  const parsed = skillSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { data: skill, error } = await supabase
    .from("email_skills")
    .insert({
      name: input.name,
      description: input.description ?? null,
      mailbox_id: input.mailboxId ?? null,
      trigger_conditions: input.triggerConditions,
      prompt_template: input.promptTemplate,
      allowed_actions: input.allowedActions,
      priority: input.priority,
      is_active: input.isActive,
      created_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/mail/skills] create", error);
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_skill_created",
    targetEntity: "email_skill",
    targetId: skill.id,
    targetLabel: input.name,
  });

  return NextResponse.json({ success: true, skillId: skill.id });
}

const updateSchema = skillSchema.partial().extend({ id: z.string().uuid() });

/**
 * PATCH /api/admin/mail/skills — Update a skill (id in body).
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
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.mailboxId !== undefined) update.mailbox_id = input.mailboxId;
  if (input.triggerConditions !== undefined) update.trigger_conditions = input.triggerConditions;
  if (input.promptTemplate !== undefined) update.prompt_template = input.promptTemplate;
  if (input.allowedActions !== undefined) update.allowed_actions = input.allowedActions;
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const supabase = await createClient();
  const { error } = await supabase.from("email_skills").update(update).eq("id", input.id);

  if (error) {
    console.error("[admin/mail/skills] update", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_skill_updated",
    targetEntity: "email_skill",
    targetId: input.id,
    reason: `fields: ${Object.keys(update).filter((k) => k !== "updated_at").join(", ")}`,
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/mail/skills — Delete a skill (id in body).
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = rawBody as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("email_skills").delete().eq("id", id);

  if (error) {
    console.error("[admin/mail/skills] delete", error);
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_skill_deleted",
    targetEntity: "email_skill",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
