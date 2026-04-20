// =============================================================
// Auto-generated Supabase Database Types for BUY B2B Platform
// Generated from migration files 00001–00013
// Re-generate with: npx supabase gen types typescript --project-id <id>
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types from 00001_enums.sql
export type PlatformRole =
  | "buyer" | "buyer_staff" | "buyer_finance" | "buyer_viewer"
  | "supplier_owner" | "supplier_sales" | "supplier_catalog" | "supplier_warehouse"
  | "logistics_admin" | "logistics_dispatcher" | "logistics_driver"
  | "admin_super" | "admin_moderator" | "admin_support"

export type B2bOrderStatus =
  | "draft" | "pending_approval" | "pending_payment" | "deposit_paid" | "paid"
  | "confirmed" | "in_production" | "quality_check" | "ready_to_ship"
  | "assigned_to_logistics" | "dispatched" | "in_transit" | "out_for_delivery"
  | "delivered" | "completed"
  | "cancelled" | "disputed" | "refund_requested" | "refunded"

export type ShippingMethod =
  | "platform_standard" | "platform_express" | "platform_freight"
  | "platform_cold_chain" | "supplier_self" | "buyer_pickup" | "third_party"

export type ShipmentStatus =
  | "pending" | "assigned" | "driver_accepted" | "picking" | "packed"
  | "dispatched" | "in_transit" | "at_hub" | "out_for_delivery"
  | "delivery_attempted" | "delivered" | "returned" | "lost" | "damaged"

export type PaymentGateway =
  | "mtn_momo" | "airtel_money" | "tigo_cash" | "mpesa"
  | "stripe" | "alipay" | "wechat_pay"
  | "bank_transfer" | "escrow" | "platform_wallet"

export type PaymentStatus =
  | "pending" | "processing" | "succeeded" | "failed" | "refunded" | "expired" | "cancelled"

export type PaymentTerms = "immediate" | "net_30" | "net_60" | "deposit_balance"

export type MarketRegion =
  | "africa_west" | "africa_east" | "africa_south" | "africa_central" | "africa_north"
  | "cn" | "global"

export type TradeTerm = "fob" | "cif" | "exw" | "ddp" | "dap" | "cpt" | "fca"

export type B2bInvoiceType =
  | "b2b_standard" | "proforma" | "commission" | "credit_note"
  | "fapiao_normal" | "fapiao_special"

export type InvoiceStatus = "pending" | "issued" | "sent" | "voided" | "void_pending" | "failed"
export type SettlementStatus = "pending" | "calculating" | "ready" | "processing" | "paid" | "failed" | "disputed"
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "expired"
export type ModerationStatus = "pending" | "approved" | "rejected" | "suspended"
export type VehicleType = "motorcycle" | "van" | "truck_small" | "truck_large" | "container" | "refrigerated"
export type DriverStatus = "available" | "on_delivery" | "off_duty" | "suspended"
export type WarehouseType = "fulfillment" | "hub" | "cross_dock" | "cold_storage"
export type EscrowStatus = "held" | "partial_release" | "released" | "disputed" | "refunded"
export type TaxType = "taxable" | "zero_rated" | "exempt" | "mixed"
export type TaxSystem = "africa_vat" | "cn_vat" | "stripe_tax" | "manual"
export type AddressFormat = "africa_landmark" | "cn_province" | "international"
export type SupplierTier = "free" | "standard" | "gold" | "verified"
export type CompanyType = "buyer_org" | "supplier" | "logistics"

