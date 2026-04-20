-- ============================================================
-- 00005_orders.sql — Purchase orders, supplier orders, items, history
-- ============================================================

-- Purchase orders (buyer-level, partitioned by created_at)
CREATE TABLE purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  buyer_user_id UUID NOT NULL,
  buyer_company_id UUID,

  -- Money (BIGINT, minor units)
  subtotal BIGINT NOT NULL,
  total_shipping BIGINT DEFAULT 0,
  total_tax BIGINT DEFAULT 0,
  total_discount BIGINT DEFAULT 0,
  grand_total BIGINT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',

  -- Status & approval
  status b2b_order_status DEFAULT 'draft',
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  -- Invoice defaults
  default_invoice_type b2b_invoice_type DEFAULT 'b2b_standard',
  buyer_tax_id TEXT,
  buyer_company_name TEXT,
  market_region market_region,

  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id, created_at),
  UNIQUE (order_number, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions: 2026 Q2, Q3, Q4
CREATE TABLE purchase_orders_2026q2 PARTITION OF purchase_orders
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE purchase_orders_2026q3 PARTITION OF purchase_orders
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE purchase_orders_2026q4 PARTITION OF purchase_orders
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX idx_po_buyer_user ON purchase_orders(buyer_user_id);
CREATE INDEX idx_po_buyer_company ON purchase_orders(buyer_company_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_created ON purchase_orders(created_at DESC);
CREATE INDEX idx_po_company_status_created ON purchase_orders(buyer_company_id, status, created_at DESC);


-- ============================================================
-- Supplier orders (per-supplier split, partitioned by created_at)
-- ============================================================
CREATE TABLE supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  order_number TEXT NOT NULL,

  -- Money (BIGINT, minor units)
  subtotal BIGINT NOT NULL,
  shipping_fee BIGINT DEFAULT 0,
  tax_amount BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',

  -- Shipping
  shipping_method shipping_method,
  trade_term trade_term DEFAULT 'fob',
  recipient_name TEXT,
  recipient_phone TEXT,
  ship_to_address TEXT,
  ship_to_city TEXT,
  ship_to_country CHAR(2),
  ship_to_landmark TEXT,
  ship_to_gps JSONB,

  -- Status
  status b2b_order_status DEFAULT 'pending_payment',
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  estimated_ship_date DATE,

  -- Commission
  commission_rate NUMERIC(5,4),
  commission_amount BIGINT DEFAULT 0,

  -- Payment
  payment_gateway payment_gateway,
  gateway_transaction_id TEXT,

  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id, created_at),
  UNIQUE (order_number, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions: 2026 Q2, Q3, Q4
CREATE TABLE supplier_orders_2026q2 PARTITION OF supplier_orders
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE supplier_orders_2026q3 PARTITION OF supplier_orders
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE supplier_orders_2026q4 PARTITION OF supplier_orders
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX idx_so_purchase_order ON supplier_orders(purchase_order_id);
CREATE INDEX idx_so_supplier ON supplier_orders(supplier_id);
CREATE INDEX idx_so_status ON supplier_orders(status);
CREATE INDEX idx_so_created ON supplier_orders(created_at DESC);
CREATE INDEX idx_so_supplier_status_created ON supplier_orders(supplier_id, status, created_at DESC);


-- ============================================================
-- Supplier order line items
-- ============================================================
CREATE TABLE supplier_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  unit_price BIGINT NOT NULL,
  quantity INT NOT NULL,
  subtotal BIGINT NOT NULL,
  tax_amount BIGINT DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',
  trade_term trade_term,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_soi_supplier_order ON supplier_order_items(supplier_order_id);


-- ============================================================
-- Order status history (audit trail)
-- ============================================================
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL,
  from_status b2b_order_status,
  to_status b2b_order_status NOT NULL,
  changed_by UUID REFERENCES user_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_osh_order_created ON order_status_history(supplier_order_id, created_at DESC);
