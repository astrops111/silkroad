import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/mail/templates — All managed email templates.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("id, name, category, subject_template, html_template, variables, is_active, updated_at")
    .order("category")
    .order("name");

  if (error) {
    console.error("[admin/mail/templates]", error);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }

  return NextResponse.json({ templates: templates ?? [] });
}

const templateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_]+$/, "name must be snake_case"),
  category: z.enum(["transactional", "reply", "outreach"]).default("transactional"),
  subjectTemplate: z.string().min(1).max(500),
  htmlTemplate: z.string().min(1).max(100_000),
  variables: z.array(z.string().max(60)).default([]),
  isActive: z.boolean().default(true),
});

/**
 * POST /api/admin/mail/templates — Create a template.
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

  const parsed = templateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").insert({
    name: input.name,
    category: input.category,
    subject_template: input.subjectTemplate,
    html_template: input.htmlTemplate,
    variables: input.variables,
    is_active: input.isActive,
    updated_by: auth.profile.id,
  });

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_template_created",
    targetEntity: "email_template",
    targetLabel: input.name,
  });

  return NextResponse.json({ success: true });
}

const updateSchema = templateSchema.partial().extend({ id: z.string().uuid() });

/**
 * PATCH /api/admin/mail/templates — Update a template (id in body).
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
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.profile.id,
  };
  if (input.name !== undefined) update.name = input.name;
  if (input.category !== undefined) update.category = input.category;
  if (input.subjectTemplate !== undefined) update.subject_template = input.subjectTemplate;
  if (input.htmlTemplate !== undefined) update.html_template = input.htmlTemplate;
  if (input.variables !== undefined) update.variables = input.variables;
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").update(update).eq("id", input.id);

  if (error) {
    console.error("[admin/mail/templates] update", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_template_updated",
    targetEntity: "email_template",
    targetId: input.id,
    reason: `fields: ${Object.keys(update).filter((k) => !["updated_at", "updated_by"].includes(k)).join(", ")}`,
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/mail/templates — Delete a template (id in body).
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
  const { error } = await supabase.from("email_templates").delete().eq("id", id);

  if (error) {
    console.error("[admin/mail/templates] delete", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: "email_template_deleted",
    targetEntity: "email_template",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
