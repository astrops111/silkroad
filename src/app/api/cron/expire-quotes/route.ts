import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("buyer_quote_requests")
    .update({ status: "expired", updated_at: now })
    .in("status", ["submitted", "calculating", "ready"])
    .lt("expires_at", now)
    .select("id, quote_number");

  if (error) {
    console.error("[cron/expire-quotes]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length ?? 0;
  console.log(`[cron/expire-quotes] Expired ${count} quotes`);
  return NextResponse.json({ success: true, expired: count });
}
