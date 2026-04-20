import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { optimizeRoutes } from "@/lib/logistics/route-optimizer";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import type {
  OptimizationStrategy,
  PendingShipment,
  AvailableDriver,
  AvailableVehicle,
  GeoPoint,
} from "@/lib/logistics/route-optimizer";

/**
 * POST /api/admin/logistics/optimize
 * Run AI route optimization for pending shipments at a warehouse.
 *
 * Body: { warehouseId, strategy?, date? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const blocked = await requireAIFeature("ai_route_optimizer");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  const supabase = await createClient();

  const body = await request.json();
  const {
    warehouseId,
    strategy = "balanced",
    date = new Date().toISOString().slice(0, 10),
  } = body as {
    warehouseId: string;
    strategy?: OptimizationStrategy;
    date?: string;
  };

  if (!warehouseId) {
    return NextResponse.json(
      { error: "warehouseId is required" },
      { status: 400 }
    );
  }

  // 1. Fetch warehouse
  const { data: warehouse, error: whErr } = await supabase
    .from("warehouses")
    .select("id, name, city, country_code, zone_id")
    .eq("id", warehouseId)
    .single();

  if (whErr || !warehouse) {
    return NextResponse.json(
      { error: "Warehouse not found" },
      { status: 404 }
    );
  }

  // 2. Fetch pending/assigned shipments from this warehouse
  const { data: shipments, error: shipErr } = await supabase
    .from("b2b_shipments")
    .select(
      `id, shipment_number, pickup_city, pickup_country,
       delivery_city, delivery_country, delivery_address, delivery_gps,
       delivery_contact_name, delivery_contact_phone,
       total_weight_kg, total_volume_cbm, package_count,
       is_fragile, requires_cold_chain, is_hazardous,
       destination_zone_id, origin_warehouse_id, pickup_address`
    )
    .eq("origin_warehouse_id", warehouseId)
    .in("status", ["pending", "assigned", "packed", "ready"])
    .order("created_at", { ascending: true });

  if (shipErr) {
    console.error("[admin/logistics/optimize]", shipErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!shipments || shipments.length === 0) {
    return NextResponse.json(
      {
        error: "No pending shipments at this warehouse",
        routes: [],
        stats: null,
      },
      { status: 200 }
    );
  }

  // 3. Fetch available drivers at this warehouse
  const { data: driverRows } = await supabase
    .from("drivers")
    .select(
      `id, user_id, phone, warehouse_id, current_location,
       rating, total_deliveries, vehicle_id`
    )
    .eq("status", "available")
    .eq("warehouse_id", warehouseId);

  // Get driver names from user_profiles
  const driverIds = (driverRows || []).map((d) => d.user_id);
  const { data: userProfiles } = driverIds.length > 0
    ? await supabase
        .from("user_profiles")
        .select("id, full_name")
        .in("id", driverIds)
    : { data: [] };

  const nameMap = new Map(
    (userProfiles || []).map((u) => [u.id, u.full_name])
  );

  const drivers: AvailableDriver[] = (driverRows || []).map((d) => ({
    id: d.id,
    user_id: d.user_id,
    full_name: nameMap.get(d.user_id) || "Driver",
    phone: d.phone,
    warehouse_id: d.warehouse_id,
    current_location: d.current_location as GeoPoint | null,
    rating: d.rating || 0,
    total_deliveries: d.total_deliveries || 0,
    vehicle_id: d.vehicle_id,
  }));

  // 4. Fetch available vehicles at this warehouse
  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select(
      `id, registration_number, vehicle_type, capacity_kg, capacity_cbm,
       warehouse_id, current_location, fuel_type`
    )
    .eq("status", "available")
    .eq("warehouse_id", warehouseId);

  const vehicles: AvailableVehicle[] = (vehicleRows || []).map((v) => ({
    id: v.id,
    registration_number: v.registration_number,
    vehicle_type: v.vehicle_type,
    capacity_kg: v.capacity_kg || 1000,
    capacity_cbm: v.capacity_cbm || 10,
    warehouse_id: v.warehouse_id,
    current_location: v.current_location as GeoPoint | null,
    fuel_type: v.fuel_type,
  }));

  // 5. Resolve warehouse location (from its zone or city)
  const { resolveLocation } = await import(
    "@/lib/logistics/route-optimizer/geo"
  );
  const warehouseLocation: GeoPoint = resolveLocation(
    null,
    warehouse.city,
    warehouse.country_code
  ) || { lat: 0, lng: 0 };

  // 6. Run optimization
  const pendingShipments: PendingShipment[] = shipments.map((s) => ({
    id: s.id,
    shipment_number: s.shipment_number,
    pickup_city: s.pickup_city || warehouse.city || "",
    pickup_country: s.pickup_country || warehouse.country_code,
    pickup_address: s.pickup_address,
    delivery_city: s.delivery_city || "",
    delivery_country: s.delivery_country || "",
    delivery_address: s.delivery_address,
    delivery_gps: s.delivery_gps as GeoPoint | null,
    total_weight_kg: s.total_weight_kg || 0,
    total_volume_cbm: s.total_volume_cbm || 0,
    package_count: s.package_count || 1,
    is_fragile: s.is_fragile || false,
    requires_cold_chain: s.requires_cold_chain || false,
    is_hazardous: s.is_hazardous || false,
    destination_zone_id: s.destination_zone_id,
    origin_warehouse_id: s.origin_warehouse_id,
  }));

  const result = optimizeRoutes({
    warehouseId,
    warehouseName: warehouse.name,
    warehouseLocation,
    date,
    strategy,
    shipments: pendingShipments,
    drivers,
    vehicles,
  });

  // 7. Persist optimization run + routes
  const { data: run, error: runErr } = await supabase
    .from("route_optimization_runs")
    .insert({
      warehouse_id: warehouseId,
      date,
      status: "completed",
      shipment_count: shipments.length,
      strategy,
      routes_created: result.routes.length,
      total_distance_km: result.total_distance_km,
      total_duration_min: result.total_duration_min,
      estimated_fuel_cost: result.estimated_fuel_cost,
      fuel_currency: "USD",
      avg_vehicle_utilization_pct: result.avg_vehicle_utilization_pct,
      optimization_notes: result.optimization_notes,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr) {
    // Return result without persistence
    return NextResponse.json({
      ...result,
      persisted: false,
      error: "Failed to persist optimization run",
    });
  }

  // Insert optimized routes
  for (const route of result.routes) {
    const { data: savedRoute } = await supabase
      .from("optimized_routes")
      .insert({
        run_id: run.id,
        route_name: route.route_name,
        assigned_driver_id: route.assigned_driver_id,
        assigned_vehicle_id: route.assigned_vehicle_id,
        driver_name: route.driver_name,
        vehicle_reg: route.vehicle_reg,
        vehicle_type: route.vehicle_type,
        stops: route.stops,
        total_distance_km: route.total_distance_km,
        total_duration_min: route.total_duration_min,
        total_weight_kg: route.total_weight_kg,
        total_volume_cbm: route.total_volume_cbm,
        vehicle_weight_utilization_pct: route.vehicle_weight_utilization_pct,
        vehicle_volume_utilization_pct: route.vehicle_volume_utilization_pct,
        estimated_fuel_liters: route.estimated_fuel_liters,
        estimated_fuel_cost: route.estimated_fuel_cost,
        shipment_count: route.shipment_count,
        status: "proposed",
      })
      .select("id")
      .single();

    // Link shipments to route
    if (savedRoute) {
      const linkRows = route.shipment_ids.map((sid, idx) => ({
        optimized_route_id: savedRoute.id,
        shipment_id: sid,
        stop_order: idx + 1,
      }));
      await supabase.from("optimized_route_shipments").insert(linkRows);
    }
  }

  return NextResponse.json({
    run_id: run.id,
    ...result,
    persisted: true,
  });
}

/**
 * GET /api/admin/logistics/optimize — Fetch past optimization runs
 * Query: warehouseId, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const warehouseId = searchParams.get("warehouseId");
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("route_optimization_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  }

  const { data: runs, error, count } = await query;

  if (error) {
    console.error("[admin/logistics/optimize]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Fetch routes for the most recent run
  let latestRoutes = null;
  if (runs && runs.length > 0) {
    const { data: routes } = await supabase
      .from("optimized_routes")
      .select("*")
      .eq("run_id", runs[0].id)
      .order("route_name");

    latestRoutes = routes;
  }

  return NextResponse.json({
    runs: runs || [],
    total: count || 0,
    latest_routes: latestRoutes,
    limit,
    offset,
  });
}
