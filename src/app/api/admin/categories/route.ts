import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/categories — Flat list of all active categories for selects
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id, level, slug")
    .eq("is_active", true)
    .order("level")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ categories: data ?? [] });
}
