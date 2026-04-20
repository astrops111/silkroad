-- ============================================================
-- 00012_rls_policies.sql — Row Level Security for BUY B2B Platform
-- ============================================================

-- ============================================================
-- Helper functions
-- ============================================================

-- Returns the user_profiles.id for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM user_profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Returns array of company_ids the current user belongs to
CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(cm.company_id), '{}')
  FROM company_members cm
  WHERE cm.user_id = get_user_profile_id();
$$;

-- Checks if the current user has any admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = get_user_profile_id()
      AND cm.role IN ('admin_super', 'admin_moderator', 'admin_support')
  );
$$;

-- Checks if user has logistics role
CREATE OR REPLACE FUNCTION is_logistics()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = get_user_profile_id()
      AND cm.role IN ('logistics_admin', 'logistics_dispatcher', 'logistics_driver')
  );
$$;


-- ============================================================
-- Enable RLS on all tables
-- ============================================================

-- 00002 tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- 00003 tables
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

-- 00004 tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- 00005 tables (partitioned parents)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- 00006 tables
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_wallets ENABLE ROW LEVEL SECURITY;

-- 00007 tables (partitioned parent)
ALTER TABLE b2b_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_exemption_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- 00008 tables
ALTER TABLE logistics_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- 00009 tables (partitioned parent)
ALTER TABLE b2b_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

-- 00010 tables
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

-- 00011 tables
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- user_profiles: users can read/update their own profile
-- ============================================================

CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (auth_id = auth.uid() OR is_admin());

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY user_profiles_admin_all ON user_profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- companies: members can read, admins can do anything
-- ============================================================

CREATE POLICY companies_select_member ON companies
  FOR SELECT USING (id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY companies_admin_all ON companies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- company_members: members can read own company's, admins manage
-- ============================================================

CREATE POLICY company_members_select ON company_members
  FOR SELECT USING (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY company_members_admin_all ON company_members
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- supplier_profiles: company members read, admins manage
-- ============================================================

CREATE POLICY supplier_profiles_select ON supplier_profiles
  FOR SELECT USING (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY supplier_profiles_admin_all ON supplier_profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY supplier_profiles_supplier_update ON supplier_profiles
  FOR UPDATE USING (company_id = ANY(get_user_companies()))
  WITH CHECK (company_id = ANY(get_user_companies()));


-- ============================================================
-- categories: public read, admin write
-- ============================================================

CREATE POLICY categories_select_public ON categories
  FOR SELECT USING (true);

CREATE POLICY categories_admin_all ON categories
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- products: public read (approved+active), supplier manage own, admin all
-- ============================================================

CREATE POLICY products_select_public ON products
  FOR SELECT USING (
    (moderation_status = 'approved' AND is_active = true)
    OR supplier_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY products_insert_supplier ON products
  FOR INSERT WITH CHECK (supplier_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY products_update_supplier ON products
  FOR UPDATE USING (supplier_id = ANY(get_user_companies()) OR is_admin())
  WITH CHECK (supplier_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY products_delete_supplier ON products
  FOR DELETE USING (supplier_id = ANY(get_user_companies()) OR is_admin());


-- ============================================================
-- product_variants: follow products (via product -> supplier_id)
-- ============================================================

CREATE POLICY product_variants_select ON product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (
          (p.moderation_status = 'approved' AND p.is_active = true)
          OR p.supplier_id = ANY(get_user_companies())
          OR is_admin()
        )
    )
  );

CREATE POLICY product_variants_insert ON product_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_variants_update ON product_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_variants_delete ON product_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );


-- ============================================================
-- product_pricing_tiers: follow products
-- ============================================================

CREATE POLICY product_pricing_tiers_select ON product_pricing_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (
          (p.moderation_status = 'approved' AND p.is_active = true)
          OR p.supplier_id = ANY(get_user_companies())
          OR is_admin()
        )
    )
  );

CREATE POLICY product_pricing_tiers_insert ON product_pricing_tiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_pricing_tiers_update ON product_pricing_tiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_pricing_tiers_delete ON product_pricing_tiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );


