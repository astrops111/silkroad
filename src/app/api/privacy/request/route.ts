import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES = ["know", "delete", "correct", "opt_out"] as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fullName, email, requestType, details } = body as Record<string, unknown>;

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!requestType || !VALID_TYPES.includes(requestType as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid requestType" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("privacy_requests").insert({
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    request_type: requestType,
    details: typeof details === "string" && details.trim() ? details.trim() : null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to record request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
