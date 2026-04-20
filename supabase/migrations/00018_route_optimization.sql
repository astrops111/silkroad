-- ============================================================
-- 00018_route_optimization.sql — AI route optimization runs & results
-- ============================================================

-- Optimization run — one per batch optimization request
CREATE TABLE route_optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),

  -- Input params
  shipment_count INT NOT NULL DEFAULT 0,
  strategy TEXT NOT NULL DEFAULT 'balanced'
    CHECK (strategy IN ('balanced','minimize_distance','minimize_time','minimize_fuel','maximize_capacity')),

  -- Results summary
  routes_created INT DEFAULT 0,
  total_distance_km NUMERIC(10,2) DEFAULT 0,
  total_duration_min INT DEFAULT 0,
  estimated_fuel_cost BIGINT DEFAULT 0,
  fuel_currency CHAR(3) DEFAULT 'USD',
  avg_vehicle_utilization_pct NUMERIC(5,2) DEFAULT 0,

  -- AI reasoning
  optimization_notes TEXT,

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opt_runs_warehouse ON route_optimization_runs(warehouse_id);
CREATE INDEX idx_opt_runs_date ON route_optimization_runs(date);
CREATE INDEX idx_opt_runs_status ON route_optimization_runs(status);


-- Optimized routes — each route is one vehicle + driver path
CREATE TABLE optimized_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES route_optimization_runs(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,

  -- Assignments
  assigned_driver_id UUID REFERENCES drivers(id),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  driver_name TEXT,
  vehicle_reg TEXT,
  vehicle_type vehicle_type,

  -- Route geometry
  stops JSONB NOT NULL DEFAULT '[]',
  -- Each stop: { order, shipment_id, address, city, lat, lng, type: 'pickup'|'delivery', estimated_arrival, service_time_min }

  -- Metrics
  total_distance_km NUMERIC(10,2) DEFAULT 0,
  total_duration_min INT DEFAULT 0,
  total_weight_kg NUMERIC(10,2) DEFAULT 0,
  total_volume_cbm NUMERIC(10,4) DEFAULT 0,
  vehicle_weight_utilization_pct NUMERIC(5,2) DEFAULT 0,
  vehicle_volume_utilization_pct NUMERIC(5,2) DEFAULT 0,
  estimated_fuel_liters NUMERIC(10,2) DEFAULT 0,
  estimated_fuel_cost BIGINT DEFAULT 0,
  shipment_count INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'proposed'
    CHECK (status IN ('proposed','accepted','applied','rejected')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opt_routes_run ON optimized_routes(run_id);
CREATE INDEX idx_opt_routes_driver ON optimized_routes(assigned_driver_id);
CREATE INDEX idx_opt_routes_status ON optimized_routes(status);


-- Link optimized routes to shipments
CREATE TABLE optimized_route_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimized_route_id UUID NOT NULL REFERENCES optimized_routes(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL,
  stop_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opt_route_shipments_route ON optimized_route_shipments(optimized_route_id);
CREATE INDEX idx_opt_route_shipments_shipment ON optimized_route_shipments(shipment_id);
