-- ============================================================
-- 00008_logistics_fleet.sql — Zones, warehouses, vehicles, drivers, routes
-- ============================================================

-- Logistics zones (delivery regions)
CREATE TABLE logistics_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  region TEXT,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('city','inter_city','rural','cross_border')),
  boundaries JSONB,
  is_active BOOLEAN DEFAULT true,
  base_delivery_fee BIGINT DEFAULT 0,
  per_km_fee BIGINT DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logistics_zones_country ON logistics_zones(country_code);
CREATE INDEX idx_logistics_zones_type ON logistics_zones(zone_type);


-- Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  zone_id UUID REFERENCES logistics_zones(id),
  address TEXT,
  city TEXT,
  country_code CHAR(2) NOT NULL,
  type warehouse_type DEFAULT 'fulfillment',
  capacity_sqm NUMERIC(10,2),
  current_utilization_pct NUMERIC(5,2) DEFAULT 0,
  operating_hours JSONB,
  manager_user_id UUID REFERENCES user_profiles(id),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_warehouses_zone ON warehouses(zone_id);
CREATE INDEX idx_warehouses_country ON warehouses(country_code);
CREATE INDEX idx_warehouses_code ON warehouses(code);


-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id),
  registration_number TEXT UNIQUE NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  make TEXT,
  model TEXT,
  year INT,
  capacity_kg NUMERIC(10,2),
  capacity_cbm NUMERIC(10,4),
  status TEXT DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired')),
  current_location JSONB,
  fuel_type TEXT,
  last_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vehicles_warehouse ON vehicles(warehouse_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_status ON vehicles(status);


-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id),
  warehouse_id UUID REFERENCES warehouses(id),
  license_number TEXT,
  license_type TEXT,
  license_expiry DATE,
  phone TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  status driver_status DEFAULT 'available',
  current_location JSONB,
  rating NUMERIC(3,2) DEFAULT 0,
  total_deliveries INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_drivers_warehouse ON drivers(warehouse_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_user ON drivers(user_id);


-- Delivery routes
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  zone_id UUID REFERENCES logistics_zones(id),
  warehouse_id UUID REFERENCES warehouses(id),
  route_type TEXT DEFAULT 'standard' CHECK (route_type IN ('standard','express','scheduled')),
  stops JSONB DEFAULT '[]',
  estimated_duration_min INT,
  distance_km NUMERIC(10,2),
  assigned_driver_id UUID REFERENCES drivers(id),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_routes_zone ON delivery_routes(zone_id);
CREATE INDEX idx_routes_warehouse ON delivery_routes(warehouse_id);
CREATE INDEX idx_routes_date ON delivery_routes(date);
CREATE INDEX idx_routes_status ON delivery_routes(status);