-- ============================================================
-- product_certifications: follow products
-- ============================================================

CREATE POLICY product_certifications_select ON product_certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (
          (p.moderation_status = 'approved' AND p.is_active = true)
          OR p.supplier_id = ANY(get_user_companies())
          OR is_admin()
        )
    )
  );

CREATE POLICY product_certifications_insert ON product_certifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_certifications_update ON product_certifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_certifications_delete ON product_certifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );


-- ============================================================
-- product_images: follow products
-- ============================================================

CREATE POLICY product_images_select ON product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (
          (p.moderation_status = 'approved' AND p.is_active = true)
          OR p.supplier_id = ANY(get_user_companies())
          OR is_admin()
        )
    )
  );

CREATE POLICY product_images_insert ON product_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_images_update ON product_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY product_images_delete ON product_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_id
        AND (p.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );


-- ============================================================
-- purchase_orders: buyer can read own, admin all
-- ============================================================

CREATE POLICY purchase_orders_select ON purchase_orders
  FOR SELECT USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY purchase_orders_insert ON purchase_orders
  FOR INSERT WITH CHECK (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY purchase_orders_update ON purchase_orders
  FOR UPDATE USING (
    buyer_user_id = get_user_profile_id()
    OR buyer_company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY purchase_orders_admin_delete ON purchase_orders
  FOR DELETE USING (is_admin());


-- ============================================================
-- supplier_orders: supplier reads assigned, buyer reads own, admin all
-- ============================================================

CREATE POLICY supplier_orders_select ON supplier_orders
  FOR SELECT USING (
    supplier_id = ANY(get_user_companies())
    OR EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
        AND (po.buyer_user_id = get_user_profile_id()
             OR po.buyer_company_id = ANY(get_user_companies()))
    )
    OR is_admin()
  );

CREATE POLICY supplier_orders_update_supplier ON supplier_orders
  FOR UPDATE USING (supplier_id = ANY(get_user_companies()) OR is_admin())
  WITH CHECK (supplier_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY supplier_orders_admin_insert ON supplier_orders
  FOR INSERT WITH CHECK (is_admin() OR supplier_id = ANY(get_user_companies()));

CREATE POLICY supplier_orders_admin_delete ON supplier_orders
  FOR DELETE USING (is_admin());


-- ============================================================
-- supplier_order_items: follow supplier_orders access
-- ============================================================

CREATE POLICY supplier_order_items_select ON supplier_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (
          so.supplier_id = ANY(get_user_companies())
          OR EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = so.purchase_order_id
              AND (po.buyer_user_id = get_user_profile_id()
                   OR po.buyer_company_id = ANY(get_user_companies()))
          )
          OR is_admin()
        )
    )
  );

CREATE POLICY supplier_order_items_insert ON supplier_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (so.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY supplier_order_items_update ON supplier_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (so.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY supplier_order_items_delete ON supplier_order_items
  FOR DELETE USING (is_admin());


-- ============================================================
-- order_status_history: follow supplier_orders access
-- ============================================================

CREATE POLICY order_status_history_select ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (
          so.supplier_id = ANY(get_user_companies())
          OR EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = so.purchase_order_id
              AND (po.buyer_user_id = get_user_profile_id()
                   OR po.buyer_company_id = ANY(get_user_companies()))
          )
          OR is_admin()
        )
    )
  );

CREATE POLICY order_status_history_insert ON order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND (so.supplier_id = ANY(get_user_companies()) OR is_admin())
    )
  );

CREATE POLICY order_status_history_admin_all ON order_status_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- payment_transactions: buyer/supplier involved can read, admin all
-- ============================================================

CREATE POLICY payment_transactions_select ON payment_transactions
  FOR SELECT USING (
    -- buyer via purchase_order
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
        AND (po.buyer_user_id = get_user_profile_id()
             OR po.buyer_company_id = ANY(get_user_companies()))
    )
    -- supplier via supplier_order
    OR EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND so.supplier_id = ANY(get_user_companies())
    )
    OR is_admin()
  );

