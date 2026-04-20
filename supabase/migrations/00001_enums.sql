-- ============================================================
-- 00001_enums.sql — All custom types for BUY B2B Platform
-- ============================================================

-- Platform roles (multi-tenant: buyer org, supplier, logistics, admin)
CREATE TYPE platform_role AS ENUM (
  'buyer', 'buyer_staff', 'buyer_finance', 'buyer_viewer',
  'supplier_owner', 'supplier_sales', 'supplier_catalog', 'supplier_warehouse',
  'logistics_admin', 'logistics_dispatcher', 'logistics_driver',
  'admin_super', 'admin_moderator', 'admin_support'
);

-- B2B order lifecycle
CREATE TYPE b2b_order_status AS ENUM (
  'draft', 'pending_approval', 'pending_payment', 'deposit_paid', 'paid',
  'confirmed', 'in_production', 'quality_check', 'ready_to_ship',
  'assigned_to_logistics', 'dispatched', 'in_transit', 'out_for_delivery',
  'delivered', 'completed',
  'cancelled', 'disputed', 'refund_requested', 'refunded'
);

-- Shipping methods (own logistics primary)
CREATE TYPE shipping_method AS ENUM (
  'platform_standard', 'platform_express', 'platform_freight',
  'platform_cold_chain', 'supplier_self', 'buyer_pickup', 'third_party'
);

-- Shipment status (own logistics detail)
CREATE TYPE shipment_status AS ENUM (
  'pending', 'assigned', 'driver_accepted', 'picking', 'packed',
  'dispatched', 'in_transit', 'at_hub', 'out_for_delivery',
  'delivery_attempted', 'delivered', 'returned', 'lost', 'damaged'
);

-- Payment gateways (Africa-first)
CREATE TYPE payment_gateway AS ENUM (
  'mtn_momo', 'airtel_money', 'tigo_cash', 'mpesa',
  'stripe', 'alipay', 'wechat_pay',
  'bank_transfer', 'escrow', 'platform_wallet'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'refunded', 'expired', 'cancelled'
);

-- Payment terms
CREATE TYPE payment_terms AS ENUM (
  'immediate', 'net_30', 'net_60', 'deposit_balance'
);

-- Market regions
CREATE TYPE market_region AS ENUM (
  'africa_west', 'africa_east', 'africa_south', 'africa_central', 'africa_north',
  'cn', 'global'
);

-- Trade terms (Incoterms)
CREATE TYPE trade_term AS ENUM (
  'fob', 'cif', 'exw', 'ddp', 'dap', 'cpt', 'fca'
);

-- Invoice types (multi-region)
CREATE TYPE b2b_invoice_type AS ENUM (
  'b2b_standard', 'proforma', 'commission', 'credit_note',
  'fapiao_normal', 'fapiao_special'
);

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'pending', 'issued', 'sent', 'voided', 'void_pending', 'failed'
);

-- Settlement status
CREATE TYPE settlement_status AS ENUM (
  'pending', 'calculating', 'ready', 'processing', 'paid', 'failed', 'disputed'
);

-- Verification status
CREATE TYPE verification_status AS ENUM (
  'unverified', 'pending', 'verified', 'rejected', 'expired'
);

-- Moderation status
CREATE TYPE moderation_status AS ENUM (
  'pending', 'approved', 'rejected', 'suspended'
);

-- Vehicle types (own logistics)
CREATE TYPE vehicle_type AS ENUM (
  'motorcycle', 'van', 'truck_small', 'truck_large', 'container', 'refrigerated'
);

-- Driver status
CREATE TYPE driver_status AS ENUM (
  'available', 'on_delivery', 'off_duty', 'suspended'
);

-- Warehouse type
CREATE TYPE warehouse_type AS ENUM (
  'fulfillment', 'hub', 'cross_dock', 'cold_storage'
);

-- Escrow status
CREATE TYPE escrow_status AS ENUM (
  'held', 'partial_release', 'released', 'disputed', 'refunded'
);

-- Tax type
CREATE TYPE tax_type AS ENUM (
  'taxable', 'zero_rated', 'exempt', 'mixed'
);

-- Tax system
CREATE TYPE tax_system AS ENUM (
  'africa_vat', 'cn_vat', 'stripe_tax', 'manual'
);

-- Address format
CREATE TYPE address_format AS ENUM (
  'africa_landmark', 'cn_province', 'international'
);

-- Supplier tier
CREATE TYPE supplier_tier AS ENUM (
  'free', 'standard', 'gold', 'verified'
);
