import { listAdminShipments } from "@/lib/queries/shipments";
import { ShipmentsListClient } from "./shipments-client";

export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage() {
  const shipments = await listAdminShipments();
  return <ShipmentsListClient shipments={shipments} />;
}
