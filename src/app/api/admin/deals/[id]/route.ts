import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/deals/[id] — One deal thread with everything attached:
 * lifecycle ids + statuses, CRM activities, linked email thread messages,
 * and in-app conversation messages. The client merges them by time.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deal_threads")
    .select(`
      id, status, title, created_at, updated_at,
      rfq_id, quotation_id, purchase_order_id, supplier_order_id, shipment_id, conversation_id,
      rfqs ( rfq_number, status, title ),
      buyer:companies!deal_threads_buyer_company_id_fkey ( id, name, country_code ),
      supplier:companies!deal_threads_supplier_company_id_fkey ( id, name, country_code )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const [
    { data: opportunity },
    { data: activities },
    { data: emailThreads },
    { data: conversationMessages },
    { data: quotation },
  ] = await Promise.all([
    supabase
      .from("crm_opportunities")
      .select("id, name, stage, amount_minor, currency, updated_at")
      .eq("deal_thread_id", id)
      .maybeSingle(),
    supabase
      .from("crm_activities")
      .select(`
        id, activity_type, actor_type, occurred_at, reference_type, reference_id, metadata,
        user_profiles!crm_activities_actor_user_id_fkey ( full_name )
      `)
      .eq("deal_thread_id", id)
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabase
      .from("email_threads")
      .select(`
        id, mailbox_id, subject_normalized, last_message_at, message_count,
        email_messages ( id, direction, from_address, from_name, subject, snippet, sent_at )
      `)
      .eq("deal_thread_id", id),
    deal.conversation_id
      ? supabase
          .from("messages")
          .select("id, sender_name, sender_role, content, created_at")
          .eq("conversation_id", deal.conversation_id)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    deal.quotation_id
      ? supabase
          .from("quotations")
          .select("quotation_number, status, total_amount, currency, supplier_name")
          .eq("id", deal.quotation_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    deal,
    opportunity: opportunity ?? null,
    quotation: quotation ?? null,
    activities: activities ?? [],
    emailThreads: emailThreads ?? [],
    conversationMessages: conversationMessages ?? [],
  });
}
