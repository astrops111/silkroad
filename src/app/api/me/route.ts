import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/me — Minimal identity for client shells (navbar greeting, menus).
 *
 * Always 200: `{ user: null }` when signed out, so the navbar can render
 * without treating "not signed in" as an error. Profile is read through the
 * service client for the same reason the dashboard layout does — RLS can
 * return an empty row for the user's own profile during session races.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("full_name, email")
    .eq("auth_id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? null;
  const email = profile?.email ?? user.email ?? null;

  return NextResponse.json(
    {
      user: {
        name: displayName(fullName, email),
        fullName,
        email,
        initials: initials(fullName ?? email ?? "U"),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Greeting name — first name when we have one, else the local part of the
// email, else a neutral fallback.
function displayName(fullName: string | null, email: string | null): string {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  const local = email?.split("@")[0];
  return local || "there";
}

function initials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
