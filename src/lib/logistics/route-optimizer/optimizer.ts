import type {
  OptimizationRequest,
  OptimizationResult,
  OptimizedRoute,
  PendingShipment,
  AvailableVehicle,
  AvailableDriver,
  RouteStop,
  GeoPoint,
  OptimizationStrategy,
} from "./types";
import {
  FUEL_RATES,
  FUEL_COST_PER_LITER,
  AVG_SERVICE_TIME_MIN,
  AVG_SPEED,
} from "./types";
import { estimateRoadDistance, resolveLocation } from "./geo";

// ----------------------------------------------------------------
// Main optimizer entry point
// ----------------------------------------------------------------

export function optimizeRoutes(req: OptimizationRequest): OptimizationResult {
  const { shipments, vehicles, drivers, warehouseLocation, strategy } = req;

  // 1. Resolve GPS for all shipments
  const located = shipments.map((s) => ({
    shipment: s,
    location: resolveLocation(
      s.delivery_gps,
      s.delivery_city,
      s.delivery_country
    ),
  }));

  const routable = located.filter((l) => l.location !== null) as {
    shipment: PendingShipment;
    location: GeoPoint;
  }[];

  const unlocatable = located
    .filter((l) => l.location === null)
    .map((l) => l.shipment);

  if (routable.length === 0) {
    return {
      routes: [],
      unassigned_shipments: shipments,
      total_distance_km: 0,
      total_duration_min: 0,
      estimated_fuel_cost: 0,
      avg_vehicle_utilization_pct: 0,
      optimization_notes:
        "No shipments could be geo-located. Add GPS coordinates or recognized city names.",
    };
  }

  // 2. Cluster shipments by geographic proximity
  const clusters = clusterShipments(
    routable,
    warehouseLocation,
    vehicles,
    strategy
  );

  // 3. For each cluster, solve TSP and assign vehicle + driver
  const sortedVehicles = rankVehicles(vehicles, strategy);
  const availableDrivers = [...drivers];
  const routes: OptimizedRoute[] = [];
  const unassigned: PendingShipment[] = [...unlocatable];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    // Find a vehicle that can handle this cluster's load
    const totalWeight = cluster.reduce(
      (sum, s) => sum + (s.shipment.total_weight_kg || 0),
      0
    );
    const totalVolume = cluster.reduce(
      (sum, s) => sum + (s.shipment.total_volume_cbm || 0),
      0
    );

    // Check for special requirements
    const needsColdChain = cluster.some(
      (s) => s.shipment.requires_cold_chain
    );
    const needsHazardous = cluster.some((s) => s.shipment.is_hazardous);

    const vehicleIdx = sortedVehicles.findIndex((v) => {
      const fits =
        v.capacity_kg >= totalWeight && v.capacity_cbm >= totalVolume;
      if (needsColdChain && v.vehicle_type !== "refrigerated") return false;
      return fits;
    });

    const vehicle = vehicleIdx >= 0 ? sortedVehicles.splice(vehicleIdx, 1)[0] : null;
    const driver = availableDrivers.shift() || null;

    // Solve TSP for this cluster
    const orderedStops = solveTSP(cluster, warehouseLocation);

    // Build route stops with time estimates
    const stops = buildStops(orderedStops, warehouseLocation, req.date);
    const distanceKm = calculateRouteDistance(orderedStops, warehouseLocation);
    const durationMin = estimateRouteDuration(distanceKm, stops.length);
    const fuelRate = vehicle
      ? FUEL_RATES[vehicle.vehicle_type] || 0.15
      : 0.15;
    const fuelLiters = distanceKm * fuelRate;
    const fuelCost = Math.round(fuelLiters * FUEL_COST_PER_LITER * 100); // minor units

    const weightUtil = vehicle
      ? Math.min(100, (totalWeight / vehicle.capacity_kg) * 100)
      : 0;
    const volumeUtil = vehicle
      ? Math.min(100, (totalVolume / vehicle.capacity_cbm) * 100)
      : 0;

    routes.push({
      route_name: `Route ${String.fromCharCode(65 + i)} — ${cluster[0].shipment.delivery_city || "Zone " + (i + 1)}`,
      assigned_driver_id: driver?.id || null,
      assigned_vehicle_id: vehicle?.id || null,
      driver_name: driver?.full_name || null,
      vehicle_reg: vehicle?.registration_number || null,
      vehicle_type: vehicle?.vehicle_type || null,
      stops,
      total_distance_km: Math.round(distanceKm * 100) / 100,
      total_duration_min: durationMin,
      total_weight_kg: Math.round(totalWeight * 100) / 100,
      total_volume_cbm: Math.round(totalVolume * 10000) / 10000,
      vehicle_weight_utilization_pct: Math.round(weightUtil * 100) / 100,
      vehicle_volume_utilization_pct: Math.round(volumeUtil * 100) / 100,
      estimated_fuel_liters: Math.round(fuelLiters * 100) / 100,
      estimated_fuel_cost: fuelCost,
      shipment_count: cluster.length,
      shipment_ids: cluster.map((s) => s.shipment.id),
    });
  }

  // Summary
  const totalDist = routes.reduce((s, r) => s + r.total_distance_km, 0);
  const totalDur = routes.reduce((s, r) => s + r.total_duration_min, 0);
  const totalFuel = routes.reduce((s, r) => s + r.estimated_fuel_cost, 0);
  const avgUtil =
    routes.length > 0
      ? routes.reduce((s, r) => s + r.vehicle_weight_utilization_pct, 0) /
        routes.length
      : 0;

  const notes = buildOptimizationNotes(
    req,
    routes,
    unassigned,
    strategy
  );

  return {
    routes,
    unassigned_shipments: unassigned,
    total_distance_km: Math.round(totalDist * 100) / 100,
    total_duration_min: totalDur,
    estimated_fuel_cost: totalFuel,
    avg_vehicle_utilization_pct: Math.round(avgUtil * 100) / 100,
    optimization_notes: notes,
  };
}

