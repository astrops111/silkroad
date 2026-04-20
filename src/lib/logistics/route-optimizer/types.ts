// ============================================================
// Route optimizer types
// ============================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PendingShipment {
  id: string;
  shipment_number: string;
  pickup_city: string;
  pickup_country: string;
  pickup_address: string | null;
  delivery_city: string;
  delivery_country: string;
  delivery_address: string | null;
  delivery_gps: GeoPoint | null;
  total_weight_kg: number;
  total_volume_cbm: number;
  package_count: number;
  is_fragile: boolean;
  requires_cold_chain: boolean;
  is_hazardous: boolean;
  destination_zone_id: string | null;
  origin_warehouse_id: string | null;
}

export interface AvailableDriver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  warehouse_id: string | null;
  current_location: GeoPoint | null;
  rating: number;
  total_deliveries: number;
  vehicle_id: string | null;
}

export interface AvailableVehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  capacity_kg: number;
  capacity_cbm: number;
  warehouse_id: string | null;
  current_location: GeoPoint | null;
  fuel_type: string | null;
}

export type OptimizationStrategy =
  | "balanced"
  | "minimize_distance"
  | "minimize_time"
  | "minimize_fuel"
  | "maximize_capacity";

export interface OptimizationRequest {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: GeoPoint;
  date: string;
  strategy: OptimizationStrategy;
  shipments: PendingShipment[];
  drivers: AvailableDriver[];
  vehicles: AvailableVehicle[];
}

export interface RouteStop {
  order: number;
  shipment_id: string;
  shipment_number: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: "pickup" | "delivery";
  estimated_arrival: string | null;
  service_time_min: number;
}

export interface OptimizedRoute {
  route_name: string;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  driver_name: string | null;
  vehicle_reg: string | null;
  vehicle_type: string | null;
  stops: RouteStop[];
  total_distance_km: number;
  total_duration_min: number;
  total_weight_kg: number;
  total_volume_cbm: number;
  vehicle_weight_utilization_pct: number;
  vehicle_volume_utilization_pct: number;
  estimated_fuel_liters: number;
  estimated_fuel_cost: number;
  shipment_count: number;
  shipment_ids: string[];
}

export interface OptimizationResult {
  routes: OptimizedRoute[];
  unassigned_shipments: PendingShipment[];
  total_distance_km: number;
  total_duration_min: number;
  estimated_fuel_cost: number;
  avg_vehicle_utilization_pct: number;
  optimization_notes: string;
}

// Fuel consumption rates (liters per km) by vehicle type
export const FUEL_RATES: Record<string, number> = {
  motorcycle: 0.03,
  van: 0.10,
  truck_small: 0.18,
  truck_large: 0.28,
  container: 0.35,
  refrigerated: 0.32,
};

// Fuel cost per liter (USD) — regional average for Africa
export const FUEL_COST_PER_LITER = 1.35;

// Average service time at each stop (minutes)
export const AVG_SERVICE_TIME_MIN = 15;

// Average speed by zone type (km/h)
export const AVG_SPEED: Record<string, number> = {
  city: 25,
  inter_city: 60,
  rural: 40,
  cross_border: 45,
};