CREATE POLICY payment_transactions_admin_all ON payment_transactions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- payment_methods: owner can manage own, admin read
-- ============================================================

CREATE POLICY payment_methods_select ON payment_methods
  FOR SELECT USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY payment_methods_insert ON payment_methods
  FOR INSERT WITH CHECK (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY payment_methods_update ON payment_methods
  FOR UPDATE USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY payment_methods_delete ON payment_methods
  FOR DELETE USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );


-- ============================================================
-- escrow_holds: involved parties can read, admin all
-- ============================================================

CREATE POLICY escrow_holds_select ON escrow_holds
  FOR SELECT USING (
    -- via supplier_order -> supplier
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND so.supplier_id = ANY(get_user_companies())
    )
    -- via payment_transaction -> purchase_order -> buyer
    OR EXISTS (
      SELECT 1 FROM payment_transactions pt
      JOIN purchase_orders po ON po.id = pt.purchase_order_id
      WHERE pt.id = payment_transaction_id
        AND (po.buyer_user_id = get_user_profile_id()
             OR po.buyer_company_id = ANY(get_user_companies()))
    )
    OR is_admin()
  );

CREATE POLICY escrow_holds_admin_all ON escrow_holds
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- platform_wallets: company members read own, admin all
-- ============================================================

CREATE POLICY platform_wallets_select ON platform_wallets
  FOR SELECT USING (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY platform_wallets_admin_all ON platform_wallets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- b2b_invoices: issuer or recipient can read, admin all
-- ============================================================

CREATE POLICY b2b_invoices_select ON b2b_invoices
  FOR SELECT USING (
    issuer_company_id = ANY(get_user_companies())
    OR recipient_company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY b2b_invoices_admin_all ON b2b_invoices
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- tax_exemption_certificates: company members read own, admin manage
-- ============================================================

CREATE POLICY tax_exemption_certificates_select ON tax_exemption_certificates
  FOR SELECT USING (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY tax_exemption_certificates_insert ON tax_exemption_certificates
  FOR INSERT WITH CHECK (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY tax_exemption_certificates_update ON tax_exemption_certificates
  FOR UPDATE USING (company_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY tax_exemption_certificates_admin_all ON tax_exemption_certificates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- tax_rates: public read
-- ============================================================

CREATE POLICY tax_rates_select_public ON tax_rates
  FOR SELECT USING (true);

CREATE POLICY tax_rates_admin_all ON tax_rates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- countries: public read
-- ============================================================

CREATE POLICY countries_select_public ON countries
  FOR SELECT USING (true);

CREATE POLICY countries_admin_all ON countries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- exchange_rates: public read
-- ============================================================

CREATE POLICY exchange_rates_select_public ON exchange_rates
  FOR SELECT USING (true);

CREATE POLICY exchange_rates_admin_all ON exchange_rates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- logistics_zones: public read, logistics/admin manage
-- ============================================================

CREATE POLICY logistics_zones_select_public ON logistics_zones
  FOR SELECT USING (true);

CREATE POLICY logistics_zones_manage ON logistics_zones
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- warehouses: logistics/admin manage
-- ============================================================

CREATE POLICY warehouses_select ON warehouses
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY warehouses_manage ON warehouses
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- vehicles: logistics/admin manage
-- ============================================================

CREATE POLICY vehicles_select ON vehicles
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY vehicles_manage ON vehicles
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- drivers: logistics/admin manage
-- ============================================================

CREATE POLICY drivers_select ON drivers
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY drivers_manage ON drivers
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- delivery_routes: logistics/admin manage
-- ============================================================

CREATE POLICY delivery_routes_select ON delivery_routes
  FOR SELECT USING (is_logistics() OR is_admin());

CREATE POLICY delivery_routes_manage ON delivery_routes
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- b2b_shipments: supplier/buyer involved read, logistics/admin manage
-- ============================================================

CREATE POLICY b2b_shipments_select ON b2b_shipments
  FOR SELECT USING (
    -- supplier via supplier_order
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.id = supplier_order_id
        AND so.supplier_id = ANY(get_user_companies())
    )
    -- buyer via supplier_order -> purchase_order
    OR EXISTS (
      SELECT 1 FROM supplier_orders so
      JOIN purchase_orders po ON po.id = so.purchase_order_id
      WHERE so.id = supplier_order_id
        AND (po.buyer_user_id = get_user_profile_id()
             OR po.buyer_company_id = ANY(get_user_companies()))
    )
    OR is_logistics()
    OR is_admin()
  );

CREATE POLICY b2b_shipments_manage ON b2b_shipments
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- shipment_items: follow b2b_shipments access
-- ============================================================

CREATE POLICY shipment_items_select ON shipment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM b2b_shipments s
      WHERE s.id = shipment_id
        AND (
          EXISTS (
            SELECT 1 FROM supplier_orders so
            WHERE so.id = s.supplier_order_id
              AND so.supplier_id = ANY(get_user_companies())
          )
          OR EXISTS (
            SELECT 1 FROM supplier_orders so
            JOIN purchase_orders po ON po.id = so.purchase_order_id
            WHERE so.id = s.supplier_order_id
              AND (po.buyer_user_id = get_user_profile_id()
                   OR po.buyer_company_id = ANY(get_user_companies()))
          )
          OR is_logistics()
          OR is_admin()
        )
    )
  );

CREATE POLICY shipment_items_manage ON shipment_items
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- shipment_tracking_events: follow b2b_shipments access
-- ============================================================

CREATE POLICY shipment_tracking_events_select ON shipment_tracking_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM b2b_shipments s
      WHERE s.id = shipment_id
        AND (
          EXISTS (
            SELECT 1 FROM supplier_orders so
            WHERE so.id = s.supplier_order_id
              AND so.supplier_id = ANY(get_user_companies())
          )
          OR EXISTS (
            SELECT 1 FROM supplier_orders so
            JOIN purchase_orders po ON po.id = so.purchase_order_id
            WHERE so.id = s.supplier_order_id
              AND (po.buyer_user_id = get_user_profile_id()
                   OR po.buyer_company_id = ANY(get_user_companies()))
          )
          OR is_logistics()
          OR is_admin()
        )
    )
  );

