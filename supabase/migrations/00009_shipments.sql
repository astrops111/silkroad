-- ============================================================
-- 00009_shipments.sql — Shipments, items, tracking, rates
-- ============================================================

-- B2B shipments (partitioned by created_at)
CREATE TABLE b2b_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL,
  shipment_number TEXT NOT NULL,
  shipping_method shipping_method NOT NULL,

  -- Origin & destination
  origin_warehouse_id UUID,
  destination_zone_id UUID,
  assigned_driver_id UUID,
  assigned_vehicle_id UUID,
  route_id UUID,

  -- Pickup
  pickup_address TEXT,
  pickup_city TEXT,
  pickup_country CHAR(2),

  -- Delivery
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_country CHAR(2),
  delivery_contact_name TEXT,
  delivery_contact_phone TEXT,
  delivery_landmark TEXT,
  delivery_gps JSONB,

  -- Package details
  package_count INT DEFAULT 1,
  total_weight_kg NUMERIC(10,2),
  total_volume_cbm NUMERIC(10,4),
  is_fragile BOOLEAN DEFAULT false,
  requires_cold_chain BOOLEAN DEFAULT false,
  is_hazardous BOOLEAN DEFAULT false,
  package_description TEXT,

  -- Cost (BIGINT, minor units)
  shipping_cost BIGINT DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',
  cost_breakdown JSONB,
  insurance_amount BIGINT DEFAULT 0,

  -- Trade
  trade_term trade_term,
  incoterm_detail TEXT,

  -- Tracking
  tracking_number TEXT,
  tracking_url TEXT,
  current_location JSONB,
  estimated_delivery_at TIMESTAMPTZ,

  -- Timestamps
  pickup_scheduled_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Status
  status shipment_status DEFAULT 'pending',

  -- Proof of delivery
  pod_signature_url TEXT,
  pod_photo_url TEXT,
  pod_recipient_name TEXT,
  pod_notes TEXT,

  -- Customs
  customs_declaration_no TEXT,
  customs_status TEXT,
  hs_codes TEXT[],

  -- Raw event log
  raw_events JSONB[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id, created_at),
  UNIQUE (shipment_number, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions: 2026 Q2, Q3, Q4
CREATE TABLE b2b_shipments_2026q2 PARTITION OF b2b_shipments
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE b2b_shipments_2026q3 PARTITION OF b2b_shipments
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE b2b_shipments_2026q4 PARTITION OF b2b_shipments
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX idx_shipments_supplier_order ON b2b_shipments(supplier_order_id);
CREATE INDEX idx_shipments_status ON b2b_shipments(status);
CREATE INDEX idx_shipments_tracking ON b2b_shipments(tracking_number);
CREATE INDEX idx_shipments_method ON b2b_shipments(shipping_method);
CREATE INDEX idx_shipments_driver ON b2b_shipments(assigned_driver_id);
CREATE INDEX idx_shipments_created ON b2b_shipments(created_at DESC);


-- ============================================================
-- Shipment line items
-- ============================================================
CREATE TABLE shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL,
  supplier_order_item_id UUID NOT NULL,
  quantity_shipped INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX idx_shipment_items_order_item ON shipment_items(supplier_order_item_id);


-- ============================================================
-- Shipment tracking events
-- ============================================================
CREATE TABLE shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  location JSONB,
  description TEXT,
  driver_id UUID,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tracking_events_shipment ON shipment_tracking_events(shipment_id, created_at DESC);


-- ============================================================
-- Shipping rates (zone-to-zone pricing)
-- ============================================================
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES logistics_zones(id),
  destination_zone_id UUID REFERENCES logistics_zones(id),
  shipping_method shipping_method NOT NULL,
  min_weight_kg NUMERIC(10,2) DEFAULT 0,
  max_weight_kg NUMERIC(10,2),
  base_rate BIGINT NOT NULL,
  per_kg_rate BIGINT DEFAULT 0,
  per_cbm_rate BIGINT DEFAULT 0,
  min_charge BIGINT DEFAULT 0,
  free_shipping_threshold BIGINT,
  currency CHAR(3) DEFAULT 'USD',
  estimated_days_min INT,
  estimated_days_max INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shipping_rates_zone ON shipping_rates(zone_id);
CREATE INDEX idx_shipping_rates_dest_zone ON shipping_rates(destination_zone_id);
CREATE INDEX idx_shipping_rates_method ON shipping_rates(shipping_method);
