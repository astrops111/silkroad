import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/logistics — List shipments, drivers, fleet stats
 * Query params: status, driverId, zoneId, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Fetch shipments
  let shipmentQuery = supabase
    .from("b2b_shipments")
    .select(
      `
      id, shipment_number, shipping_method, status, tracking_number,
      pickup_city, pickup_country, delivery_city, delivery_country,
      delivery_contact_name, delivery_contact_phone,
      total_weight_kg, package_count, shipping_cost, currency,
      estimated_delivery_at, dispatched_at, delivered_at, created_at,
      assigned_driver_id, assigned_vehicle_id
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    shipmentQuery = shipmentQuery.eq("status", status);
  }

  const { data: shipments, error: shipmentError, count } = await shipmentQuery;

  if (shipmentError) {
    console.error("[admin/logistics]", shipmentError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Fleet stats
  const { count: totalDrivers } = await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true });

  const { count: availableDrivers } = await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true })
    .eq("status", "available");

  const { count: totalVehicles } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true });

  const { count: activeVehicles } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_use");

  const { count: activeShipments } = await supabase
    .from("b2b_shipments")
    .select("id", { count: "exact", head: true })
    .in("status", ["dispatched", "in_transit", "out_for_delivery"]);

  return NextResponse.json({
    shipments: shipments || [],
    total: count || 0,
    stats: {
      totalDrivers: totalDrivers || 0,
      availableDrivers: availableDrivers || 0,
      totalVehicles: totalVehicles || 0,
      activeVehicles: activeVehicles || 0,
      activeShipments: activeShipments || 0,
      fleetUtilization: totalVehicles
        ? Math.round(((activeVehicles || 0) / totalVehicles) * 100)
        : 0,
    },
    limit,
    offset,
  });
}

/**
 * PATCH /api/admin/logistics — Assign driver/vehicle, update shipment status
 * Body: { shipmentId, action, driverId?, vehicleId?, status? }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { shipmentId, action, driverId, vehicleId, status: newStatus } = await request.json();

  if (!shipmentId || !action) {
    return NextResponse.json({ error: "Missing shipmentId or action" }, { status: 400 });
  }

  switch (action) {
    case "assign_driver": {
      if (!driverId) {
        return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
      }

      const { error } = await supabase
        .from("b2b_shipments")
        .update({
          assigned_driver_id: driverId,
          assigned_vehicle_id: vehicleId || null,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", shipmentId);

      if (error) {
        console.error("[admin/logistics]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      // Update driver status
      await supabase
        .from("drivers")
        .update({ status: "on_delivery" })
        .eq("id", driverId);

      // Update vehicle status
      if (vehicleId) {
        await supabase
          .from("vehicles")
          .update({ status: "in_use" })
          .eq("id", vehicleId);
      }

      // Log tracking event
      await supabase.from("shipment_tracking_events").insert({
        shipment_id: shipmentId,
        event_type: "assigned",
        description: `Driver assigned`,
        driver_id: driverId,
      });

      return NextResponse.json({ success: true, action: "assign_driver" });
    }

    case "dispatch": {
      const { error } = await supabase
        .from("b2b_shipments")
        .update({
          status: "dispatched",
          dispatched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", shipmentId);

      if (error) {
        console.error("[admin/logistics]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      await supabase.from("shipment_tracking_events").insert({
        shipment_id: shipmentId,
        event_type: "dispatched",
        description: "Shipment dispatched for delivery",
      });

      return NextResponse.json({ success: true, action: "dispatch" });
    }

    case "update_status": {
      if (!newStatus) {
        return NextResponse.json({ error: "Missing status" }, { status: 400 });
      }

      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "delivered") {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("b2b_shipments")
        .update(updates)
        .eq("id", shipmentId);

      if (error) {
        console.error("[admin/logistics]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      // Free up driver and vehicle on delivery
      if (newStatus === "delivered" || newStatus === "returned") {
        const { data: shipment } = await supabase
          .from("b2b_shipments")
          .select("assigned_driver_id, assigned_vehicle_id")
          .eq("id", shipmentId)
          .single();

        if (shipment && shipment.assigned_driver_id) {
          await supabase
            .from("drivers")
            .update({ status: "available" })
            .eq("id", shipment.assigned_driver_id);
        }
        if (shipment && shipment.assigned_vehicle_id) {
          await supabase
            .from("vehicles")
            .update({ status: "available" })
            .eq("id", shipment.assigned_vehicle_id);
        }
      }

      await supabase.from("shipment_tracking_events").insert({
        shipment_id: shipmentId,
        event_type: newStatus,
        description: `Status updated to ${newStatus}`,
      });

      return NextResponse.json({ success: true, action: "update_status", newStatus });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