CREATE POLICY shipment_tracking_events_manage ON shipment_tracking_events
  FOR ALL USING (is_logistics() OR is_admin())
  WITH CHECK (is_logistics() OR is_admin());


-- ============================================================
-- shipping_rates: public read, admin manage
-- ============================================================

CREATE POLICY shipping_rates_select_public ON shipping_rates
  FOR SELECT USING (true);

CREATE POLICY shipping_rates_admin_all ON shipping_rates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- settlements: supplier reads own, admin manage
-- ============================================================

CREATE POLICY settlements_select ON settlements
  FOR SELECT USING (supplier_id = ANY(get_user_companies()) OR is_admin());

CREATE POLICY settlements_admin_all ON settlements
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- commission_rules: admin manage, supplier read own
-- ============================================================

CREATE POLICY commission_rules_select ON commission_rules
  FOR SELECT USING (
    supplier_id = ANY(get_user_companies())
    OR supplier_id IS NULL  -- default rules readable by all authenticated
    OR is_admin()
  );

CREATE POLICY commission_rules_admin_all ON commission_rules
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ============================================================
-- addresses: owner can manage own
-- ============================================================

CREATE POLICY addresses_select ON addresses
  FOR SELECT USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY addresses_insert ON addresses
  FOR INSERT WITH CHECK (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY addresses_update ON addresses
  FOR UPDATE USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );

CREATE POLICY addresses_delete ON addresses
  FOR DELETE USING (
    user_id = get_user_profile_id()
    OR company_id = ANY(get_user_companies())
    OR is_admin()
  );
