import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import { getSupplierOrders } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import OrdersTable from "./orders-table";

export const dynamic = "force-dynamic";

export default async function SupplierOrders() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) => canSupply(m.companies?.type));
  if (!membership) {
    redirect("/dashboard");
  }

  const { orders } = await getSupplierOrders(membership.company_id, { limit: 200 });

  const poIds = Array.from(
    new Set(orders.map((o) => o.purchase_order_id).filter((id): id is string => !!id))
  );
  const buyerByPoId = new Map<string, string>();
  if (poIds.length > 0) {
    const supabase = await createClient();
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("id, buyer_company_name")
      .in("id", poIds);
    for (const po of pos ?? []) {
      buyerByPoId.set(po.id, po.buyer_company_name ?? "Unknown Buyer");
    }
  }

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    buyer: buyerByPoId.get(o.purchase_order_id) ?? "Unknown Buyer",
    itemCount: o.supplier_order_items?.length ?? 0,
    totalAmount: o.total_amount,
    currency: o.currency ?? "USD",
    status: o.status ?? "paid",
    createdAt: o.created_at,
  }));

  return <OrdersTable orders={rows} />;
}