// ----------------------------------------------------------------
// Clustering: group nearby shipments into vehicle-sized batches
// ----------------------------------------------------------------

interface LocatedShipment {
  shipment: PendingShipment;
  location: GeoPoint;
}

function clusterShipments(
  shipments: LocatedShipment[],
  depot: GeoPoint,
  vehicles: AvailableVehicle[],
  strategy: OptimizationStrategy
): LocatedShipment[][] {
  if (shipments.length === 0) return [];

  // Max capacity from the largest vehicle
  const maxKg = Math.max(...vehicles.map((v) => v.capacity_kg), 500);
  const maxCbm = Math.max(...vehicles.map((v) => v.capacity_cbm), 5);

  // Max stops per route — keeps routes manageable
  const maxStops = strategy === "maximize_capacity" ? 20 : 12;

  // Greedy sweep clustering
  const remaining = [...shipments];
  const clusters: LocatedShipment[][] = [];

  // Sort by angle from depot (sweep algorithm)
  remaining.sort((a, b) => {
    const angleA = Math.atan2(
      a.location.lat - depot.lat,
      a.location.lng - depot.lng
    );
    const angleB = Math.atan2(
      b.location.lat - depot.lat,
      b.location.lng - depot.lng
    );
    return angleA - angleB;
  });

  let i = 0;
  while (i < remaining.length) {
    const cluster: LocatedShipment[] = [];
    let clusterWeight = 0;
    let clusterVolume = 0;

    while (i < remaining.length && cluster.length < maxStops) {
      const s = remaining[i];
      const w = s.shipment.total_weight_kg || 0;
      const v = s.shipment.total_volume_cbm || 0;

      if (clusterWeight + w > maxKg || clusterVolume + v > maxCbm) {
        // Vehicle full — start new cluster
        break;
      }

      cluster.push(s);
      clusterWeight += w;
      clusterVolume += v;
      i++;
    }

    if (cluster.length > 0) clusters.push(cluster);
  }

  return clusters;
}

// ----------------------------------------------------------------
// TSP solver: nearest-neighbor heuristic + 2-opt improvement
// ----------------------------------------------------------------

function solveTSP(
  cluster: LocatedShipment[],
  depot: GeoPoint
): LocatedShipment[] {
  if (cluster.length <= 1) return cluster;

  // Nearest-neighbor initial solution
  const ordered: LocatedShipment[] = [];
  const remaining = [...cluster];
  let current: GeoPoint = depot;

  while (remaining.length > 0) {
    let nearest = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = estimateRoadDistance(current, remaining[i].location);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }

    const next = remaining.splice(nearest, 1)[0];
    ordered.push(next);
    current = next.location;
  }

  // 2-opt improvement
  return twoOpt(ordered, depot);
}

