import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import OrderDetailClient from "./order-detail-client";

export const dynamic = "force-dynamic";

export default async function SupplierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) => canSupply(m.companies?.type));
  if (!membership) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("*, supplier_order_items(*)")
    .eq("id", id)
    .eq("supplier_id", membership.company_id)
    .maybeSingle();

  if (!order) notFound();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_company_name")
    .eq("id", order.purchase_order_id)
    .maybeSingle();

  return (
    <OrderDetailClient
      order={{
        id: order.id,
        orderNumber: order.order_number,
        buyer: po?.buyer_company_name ?? "Unknown Buyer",
        status: order.status ?? "paid",
        createdAt: order.created_at,
        currency: order.currency ?? "USD",
        totalAmount: order.total_amount,
        items: (order.supplier_order_items ?? []).map((item: Tables<"supplier_order_items">) => ({
          id: item.id,
          name: item.product_name,
          variantName: item.variant_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
        shipping: {
          recipientName: order.recipient_name,
          recipientPhone: order.recipient_phone,
          address: order.ship_to_address,
          city: order.ship_to_city,
          country: order.ship_to_country,
        },
      }}
      currentUserId={membership.user_id}
    />
  );
}
