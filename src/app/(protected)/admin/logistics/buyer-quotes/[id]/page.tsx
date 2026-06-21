import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminBuyerQuoteForm } from "@/components/admin/logistics/AdminBuyerQuoteForm";

export const dynamic = "force-dynamic";

export default async function AdminBuyerQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("buyer_quote_requests")
    .select(`
      *,
      user_profiles!buyer_user_id ( full_name, email, phone )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!quote) notFound();

  return <AdminBuyerQuoteForm quote={quote} />;
}