function twoOpt(
  route: LocatedShipment[],
  depot: GeoPoint
): LocatedShipment[] {
  const n = route.length;
  if (n < 4) return route;

  let improved = true;
  let result = [...route];
  let iterations = 0;
  const maxIterations = n * n; // prevent runaway on large inputs

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        const prevI = i === 0 ? depot : result[i - 1].location;
        const currI = result[i].location;
        const currJ = result[j].location;
        const nextJ = j === n - 1 ? depot : result[j + 1].location;

        const currentCost =
          estimateRoadDistance(prevI, currI) +
          estimateRoadDistance(currJ, nextJ);
        const newCost =
          estimateRoadDistance(prevI, currJ) +
          estimateRoadDistance(currI, nextJ);

        if (newCost < currentCost - 0.01) {
          // Reverse the segment between i and j
          const reversed = result.slice(i, j + 1).reverse();
          result = [
            ...result.slice(0, i),
            ...reversed,
            ...result.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }

  return result;
}

// ----------------------------------------------------------------
// Route metrics
// ----------------------------------------------------------------

function calculateRouteDistance(
  stops: LocatedShipment[],
  depot: GeoPoint
): number {
  if (stops.length === 0) return 0;

  let total = estimateRoadDistance(depot, stops[0].location); // depot → first stop
  for (let i = 1; i < stops.length; i++) {
    total += estimateRoadDistance(stops[i - 1].location, stops[i].location);
  }
  total += estimateRoadDistance(stops[stops.length - 1].location, depot); // last stop → depot
  return total;
}

function estimateRouteDuration(distanceKm: number, stopCount: number): number {
  // Assume mixed city/inter-city driving
  const drivingMin = (distanceKm / AVG_SPEED.city) * 60 * 0.4 +
    (distanceKm / AVG_SPEED.inter_city) * 60 * 0.6;
  const serviceMin = stopCount * AVG_SERVICE_TIME_MIN;
  return Math.round(drivingMin + serviceMin);
}

function buildStops(
  ordered: LocatedShipment[],
  depot: GeoPoint,
  date: string
): RouteStop[] {
  const startHour = 7; // Routes start at 7:00 AM
  let cumulativeMin = 0;

  return ordered.map((s, idx) => {
    const prev = idx === 0 ? depot : ordered[idx - 1].location;
    const dist = estimateRoadDistance(prev, s.location);
    const driveMin = (dist / 35) * 60; // blended avg speed
    cumulativeMin += driveMin;

    const arrivalDate = new Date(`${date}T00:00:00`);
    arrivalDate.setHours(startHour);
    arrivalDate.setMinutes(Math.round(cumulativeMin));

    cumulativeMin += AVG_SERVICE_TIME_MIN;

    return {
      order: idx + 1,
      shipment_id: s.shipment.id,
      shipment_number: s.shipment.shipment_number,
      address:
        s.shipment.delivery_address ||
        `${s.shipment.delivery_city}, ${s.shipment.delivery_country}`,
      city: s.shipment.delivery_city,
      country: s.shipment.delivery_country,
      lat: s.location.lat,
      lng: s.location.lng,
      type: "delivery" as const,
      estimated_arrival: arrivalDate.toISOString(),
      service_time_min: AVG_SERVICE_TIME_MIN,
    };
  });
}

// ----------------------------------------------------------------
// Vehicle ranking by strategy
// ----------------------------------------------------------------

function rankVehicles(
  vehicles: AvailableVehicle[],
  strategy: OptimizationStrategy
): AvailableVehicle[] {
  const sorted = [...vehicles];

  switch (strategy) {
    case "minimize_fuel":
      // Prefer smaller, more fuel-efficient vehicles
      sorted.sort(
        (a, b) =>
          (FUEL_RATES[a.vehicle_type] || 0.15) -
          (FUEL_RATES[b.vehicle_type] || 0.15)
      );
      break;
    case "maximize_capacity":
      // Prefer largest vehicles
      sorted.sort((a, b) => b.capacity_kg - a.capacity_kg);
      break;
    case "minimize_distance":
    case "minimize_time":
    case "balanced":
    default:
      // Balanced: prefer medium vehicles
      sorted.sort((a, b) => {
        const scoreA = a.capacity_kg * 0.5 - (FUEL_RATES[a.vehicle_type] || 0.15) * 100;
        const scoreB = b.capacity_kg * 0.5 - (FUEL_RATES[b.vehicle_type] || 0.15) * 100;
        return scoreB - scoreA;
      });
  }

  return sorted;
}

// ----------------------------------------------------------------
// Human-readable optimization notes
// ----------------------------------------------------------------

function buildOptimizationNotes(
  req: OptimizationRequest,
  routes: OptimizedRoute[],
  unassigned: PendingShipment[],
  strategy: OptimizationStrategy
): string {
  const lines: string[] = [];

  lines.push(
    `Optimized ${req.shipments.length} shipments from ${req.warehouseName} into ${routes.length} route(s).`
  );
  lines.push(`Strategy: ${strategy.replace(/_/g, " ")}.`);

  if (unassigned.length > 0) {
    lines.push(
      `${unassigned.length} shipment(s) could not be assigned — missing GPS data or insufficient vehicle capacity.`
    );
  }

  const coldChain = req.shipments.filter((s) => s.requires_cold_chain);
  if (coldChain.length > 0) {
    lines.push(
      `${coldChain.length} cold-chain shipment(s) routed to refrigerated vehicles.`
    );
  }

  const driversUsed = routes.filter((r) => r.assigned_driver_id).length;
  const driversAvail = req.drivers.length;
  lines.push(
    `Assigned ${driversUsed} of ${driversAvail} available driver(s).`
  );

  return lines.join(" ");
}