// Table row types
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          auth_id: string
          email: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          preferred_locale: string
          preferred_currency: string
          country_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          preferred_currency?: string
          country_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferred_locale?: string
          preferred_currency?: string
          country_code?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          name_local: string | null
          slug: string
          type: CompanyType
          tax_id: string | null
          tax_id_type: string | null
          tax_id_verified: boolean
          country_code: string
          city: string | null
          state_province: string | null
          address: string | null
          default_currency: string
          market_region: MarketRegion
          industry: string | null
          employee_count_range: string | null
          established_year: number | null
          website: string | null
          description: string | null
          logo_url: string | null
          verification_status: VerificationStatus
          verified_at: string | null
          verified_by: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_local?: string | null
          slug: string
          type: CompanyType
          tax_id?: string | null
          tax_id_type?: string | null
          tax_id_verified?: boolean
          country_code: string
          city?: string | null
          state_province?: string | null
          address?: string | null
          default_currency?: string
          market_region: MarketRegion
          industry?: string | null
          employee_count_range?: string | null
          established_year?: number | null
          website?: string | null
          description?: string | null
          logo_url?: string | null
          verification_status?: VerificationStatus
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          name_local?: string | null
          slug?: string
          type?: CompanyType
          tax_id?: string | null
          tax_id_type?: string | null
          tax_id_verified?: boolean
          country_code?: string
          city?: string | null
          state_province?: string | null
          address?: string | null
          default_currency?: string
          market_region?: MarketRegion
          industry?: string | null
          employee_count_range?: string | null
          established_year?: number | null
          website?: string | null
          description?: string | null
          logo_url?: string | null
          verification_status?: VerificationStatus
          settings?: Json
          is_active?: boolean
          updated_at?: string
        }
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: PlatformRole
          is_primary: boolean
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: PlatformRole
          is_primary?: boolean
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          company_id?: string
          user_id?: string
          role?: PlatformRole
          is_primary?: boolean
          invited_by?: string | null
        }
      }
      supplier_profiles: {
        Row: {
          id: string
          company_id: string
          business_license_url: string | null
          factory_address: string | null
          factory_city: string | null
          factory_country: string
          warehouse_addresses: Json
          moq_default: number | null
          lead_time_days_default: number | null
          trade_terms_default: TradeTerm
          categories: string[]
          certifications: string[]
          response_rate: number | null
          on_time_delivery_rate: number | null
          average_rating: number | null
          total_orders: number
          total_revenue: number
          tier: SupplierTier
          tier_expires_at: string | null
          commission_rate: number | null
          bank_code: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          bank_branch: string | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          stripe_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          business_license_url?: string | null
          factory_address?: string | null
          factory_city?: string | null
          factory_country?: string
          warehouse_addresses?: Json
          moq_default?: number | null
          lead_time_days_default?: number | null
          trade_terms_default?: TradeTerm
          categories?: string[]
          certifications?: string[]
          tier?: SupplierTier
          commission_rate?: number | null
          stripe_account_id?: string | null
        }
        Update: {
          business_license_url?: string | null
          factory_address?: string | null
          factory_city?: string | null
          factory_country?: string
          warehouse_addresses?: Json
          moq_default?: number | null
          lead_time_days_default?: number | null
          trade_terms_default?: TradeTerm
          categories?: string[]
          certifications?: string[]
          tier?: SupplierTier
          tier_expires_at?: string | null
          commission_rate?: number | null
          stripe_account_id?: string | null
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          parent_id: string | null
          name: string
          name_local: string | null
          slug: string
          level: number
          path: string | null
          description: string | null
          icon: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          name: string
          name_local?: string | null
          slug: string
          level?: number
          path?: string | null
          description?: string | null
          icon?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          parent_id?: string | null
          name?: string
          name_local?: string | null
          slug?: string
          level?: number
          path?: string | null
          description?: string | null
          icon?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          supplier_id: string
          category_id: string | null
          name: string
          name_local: string | null
          slug: string
          description: string | null
          base_price: number
          compare_price: number | null
          currency: string
          moq: number
          lead_time_days: number | null
          trade_term: TradeTerm
          sample_available: boolean
          sample_price: number | null
          sample_moq: number
          moderation_status: ModerationStatus
          moderated_at: string | null
          moderated_by: string | null
          weight_kg: number | null
          dimensions_cm: Json | null
          hs_code: string | null
          origin_country: string | null
          is_active: boolean
          is_featured: boolean
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          category_id?: string | null
          name: string
          name_local?: string | null
          slug: string
          description?: string | null
          base_price: number
          compare_price?: number | null
          currency?: string
          moq?: number
          lead_time_days?: number | null
          trade_term?: TradeTerm
          sample_available?: boolean
          sample_price?: number | null
          sample_moq?: number
          moderation_status?: ModerationStatus
          weight_kg?: number | null
          dimensions_cm?: Json | null
          hs_code?: string | null
          origin_country?: string | null
          is_active?: boolean
          is_featured?: boolean
        }
        Update: {
          supplier_id?: string
          category_id?: string | null
          name?: string
          name_local?: string | null
          slug?: string
          description?: string | null
          base_price?: number
          compare_price?: number | null
          currency?: string
          moq?: number
          lead_time_days?: number | null
          trade_term?: TradeTerm
          sample_available?: boolean
          sample_price?: number | null
          sample_moq?: number
          moderation_status?: ModerationStatus
          moderated_at?: string | null
          moderated_by?: string | null
          weight_kg?: number | null
          dimensions_cm?: Json | null
          hs_code?: string | null
          origin_country?: string | null
          is_active?: boolean
          is_featured?: boolean
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string | null
          name: string
          price_override: number | null
          stock_quantity: number
          weight_kg: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku?: string | null
          name: string
          price_override?: number | null
          stock_quantity?: number
          weight_kg?: number | null
          is_active?: boolean
        }
        Update: {
          product_id?: string
          sku?: string | null
          name?: string
          price_override?: number | null
          stock_quantity?: number
          weight_kg?: number | null
          is_active?: boolean
        }
      }
      product_pricing_tiers: {
        Row: {
          id: string
          product_id: string
          min_quantity: number
          max_quantity: number | null
          unit_price: number
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          min_quantity: number
          max_quantity?: number | null
          unit_price: number
          currency?: string
        }
        Update: {
          product_id?: string
          min_quantity?: number
          max_quantity?: number | null
          unit_price?: number
          currency?: string
        }
      }
      product_certifications: {
        Row: {
          id: string
          product_id: string
          cert_type: string
          cert_number: string | null
          document_url: string | null
          valid_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          cert_type: string
          cert_number?: string | null
          document_url?: string | null
          valid_until?: string | null
        }
        Update: {
          cert_type?: string
          cert_number?: string | null
          document_url?: string | null
          valid_until?: string | null
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
        }
        Update: {
          url?: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      platform_role: PlatformRole
      b2b_order_status: B2bOrderStatus
      shipping_method: ShippingMethod
      shipment_status: ShipmentStatus
      payment_gateway: PaymentGateway
      payment_status: PaymentStatus
      payment_terms: PaymentTerms
      market_region: MarketRegion
      trade_term: TradeTerm
      b2b_invoice_type: B2bInvoiceType
      invoice_status: InvoiceStatus
      settlement_status: SettlementStatus
      verification_status: VerificationStatus
      moderation_status: ModerationStatus
      vehicle_type: VehicleType
      driver_status: DriverStatus
      warehouse_type: WarehouseType
      escrow_status: EscrowStatus
      tax_type: TaxType
      tax_system: TaxSystem
      address_format: AddressFormat
      supplier_tier: SupplierTier
    }
  }
}

// Convenience type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
