import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createTicket } from "@/lib/support/tickets";

const createSchema = z.object({
  subject: z.string().min(3).max(300),
  body: z.string().max(5000).optional(),
});

/**
 * POST /api/tickets — Authenticated users open a support ticket in-app.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  const ticket = await createTicket({
    subject: parsed.data.subject,
    source: "in_app",
    requesterUserId: profile.id,
    requesterEmail: profile.email,
    companyId: membership?.company_id ?? null,
    body: parsed.data.body ?? null,
  });

  if (!ticket) return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });

  return NextResponse.json({ success: true, ticketNumber: ticket.ticketNumber });
}

/**
 * GET /api/tickets — The caller's own tickets (RLS: requester read-own).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[tickets] list", error);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }

  return NextResponse.json({ tickets: tickets ?? [] });
}
