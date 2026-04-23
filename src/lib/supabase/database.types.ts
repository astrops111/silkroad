export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_format: Database["public"]["Enums"]["address_format"] | null
          address_line_1: string
          address_line_2: string | null
          city: string
          company_id: string | null
          country_code: string
          created_at: string | null
          gps_coordinates: Json | null
          id: string
          is_default: boolean | null
          label: string | null
          landmark: string | null
          phone: string | null
          postal_code: string | null
          recipient_name: string
          state_province: string | null
          user_id: string | null
          zone_id: string | null
        }
        Insert: {
          address_format?: Database["public"]["Enums"]["address_format"] | null
          address_line_1: string
          address_line_2?: string | null
          city: string
          company_id?: string | null
          country_code: string
          created_at?: string | null
          gps_coordinates?: Json | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          landmark?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient_name: string
          state_province?: string | null
          user_id?: string | null
          zone_id?: string | null
        }
        Update: {
          address_format?: Database["public"]["Enums"]["address_format"] | null
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          company_id?: string | null
          country_code?: string
          created_at?: string | null
          gps_coordinates?: Json | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          landmark?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string
          state_province?: string | null
          user_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_audit: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string
          approval_status: string | null
          approved_by: string | null
          created_at: string
          id: string
          ip_address: unknown
          reason: string | null
          requires_approval: boolean
          supporting_evidence: Json | null
          target_entity: string | null
          target_id: string | null
          target_label: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id: string
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          requires_approval?: boolean
          supporting_evidence?: Json | null
          target_entity?: string | null
          target_id?: string | null
          target_label?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          requires_approval?: boolean
          supporting_evidence?: Json | null
          target_entity?: string | null
          target_id?: string | null
          target_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_action_audit_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_flags: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id: string
          is_enabled?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          feature_type: string
          id: string
          input_tokens: number
          metadata: Json | null
          model_used: string | null
          output_tokens: number
          request_duration_ms: number | null
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature_type: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number
          request_duration_ms?: number | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature_type?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model_used?: string | null
          output_tokens?: number
          request_duration_ms?: number | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_quota: {
        Row: {
          company_id: string
          created_at: string
          current_usage: number
          feature_type: string
          id: string
          month_end: string
          month_start: string
          monthly_limit: number
        }
        Insert: {
          company_id: string
          created_at?: string
          current_usage?: number
          feature_type: string
          id?: string
          month_end: string
          month_start: string
          monthly_limit?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          current_usage?: number
          feature_type?: string
          id?: string
          month_end?: string
          month_start?: string
          monthly_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_quota_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limit_breaches: {
        Row: {
          action_taken: string
          company_id: string | null
          endpoint: string
          flagged_at: string
          id: string
          ip_address: unknown
          request_count: number
          user_id: string | null
          window_seconds: number
        }
        Insert: {
          action_taken?: string
          company_id?: string | null
          endpoint: string
          flagged_at?: string
          id?: string
          ip_address?: unknown
          request_count: number
          user_id?: string | null
          window_seconds: number
        }
        Update: {
          action_taken?: string
          company_id?: string | null
          endpoint?: string
          flagged_at?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_breaches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limit_breaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_invoices: {
        Row: {
          carrier_number: string | null
          carrier_type: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          donation_code: string | null
          etims_cu_invoice_no: string | null
          etims_response: Json | null
          fapiao_check_code: string | null
          fapiao_code: string | null
          fapiao_number: string | null
          golden_tax_response: Json | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts: number | null
          issued_at: string | null
          issuer_company_id: string
          issuer_company_name: string | null
          issuer_tax_id: string | null
          last_attempt_at: string | null
          last_error: string | null
          line_items: Json
          market_region: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id: string | null
          recipient_company_id: string | null
          recipient_company_name: string | null
          recipient_tax_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id: string | null
          tax_amount: number
          tax_rate: number | null
          tax_system: Database["public"]["Enums"]["tax_system"] | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id?: string | null
          tax_amount: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id?: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          supplier_order_id?: string | null
          tax_amount?: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount?: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_invoices_issuer_company_id_fkey"
            columns: ["issuer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_invoices_recipient_company_id_fkey"
            columns: ["recipient_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_invoices_2026q2: {
        Row: {
          carrier_number: string | null
          carrier_type: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          donation_code: string | null
          etims_cu_invoice_no: string | null
          etims_response: Json | null
          fapiao_check_code: string | null
          fapiao_code: string | null
          fapiao_number: string | null
          golden_tax_response: Json | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts: number | null
          issued_at: string | null
          issuer_company_id: string
          issuer_company_name: string | null
          issuer_tax_id: string | null
          last_attempt_at: string | null
          last_error: string | null
          line_items: Json
          market_region: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id: string | null
          recipient_company_id: string | null
          recipient_company_name: string | null
          recipient_tax_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id: string | null
          tax_amount: number
          tax_rate: number | null
          tax_system: Database["public"]["Enums"]["tax_system"] | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id?: string | null
          tax_amount: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id?: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          supplier_order_id?: string | null
          tax_amount?: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount?: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      b2b_invoices_2026q3: {
        Row: {
          carrier_number: string | null
          carrier_type: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          donation_code: string | null
          etims_cu_invoice_no: string | null
          etims_response: Json | null
          fapiao_check_code: string | null
          fapiao_code: string | null
          fapiao_number: string | null
          golden_tax_response: Json | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts: number | null
          issued_at: string | null
          issuer_company_id: string
          issuer_company_name: string | null
          issuer_tax_id: string | null
          last_attempt_at: string | null
          last_error: string | null
          line_items: Json
          market_region: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id: string | null
          recipient_company_id: string | null
          recipient_company_name: string | null
          recipient_tax_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id: string | null
          tax_amount: number
          tax_rate: number | null
          tax_system: Database["public"]["Enums"]["tax_system"] | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id?: string | null
          tax_amount: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id?: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          supplier_order_id?: string | null
          tax_amount?: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount?: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      b2b_invoices_2026q4: {
        Row: {
          carrier_number: string | null
          carrier_type: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          donation_code: string | null
          etims_cu_invoice_no: string | null
          etims_response: Json | null
          fapiao_check_code: string | null
          fapiao_code: string | null
          fapiao_number: string | null
          golden_tax_response: Json | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts: number | null
          issued_at: string | null
          issuer_company_id: string
          issuer_company_name: string | null
          issuer_tax_id: string | null
          last_attempt_at: string | null
          last_error: string | null
          line_items: Json
          market_region: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id: string | null
          recipient_company_id: string | null
          recipient_company_name: string | null
          recipient_tax_id: string | null
          settlement_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id: string | null
          tax_amount: number
          tax_rate: number | null
          tax_system: Database["public"]["Enums"]["tax_system"] | null
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_order_id?: string | null
          tax_amount: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          carrier_number?: string | null
          carrier_type?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          donation_code?: string | null
          etims_cu_invoice_no?: string | null
          etims_response?: Json | null
          fapiao_check_code?: string | null
          fapiao_code?: string | null
          fapiao_number?: string | null
          golden_tax_response?: Json | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["b2b_invoice_type"]
          issue_attempts?: number | null
          issued_at?: string | null
          issuer_company_id?: string
          issuer_company_name?: string | null
          issuer_tax_id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          line_items?: Json
          market_region?: Database["public"]["Enums"]["market_region"] | null
          purchase_order_id?: string | null
          recipient_company_id?: string | null
          recipient_company_name?: string | null
          recipient_tax_id?: string | null
          settlement_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          supplier_order_id?: string | null
          tax_amount?: number
          tax_rate?: number | null
          tax_system?: Database["public"]["Enums"]["tax_system"] | null
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          total_amount?: number
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      b2b_shipment_cost_actuals: {
        Row: {
          amount_minor: number
          attachment_url: string | null
          category: Database["public"]["Enums"]["shipment_cost_category"]
          created_at: string
          created_by: string | null
          currency: string
          fx_rate_to_usd: number | null
          id: string
          invoice_date: string | null
          invoice_ref: string | null
          notes: string | null
          shipment_id: string
          vendor: string | null
        }
        Insert: {
          amount_minor: number
          attachment_url?: string | null
          category: Database["public"]["Enums"]["shipment_cost_category"]
          created_at?: string
          created_by?: string | null
          currency?: string
          fx_rate_to_usd?: number | null
          id?: string
          invoice_date?: string | null
          invoice_ref?: string | null
          notes?: string | null
          shipment_id: string
          vendor?: string | null
        }
        Update: {
          amount_minor?: number
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["shipment_cost_category"]
          created_at?: string
          created_by?: string | null
          currency?: string
          fx_rate_to_usd?: number | null
          id?: string
          invoice_date?: string | null
          invoice_ref?: string | null
          notes?: string | null
          shipment_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_shipment_cost_actuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_shipments: {
        Row: {
          actual_currency: string | null
          actual_recorded_at: string | null
          actual_total_minor: number | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          bill_of_lading: string | null
          booking_number: string | null
          carrier_scac: string | null
          container_number: string | null
          cost_breakdown: Json | null
          cost_variance_minor: number | null
          created_at: string
          currency: string | null
          current_location: Json | null
          customs_broker_name: string | null
          customs_broker_ref: string | null
          customs_cleared_at: string | null
          customs_declaration_no: string | null
          customs_duty_paid_minor: number | null
          customs_filed_at: string | null
          customs_notes: string | null
          customs_other_paid_minor: number | null
          customs_paid_currency: string | null
          customs_status:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_gps: Json | null
          delivery_landmark: string | null
          destination_zone_id: string | null
          dispatched_at: string | null
          estimated_delivery_at: string | null
          hs_codes: string[] | null
          id: string
          incoterm_detail: string | null
          insurance_amount: number | null
          is_fragile: boolean | null
          is_hazardous: boolean | null
          last_polled_at: string | null
          ops_freight_quote_id: string | null
          origin_warehouse_id: string | null
          package_count: number | null
          package_description: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_country: string | null
          pickup_scheduled_at: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_port_id: string | null
          pod_recipient_name: string | null
          pod_signature_url: string | null
          pol_port_id: string | null
          quoted_at: string | null
          quoted_currency: string | null
          quoted_fx_rate_to_usd: number | null
          quoted_total_minor: number | null
          raw_events: Json[] | null
          requires_cold_chain: boolean | null
          route_id: string | null
          seal_number: string | null
          shipment_number: string
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id: string | null
          total_volume_cbm: number | null
          total_weight_kg: number | null
          tracking_external_ref: string | null
          tracking_number: string | null
          tracking_provider: string | null
          tracking_url: string | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          vessel_name: string | null
          voyage_no: string | null
        }
        Insert: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number: string
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Update: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_shipments_ops_freight_quote_id_fkey"
            columns: ["ops_freight_quote_id"]
            isOneToOne: false
            referencedRelation: "ops_freight_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_pod_port_id_fkey"
            columns: ["pod_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_pol_port_id_fkey"
            columns: ["pol_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_shipments_2026q2: {
        Row: {
          actual_currency: string | null
          actual_recorded_at: string | null
          actual_total_minor: number | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          bill_of_lading: string | null
          booking_number: string | null
          carrier_scac: string | null
          container_number: string | null
          cost_breakdown: Json | null
          cost_variance_minor: number | null
          created_at: string
          currency: string | null
          current_location: Json | null
          customs_broker_name: string | null
          customs_broker_ref: string | null
          customs_cleared_at: string | null
          customs_declaration_no: string | null
          customs_duty_paid_minor: number | null
          customs_filed_at: string | null
          customs_notes: string | null
          customs_other_paid_minor: number | null
          customs_paid_currency: string | null
          customs_status:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_gps: Json | null
          delivery_landmark: string | null
          destination_zone_id: string | null
          dispatched_at: string | null
          estimated_delivery_at: string | null
          hs_codes: string[] | null
          id: string
          incoterm_detail: string | null
          insurance_amount: number | null
          is_fragile: boolean | null
          is_hazardous: boolean | null
          last_polled_at: string | null
          ops_freight_quote_id: string | null
          origin_warehouse_id: string | null
          package_count: number | null
          package_description: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_country: string | null
          pickup_scheduled_at: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_port_id: string | null
          pod_recipient_name: string | null
          pod_signature_url: string | null
          pol_port_id: string | null
          quoted_at: string | null
          quoted_currency: string | null
          quoted_fx_rate_to_usd: number | null
          quoted_total_minor: number | null
          raw_events: Json[] | null
          requires_cold_chain: boolean | null
          route_id: string | null
          seal_number: string | null
          shipment_number: string
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id: string | null
          total_volume_cbm: number | null
          total_weight_kg: number | null
          tracking_external_ref: string | null
          tracking_number: string | null
          tracking_provider: string | null
          tracking_url: string | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          vessel_name: string | null
          voyage_no: string | null
        }
        Insert: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number: string
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Update: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Relationships: []
      }
      b2b_shipments_2026q3: {
        Row: {
          actual_currency: string | null
          actual_recorded_at: string | null
          actual_total_minor: number | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          bill_of_lading: string | null
          booking_number: string | null
          carrier_scac: string | null
          container_number: string | null
          cost_breakdown: Json | null
          cost_variance_minor: number | null
          created_at: string
          currency: string | null
          current_location: Json | null
          customs_broker_name: string | null
          customs_broker_ref: string | null
          customs_cleared_at: string | null
          customs_declaration_no: string | null
          customs_duty_paid_minor: number | null
          customs_filed_at: string | null
          customs_notes: string | null
          customs_other_paid_minor: number | null
          customs_paid_currency: string | null
          customs_status:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_gps: Json | null
          delivery_landmark: string | null
          destination_zone_id: string | null
          dispatched_at: string | null
          estimated_delivery_at: string | null
          hs_codes: string[] | null
          id: string
          incoterm_detail: string | null
          insurance_amount: number | null
          is_fragile: boolean | null
          is_hazardous: boolean | null
          last_polled_at: string | null
          ops_freight_quote_id: string | null
          origin_warehouse_id: string | null
          package_count: number | null
          package_description: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_country: string | null
          pickup_scheduled_at: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_port_id: string | null
          pod_recipient_name: string | null
          pod_signature_url: string | null
          pol_port_id: string | null
          quoted_at: string | null
          quoted_currency: string | null
          quoted_fx_rate_to_usd: number | null
          quoted_total_minor: number | null
          raw_events: Json[] | null
          requires_cold_chain: boolean | null
          route_id: string | null
          seal_number: string | null
          shipment_number: string
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id: string | null
          total_volume_cbm: number | null
          total_weight_kg: number | null
          tracking_external_ref: string | null
          tracking_number: string | null
          tracking_provider: string | null
          tracking_url: string | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          vessel_name: string | null
          voyage_no: string | null
        }
        Insert: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number: string
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Update: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Relationships: []
      }
      b2b_shipments_2026q4: {
        Row: {
          actual_currency: string | null
          actual_recorded_at: string | null
          actual_total_minor: number | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          bill_of_lading: string | null
          booking_number: string | null
          carrier_scac: string | null
          container_number: string | null
          cost_breakdown: Json | null
          cost_variance_minor: number | null
          created_at: string
          currency: string | null
          current_location: Json | null
          customs_broker_name: string | null
          customs_broker_ref: string | null
          customs_cleared_at: string | null
          customs_declaration_no: string | null
          customs_duty_paid_minor: number | null
          customs_filed_at: string | null
          customs_notes: string | null
          customs_other_paid_minor: number | null
          customs_paid_currency: string | null
          customs_status:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_gps: Json | null
          delivery_landmark: string | null
          destination_zone_id: string | null
          dispatched_at: string | null
          estimated_delivery_at: string | null
          hs_codes: string[] | null
          id: string
          incoterm_detail: string | null
          insurance_amount: number | null
          is_fragile: boolean | null
          is_hazardous: boolean | null
          last_polled_at: string | null
          ops_freight_quote_id: string | null
          origin_warehouse_id: string | null
          package_count: number | null
          package_description: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_country: string | null
          pickup_scheduled_at: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_port_id: string | null
          pod_recipient_name: string | null
          pod_signature_url: string | null
          pol_port_id: string | null
          quoted_at: string | null
          quoted_currency: string | null
          quoted_fx_rate_to_usd: number | null
          quoted_total_minor: number | null
          raw_events: Json[] | null
          requires_cold_chain: boolean | null
          route_id: string | null
          seal_number: string | null
          shipment_number: string
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id: string | null
          total_volume_cbm: number | null
          total_weight_kg: number | null
          tracking_external_ref: string | null
          tracking_number: string | null
          tracking_provider: string | null
          tracking_url: string | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          vessel_name: string | null
          voyage_no: string | null
        }
        Insert: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number: string
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Update: {
          actual_currency?: string | null
          actual_recorded_at?: string | null
          actual_total_minor?: number | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          bill_of_lading?: string | null
          booking_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          cost_breakdown?: Json | null
          cost_variance_minor?: number | null
          created_at?: string
          currency?: string | null
          current_location?: Json | null
          customs_broker_name?: string | null
          customs_broker_ref?: string | null
          customs_cleared_at?: string | null
          customs_declaration_no?: string | null
          customs_duty_paid_minor?: number | null
          customs_filed_at?: string | null
          customs_notes?: string | null
          customs_other_paid_minor?: number | null
          customs_paid_currency?: string | null
          customs_status?:
            | Database["public"]["Enums"]["customs_status_enum"]
            | null
          customs_vat_paid_minor?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_gps?: Json | null
          delivery_landmark?: string | null
          destination_zone_id?: string | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          hs_codes?: string[] | null
          id?: string
          incoterm_detail?: string | null
          insurance_amount?: number | null
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          last_polled_at?: string | null
          ops_freight_quote_id?: string | null
          origin_warehouse_id?: string | null
          package_count?: number | null
          package_description?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_scheduled_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_port_id?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          pol_port_id?: string | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_fx_rate_to_usd?: number | null
          quoted_total_minor?: number | null
          raw_events?: Json[] | null
          requires_cold_chain?: boolean | null
          route_id?: string | null
          seal_number?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          supplier_order_id?: string | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          tracking_external_ref?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_url?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_no?: string | null
        }
        Relationships: []
      }
      buyer_requests: {
        Row: {
          assigned_to: string | null
          budget_usd: string | null
          buyer_user_id: string | null
          category: string | null
          company_name: string | null
          country_code: string | null
          created_at: string
          description: string
          email: string
          id: string
          locale: string | null
          name: string
          ops_notes: string | null
          phone: string | null
          quantity: string | null
          source_path: string | null
          status: string
          timeline: string | null
          title: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_usd?: string | null
          buyer_user_id?: string | null
          category?: string | null
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          description: string
          email: string
          id?: string
          locale?: string | null
          name: string
          ops_notes?: string | null
          phone?: string | null
          quantity?: string | null
          source_path?: string | null
          status?: string
          timeline?: string | null
          title: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_usd?: string | null
          buyer_user_id?: string | null
          category?: string | null
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          description?: string
          email?: string
          id?: string
          locale?: string | null
          name?: string
          ops_notes?: string | null
          phone?: string | null
          quantity?: string | null
          source_path?: string | null
          status?: string
          timeline?: string | null
          title?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          name_local: string | null
          parent_id: string | null
          path: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          name_local?: string | null
          parent_id?: string | null
          path?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          name_local?: string | null
          parent_id?: string | null
          path?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          category_id: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          market_region: Database["public"]["Enums"]["market_region"] | null
          max_fee: number | null
          min_fee: number | null
          priority: number | null
          rate: number
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          market_region?: Database["public"]["Enums"]["market_region"] | null
          max_fee?: number | null
          min_fee?: number | null
          priority?: number | null
          rate: number
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          market_region?: Database["public"]["Enums"]["market_region"] | null
          max_fee?: number | null
          min_fee?: number | null
          priority?: number | null
          rate?: number
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commodities: {
        Row: {
          altitude_masl: number | null
          assay: Json | null
          assay_report_url: string | null
          available_quantity: number | null
          category: string
          cert_expiry: string | null
          certifications: string[] | null
          cites_permit_ref: string | null
          cooperative_name: string | null
          created_at: string
          created_by: string | null
          cupping_score: number | null
          currency: string
          export_license_number: string | null
          export_permit_ref: string | null
          farm_name: string | null
          farm_photos: string[] | null
          fts: unknown
          gacc_registration_ref: string | null
          grade: string | null
          harvest_season_end: string | null
          harvest_season_start: string | null
          hs_code: string | null
          id: string
          images: string[] | null
          incoterm: Database["public"]["Enums"]["trade_term"] | null
          inspection_agency: string | null
          is_featured: boolean | null
          is_zero_tariff_eligible: boolean | null
          kimberley_cert_ref: string | null
          lab_reports: string[] | null
          lead_time_days: number | null
          max_order_kg: number | null
          min_order_kg: number
          min_order_quantity: number | null
          mine_license_ref: string | null
          moisture_pct: number | null
          name_en: string
          name_fr: string | null
          name_zh: string | null
          next_harvest_date: string | null
          oecd_3tg_due_diligence_ref: string | null
          origin_country: string
          origin_region: string | null
          phytosanitary_template: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          price_per_unit_usd: number | null
          price_usd_per_kg: number
          processing_method: string | null
          resource_category_id: string | null
          screen_size: string | null
          slug: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          stock_kg: number | null
          subcategory: string | null
          tenant_id: string
          unit_of_measure: string | null
          updated_at: string
          variety: string | null
          view_count: number | null
        }
        Insert: {
          altitude_masl?: number | null
          assay?: Json | null
          assay_report_url?: string | null
          available_quantity?: number | null
          category: string
          cert_expiry?: string | null
          certifications?: string[] | null
          cites_permit_ref?: string | null
          cooperative_name?: string | null
          created_at?: string
          created_by?: string | null
          cupping_score?: number | null
          currency?: string
          export_license_number?: string | null
          export_permit_ref?: string | null
          farm_name?: string | null
          farm_photos?: string[] | null
          fts?: unknown
          gacc_registration_ref?: string | null
          grade?: string | null
          harvest_season_end?: string | null
          harvest_season_start?: string | null
          hs_code?: string | null
          id?: string
          images?: string[] | null
          incoterm?: Database["public"]["Enums"]["trade_term"] | null
          inspection_agency?: string | null
          is_featured?: boolean | null
          is_zero_tariff_eligible?: boolean | null
          kimberley_cert_ref?: string | null
          lab_reports?: string[] | null
          lead_time_days?: number | null
          max_order_kg?: number | null
          min_order_kg?: number
          min_order_quantity?: number | null
          mine_license_ref?: string | null
          moisture_pct?: number | null
          name_en: string
          name_fr?: string | null
          name_zh?: string | null
          next_harvest_date?: string | null
          oecd_3tg_due_diligence_ref?: string | null
          origin_country: string
          origin_region?: string | null
          phytosanitary_template?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          price_per_unit_usd?: number | null
          price_usd_per_kg: number
          processing_method?: string | null
          resource_category_id?: string | null
          screen_size?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          stock_kg?: number | null
          subcategory?: string | null
          tenant_id: string
          unit_of_measure?: string | null
          updated_at?: string
          variety?: string | null
          view_count?: number | null
        }
        Update: {
          altitude_masl?: number | null
          assay?: Json | null
          assay_report_url?: string | null
          available_quantity?: number | null
          category?: string
          cert_expiry?: string | null
          certifications?: string[] | null
          cites_permit_ref?: string | null
          cooperative_name?: string | null
          created_at?: string
          created_by?: string | null
          cupping_score?: number | null
          currency?: string
          export_license_number?: string | null
          export_permit_ref?: string | null
          farm_name?: string | null
          farm_photos?: string[] | null
          fts?: unknown
          gacc_registration_ref?: string | null
          grade?: string | null
          harvest_season_end?: string | null
          harvest_season_start?: string | null
          hs_code?: string | null
          id?: string
          images?: string[] | null
          incoterm?: Database["public"]["Enums"]["trade_term"] | null
          inspection_agency?: string | null
          is_featured?: boolean | null
          is_zero_tariff_eligible?: boolean | null
          kimberley_cert_ref?: string | null
          lab_reports?: string[] | null
          lead_time_days?: number | null
          max_order_kg?: number | null
          min_order_kg?: number
          min_order_quantity?: number | null
          mine_license_ref?: string | null
          moisture_pct?: number | null
          name_en?: string
          name_fr?: string | null
          name_zh?: string | null
          next_harvest_date?: string | null
          oecd_3tg_due_diligence_ref?: string | null
          origin_country?: string
          origin_region?: string | null
          phytosanitary_template?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          price_per_unit_usd?: number | null
          price_usd_per_kg?: number
          processing_method?: string | null
          resource_category_id?: string | null
          screen_size?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          stock_kg?: number | null
          subcategory?: string | null
          tenant_id?: string
          unit_of_measure?: string | null
          updated_at?: string
          variety?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commodities_resource_category_id_fkey"
            columns: ["resource_category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commodities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country_code: string
          created_at: string | null
          default_currency: string | null
          description: string | null
          employee_count_range: string | null
          established_year: number | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_verified: boolean
          logo_url: string | null
          market_region: Database["public"]["Enums"]["market_region"]
          name: string
          name_local: string | null
          settings: Json | null
          slug: string
          state_province: string | null
          tax_id: string | null
          tax_id_type: string | null
          tax_id_verified: boolean | null
          tier: Database["public"]["Enums"]["supplier_tier"]
          tier_expires_at: string | null
          type: string
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country_code: string
          created_at?: string | null
          default_currency?: string | null
          description?: string | null
          employee_count_range?: string | null
          established_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean
          logo_url?: string | null
          market_region: Database["public"]["Enums"]["market_region"]
          name: string
          name_local?: string | null
          settings?: Json | null
          slug: string
          state_province?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          tax_id_verified?: boolean | null
          tier?: Database["public"]["Enums"]["supplier_tier"]
          tier_expires_at?: string | null
          type: string
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          default_currency?: string | null
          description?: string | null
          employee_count_range?: string | null
          established_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_verified?: boolean
          logo_url?: string | null
          market_region?: Database["public"]["Enums"]["market_region"]
          name?: string
          name_local?: string | null
          settings?: Json | null
          slug?: string
          state_province?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          tax_id_verified?: boolean | null
          tier?: Database["public"]["Enums"]["supplier_tier"]
          tier_expires_at?: string | null
          type?: string
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          invited_by: string | null
          is_primary: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_company_id: string
          buyer_unread_count: number | null
          context_id: string | null
          context_title: string | null
          context_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_archived_buyer: boolean | null
          is_archived_supplier: boolean | null
          last_message_at: string | null
          last_message_by: string | null
          last_message_text: string | null
          supplier_company_id: string
          supplier_unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_company_id: string
          buyer_unread_count?: number | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived_buyer?: boolean | null
          is_archived_supplier?: boolean | null
          last_message_at?: string | null
          last_message_by?: string | null
          last_message_text?: string | null
          supplier_company_id: string
          supplier_unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_company_id?: string
          buyer_unread_count?: number | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived_buyer?: boolean | null
          is_archived_supplier?: boolean | null
          last_message_at?: string | null
          last_message_by?: string | null
          last_message_text?: string | null
          supplier_company_id?: string
          supplier_unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_last_message_by_fkey"
            columns: ["last_message_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          address_format: Database["public"]["Enums"]["address_format"] | null
          country_code: string
          currency_code: string
          default_locale: string | null
          dialing_code: string | null
          e_invoice_mandatory: boolean | null
          e_invoice_system: string | null
          is_active: boolean | null
          market_region: Database["public"]["Enums"]["market_region"]
          mobile_money_providers: string[] | null
          name: string
          name_local: string | null
          tax_id_format: string | null
          tax_id_label: string | null
          tax_id_regex: string | null
        }
        Insert: {
          address_format?: Database["public"]["Enums"]["address_format"] | null
          country_code: string
          currency_code: string
          default_locale?: string | null
          dialing_code?: string | null
          e_invoice_mandatory?: boolean | null
          e_invoice_system?: string | null
          is_active?: boolean | null
          market_region: Database["public"]["Enums"]["market_region"]
          mobile_money_providers?: string[] | null
          name: string
          name_local?: string | null
          tax_id_format?: string | null
          tax_id_label?: string | null
          tax_id_regex?: string | null
        }
        Update: {
          address_format?: Database["public"]["Enums"]["address_format"] | null
          country_code?: string
          currency_code?: string
          default_locale?: string | null
          dialing_code?: string | null
          e_invoice_mandatory?: boolean | null
          e_invoice_system?: string | null
          is_active?: boolean | null
          market_region?: Database["public"]["Enums"]["market_region"]
          mobile_money_providers?: string[] | null
          name?: string
          name_local?: string | null
          tax_id_format?: string | null
          tax_id_label?: string | null
          tax_id_regex?: string | null
        }
        Relationships: []
      }
      customs_holds: {
        Row: {
          created_at: string
          external_ref: string | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          reason: Database["public"]["Enums"]["customs_hold_reason"]
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          external_ref?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          reason: Database["public"]["Enums"]["customs_hold_reason"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          external_ref?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          reason?: Database["public"]["Enums"]["customs_hold_reason"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_holds_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_holds_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          denial_reason: string | null
          id: string
          processed_by: string | null
          reason: string | null
          request_type: string
          requested_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          denial_reason?: string | null
          id?: string
          processed_by?: string | null
          reason?: string | null
          request_type: string
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          denial_reason?: string | null
          id?: string
          processed_by?: string | null
          reason?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      database_metrics: {
        Row: {
          dead_rows: number | null
          id: string
          index_size_bytes: number | null
          last_analyze_at: string | null
          last_vacuum_at: string | null
          measured_at: string
          row_count: number | null
          table_name: string
          table_size_bytes: number | null
          total_size_bytes: number | null
        }
        Insert: {
          dead_rows?: number | null
          id?: string
          index_size_bytes?: number | null
          last_analyze_at?: string | null
          last_vacuum_at?: string | null
          measured_at?: string
          row_count?: number | null
          table_name: string
          table_size_bytes?: number | null
          total_size_bytes?: number | null
        }
        Update: {
          dead_rows?: number | null
          id?: string
          index_size_bytes?: number | null
          last_analyze_at?: string | null
          last_vacuum_at?: string | null
          measured_at?: string
          row_count?: number | null
          table_name?: string
          table_size_bytes?: number | null
          total_size_bytes?: number | null
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          created_at: string | null
          date: string | null
          distance_km: number | null
          estimated_duration_min: number | null
          id: string
          name: string | null
          route_type: string | null
          status: string | null
          stops: Json | null
          updated_at: string | null
          warehouse_id: string | null
          zone_id: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          created_at?: string | null
          date?: string | null
          distance_km?: number | null
          estimated_duration_min?: number | null
          id?: string
          name?: string | null
          route_type?: string | null
          status?: string | null
          stops?: Json | null
          updated_at?: string | null
          warehouse_id?: string | null
          zone_id?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          created_at?: string | null
          date?: string | null
          distance_km?: number | null
          estimated_duration_min?: number | null
          id?: string
          name?: string | null
          route_type?: string | null
          status?: string | null
          stops?: Json | null
          updated_at?: string | null
          warehouse_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          blocks_settlement: boolean | null
          created_at: string | null
          currency: string | null
          description: string
          disputed_amount: number | null
          evidence_urls: string[] | null
          id: string
          opened_by_company_id: string
          opened_by_user_id: string
          purchase_order_id: string | null
          refund_amount: number | null
          resolution: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          supplier_company_id: string
          supplier_order_id: string
          title: string
          type: Database["public"]["Enums"]["dispute_type"]
          updated_at: string | null
        }
        Insert: {
          blocks_settlement?: boolean | null
          created_at?: string | null
          currency?: string | null
          description: string
          disputed_amount?: number | null
          evidence_urls?: string[] | null
          id?: string
          opened_by_company_id: string
          opened_by_user_id: string
          purchase_order_id?: string | null
          refund_amount?: number | null
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          supplier_company_id: string
          supplier_order_id: string
          title: string
          type: Database["public"]["Enums"]["dispute_type"]
          updated_at?: string | null
        }
        Update: {
          blocks_settlement?: boolean | null
          created_at?: string | null
          currency?: string | null
          description?: string
          disputed_amount?: number | null
          evidence_urls?: string[] | null
          id?: string
          opened_by_company_id?: string
          opened_by_user_id?: string
          purchase_order_id?: string | null
          refund_amount?: number | null
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          supplier_company_id?: string
          supplier_order_id?: string
          title?: string
          type?: Database["public"]["Enums"]["dispute_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_company_id_fkey"
            columns: ["opened_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_user_id_fkey"
            columns: ["opened_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requirements: {
        Row: {
          container_type: string | null
          created_at: string
          destination_country: string
          document_type: Database["public"]["Enums"]["document_type"]
          external_url: string | null
          hs_prefix: string | null
          id: string
          is_active: boolean | null
          is_required: boolean
          notes: string | null
          shipping_method: string | null
          updated_at: string | null
        }
        Insert: {
          container_type?: string | null
          created_at?: string
          destination_country: string
          document_type: Database["public"]["Enums"]["document_type"]
          external_url?: string | null
          hs_prefix?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          notes?: string | null
          shipping_method?: string | null
          updated_at?: string | null
        }
        Update: {
          container_type?: string | null
          created_at?: string
          destination_country?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          external_url?: string | null
          hs_prefix?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          notes?: string | null
          shipping_method?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string | null
          current_location: Json | null
          id: string
          license_expiry: string | null
          license_number: string | null
          license_type: string | null
          phone: string
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string
          vehicle_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_location?: Json | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          phone: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_location?: Json | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          phone?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_log: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          resend_message_id: string | null
          sent_to_company_id: string | null
          sent_to_user_id: string | null
          status: string
          subject: string
          template: string | null
          updated_at: string
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          resend_message_id?: string | null
          sent_to_company_id?: string | null
          sent_to_user_id?: string | null
          status?: string
          subject: string
          template?: string | null
          updated_at?: string
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          resend_message_id?: string | null
          sent_to_company_id?: string | null
          sent_to_user_id?: string | null
          status?: string
          subject?: string
          template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_log_sent_to_company_id_fkey"
            columns: ["sent_to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_sent_to_user_id_fkey"
            columns: ["sent_to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          message: string
          metadata: Json | null
          request_id: string | null
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_holds: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          payment_transaction_id: string
          release_conditions: Json | null
          released_at: string | null
          status: Database["public"]["Enums"]["escrow_status"] | null
          supplier_order_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          id?: string
          payment_transaction_id: string
          release_conditions?: Json | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"] | null
          supplier_order_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_transaction_id?: string
          release_conditions?: Json | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"] | null
          supplier_order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          rate: number
          source: string | null
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          from_currency: string
          id?: string
          rate: number
          source?: string | null
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          from_currency?: string
          id?: string
          rate?: number
          source?: string | null
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      file_storage_log: {
        Row: {
          company_id: string | null
          created_at: string
          deleted_at: string | null
          file_category: string | null
          file_name: string | null
          file_path: string
          file_size_bytes: number
          id: string
          is_deleted: boolean
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_category?: string | null
          file_name?: string | null
          file_path: string
          file_size_bytes?: number
          id?: string
          is_deleted?: boolean
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_category?: string | null
          file_name?: string | null
          file_path?: string
          file_size_bytes?: number
          id?: string
          is_deleted?: boolean
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_storage_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_storage_log_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_lanes: {
        Row: {
          base_rate: number | null
          consolidation_days: number | null
          container_type: Database["public"]["Enums"]["container_type"]
          created_at: string
          currency: string | null
          destination_country: string | null
          destination_port_id: string | null
          external_ref: string | null
          fuel_surcharge_pct: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          min_charge: number | null
          origin_country: string | null
          origin_port_id: string | null
          per_cbm_rate: number | null
          per_container_rate: number | null
          per_kg_rate: number | null
          provider: string | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          source: Database["public"]["Enums"]["rate_source"]
          transit_days_max: number | null
          transit_days_min: number | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          base_rate?: number | null
          consolidation_days?: number | null
          container_type: Database["public"]["Enums"]["container_type"]
          created_at?: string
          currency?: string | null
          destination_country?: string | null
          destination_port_id?: string | null
          external_ref?: string | null
          fuel_surcharge_pct?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          min_charge?: number | null
          origin_country?: string | null
          origin_port_id?: string | null
          per_cbm_rate?: number | null
          per_container_rate?: number | null
          per_kg_rate?: number | null
          provider?: string | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          source?: Database["public"]["Enums"]["rate_source"]
          transit_days_max?: number | null
          transit_days_min?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          base_rate?: number | null
          consolidation_days?: number | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          currency?: string | null
          destination_country?: string | null
          destination_port_id?: string | null
          external_ref?: string | null
          fuel_surcharge_pct?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          min_charge?: number | null
          origin_country?: string | null
          origin_port_id?: string | null
          per_cbm_rate?: number | null
          per_container_rate?: number | null
          per_kg_rate?: number | null
          provider?: string | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          source?: Database["public"]["Enums"]["rate_source"]
          transit_days_max?: number | null
          transit_days_min?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_lanes_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_lanes_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_health_checks: {
        Row: {
          avg_processing_time_ms: number | null
          checked_at: string
          error_message: string | null
          gateway: string
          id: string
          is_available: boolean
          response_time_ms: number | null
          success_rate_24h: number | null
          transaction_count_24h: number | null
        }
        Insert: {
          avg_processing_time_ms?: number | null
          checked_at?: string
          error_message?: string | null
          gateway: string
          id?: string
          is_available?: boolean
          response_time_ms?: number | null
          success_rate_24h?: number | null
          transaction_count_24h?: number | null
        }
        Update: {
          avg_processing_time_ms?: number | null
          checked_at?: string
          error_message?: string | null
          gateway?: string
          id?: string
          is_available?: boolean
          response_time_ms?: number | null
          success_rate_24h?: number | null
          transaction_count_24h?: number | null
        }
        Relationships: []
      }
      gateway_transaction_log: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          error_code: string | null
          error_message: string | null
          external_ref: string | null
          gateway: string
          id: string
          metadata: Json | null
          operation: string
          payment_id: string | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          external_ref?: string | null
          gateway: string
          id?: string
          metadata?: Json | null
          operation: string
          payment_id?: string | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message?: string | null
          external_ref?: string | null
          gateway?: string
          id?: string
          metadata?: Json | null
          operation?: string
          payment_id?: string | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_transaction_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_bookings: {
        Row: {
          agency: Database["public"]["Enums"]["inspection_agency"]
          agency_other_name: string | null
          assay_results: Json | null
          booked_by_company_id: string
          booking_fee_usd: number | null
          booking_reference: string
          commodity_id: string | null
          completed_at: string | null
          created_at: string
          draft_weight_mt: number | null
          fee_paid: boolean | null
          final_weight_mt: number | null
          findings: Json | null
          id: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          lc_id: string | null
          port_code: string | null
          price_adjustment_pct: number | null
          quotation_id: string | null
          report_summary: string | null
          report_url: string | null
          rfq_id: string | null
          scheduled_date: string | null
          site_location: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          supplier_company_id: string | null
          updated_at: string
        }
        Insert: {
          agency: Database["public"]["Enums"]["inspection_agency"]
          agency_other_name?: string | null
          assay_results?: Json | null
          booked_by_company_id: string
          booking_fee_usd?: number | null
          booking_reference: string
          commodity_id?: string | null
          completed_at?: string | null
          created_at?: string
          draft_weight_mt?: number | null
          fee_paid?: boolean | null
          final_weight_mt?: number | null
          findings?: Json | null
          id?: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          lc_id?: string | null
          port_code?: string | null
          price_adjustment_pct?: number | null
          quotation_id?: string | null
          report_summary?: string | null
          report_url?: string | null
          rfq_id?: string | null
          scheduled_date?: string | null
          site_location?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          supplier_company_id?: string | null
          updated_at?: string
        }
        Update: {
          agency?: Database["public"]["Enums"]["inspection_agency"]
          agency_other_name?: string | null
          assay_results?: Json | null
          booked_by_company_id?: string
          booking_fee_usd?: number | null
          booking_reference?: string
          commodity_id?: string | null
          completed_at?: string | null
          created_at?: string
          draft_weight_mt?: number | null
          fee_paid?: boolean | null
          final_weight_mt?: number | null
          findings?: Json | null
          id?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          lc_id?: string | null
          port_code?: string | null
          price_adjustment_pct?: number | null
          quotation_id?: string | null
          report_summary?: string | null
          report_url?: string | null
          rfq_id?: string | null
          scheduled_date?: string | null
          site_location?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          supplier_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_bookings_booked_by_company_id_fkey"
            columns: ["booked_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_bookings_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_bookings_lc_id_fkey"
            columns: ["lc_id"]
            isOneToOne: false
            referencedRelation: "letters_of_credit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_bookings_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_bookings_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          lc_id: string
          presented_at: string
          presented_by: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          lc_id: string
          presented_at?: string
          presented_by?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          lc_id?: string
          presented_at?: string
          presented_by?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lc_documents_lc_id_fkey"
            columns: ["lc_id"]
            isOneToOne: false
            referencedRelation: "letters_of_credit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lc_documents_presented_by_fkey"
            columns: ["presented_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lc_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lc_state_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["lc_status"] | null
          id: string
          lc_id: string
          note: string | null
          to_status: Database["public"]["Enums"]["lc_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["lc_status"] | null
          id?: string
          lc_id: string
          note?: string | null
          to_status: Database["public"]["Enums"]["lc_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["lc_status"] | null
          id?: string
          lc_id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["lc_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lc_state_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lc_state_history_lc_id_fkey"
            columns: ["lc_id"]
            isOneToOne: false
            referencedRelation: "letters_of_credit"
            referencedColumns: ["id"]
          },
        ]
      }
      letters_of_credit: {
        Row: {
          advising_bank_name: string | null
          advising_bank_swift: string | null
          amount_usd: number
          applicant_company_id: string
          bank_lc_number: string | null
          beneficiary_company_id: string
          confirming_bank_name: string | null
          confirming_bank_swift: string | null
          created_at: string
          created_by: string | null
          currency: string
          discrepancies: Json | null
          documents_required: Json
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_bank_name: string | null
          issuing_bank_swift: string | null
          latest_shipment_date: string | null
          lc_reference: string
          lc_type: Database["public"]["Enums"]["lc_type"]
          presentation_days: number | null
          quotation_id: string | null
          rfq_id: string | null
          settled_amount_usd: number | null
          settled_at: string | null
          status: Database["public"]["Enums"]["lc_status"]
          tolerance_pct: number | null
          ucp_version: string
          updated_at: string
        }
        Insert: {
          advising_bank_name?: string | null
          advising_bank_swift?: string | null
          amount_usd: number
          applicant_company_id: string
          bank_lc_number?: string | null
          beneficiary_company_id: string
          confirming_bank_name?: string | null
          confirming_bank_swift?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discrepancies?: Json | null
          documents_required?: Json
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_bank_name?: string | null
          issuing_bank_swift?: string | null
          latest_shipment_date?: string | null
          lc_reference: string
          lc_type?: Database["public"]["Enums"]["lc_type"]
          presentation_days?: number | null
          quotation_id?: string | null
          rfq_id?: string | null
          settled_amount_usd?: number | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["lc_status"]
          tolerance_pct?: number | null
          ucp_version?: string
          updated_at?: string
        }
        Update: {
          advising_bank_name?: string | null
          advising_bank_swift?: string | null
          amount_usd?: number
          applicant_company_id?: string
          bank_lc_number?: string | null
          beneficiary_company_id?: string
          confirming_bank_name?: string | null
          confirming_bank_swift?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discrepancies?: Json | null
          documents_required?: Json
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_bank_name?: string | null
          issuing_bank_swift?: string | null
          latest_shipment_date?: string | null
          lc_reference?: string
          lc_type?: Database["public"]["Enums"]["lc_type"]
          presentation_days?: number | null
          quotation_id?: string | null
          rfq_id?: string | null
          settled_amount_usd?: number | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["lc_status"]
          tolerance_pct?: number | null
          ucp_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_of_credit_applicant_company_id_fkey"
            columns: ["applicant_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_of_credit_beneficiary_company_id_fkey"
            columns: ["beneficiary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_of_credit_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_of_credit_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_of_credit_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_zones: {
        Row: {
          base_delivery_fee: number | null
          boundaries: Json | null
          country_code: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          name: string
          per_km_fee: number | null
          region: string | null
          updated_at: string | null
          zone_type: string
        }
        Insert: {
          base_delivery_fee?: number | null
          boundaries?: Json | null
          country_code: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          per_km_fee?: number | null
          region?: string | null
          updated_at?: string | null
          zone_type: string
        }
        Update: {
          base_delivery_fee?: number | null
          boundaries?: Json | null
          country_code?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          per_km_fee?: number | null
          region?: string | null
          updated_at?: string | null
          zone_type?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          sender_company_id: string | null
          sender_name: string | null
          sender_role: string | null
          sender_user_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_company_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          sender_user_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_company_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_company_id_fkey"
            columns: ["sender_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean | null
          id: string
          in_app: boolean | null
          marketing: boolean | null
          message_alerts: boolean | null
          order_updates: boolean | null
          product_updates: boolean | null
          push: boolean | null
          rfq_updates: boolean | null
          settlement_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          marketing?: boolean | null
          message_alerts?: boolean | null
          order_updates?: boolean | null
          product_updates?: boolean | null
          push?: boolean | null
          rfq_updates?: boolean | null
          settlement_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          marketing?: boolean | null
          message_alerts?: boolean | null
          order_updates?: boolean | null
          product_updates?: boolean | null
          push?: boolean | null
          rfq_updates?: boolean | null
          settlement_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          company_id: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_freight_quotes: {
        Row: {
          assigned_to_user_id: string | null
          cargo_description: string | null
          cargo_ready_date: string | null
          container_type: Database["public"]["Enums"]["container_type"] | null
          converted_purchase_order_id: string | null
          converted_shipment_id: string | null
          cost_components: Json | null
          created_at: string
          created_by_user_id: string | null
          destination_country: string | null
          destination_port_id: string | null
          goods_currency: string | null
          goods_value: number | null
          hs_codes: string[] | null
          id: string
          is_fragile: boolean | null
          is_hazardous: boolean | null
          metadata: Json | null
          notes: string | null
          origin_country: string | null
          origin_port_id: string | null
          outcome_notes: string | null
          package_count: number | null
          quote_number: string
          quoted_amount: number | null
          quoted_currency: string | null
          requester_company: string | null
          requester_country: string | null
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          requester_type: Database["public"]["Enums"]["ops_quote_requester_type"]
          required_by: string | null
          requires_cold_chain: boolean | null
          responded_at: string | null
          screening_check_id: string | null
          sent_at: string | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          source_channel: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["ops_quote_status"]
          total_volume_cbm: number | null
          total_weight_kg: number | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          cargo_description?: string | null
          cargo_ready_date?: string | null
          container_type?: Database["public"]["Enums"]["container_type"] | null
          converted_purchase_order_id?: string | null
          converted_shipment_id?: string | null
          cost_components?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          destination_country?: string | null
          destination_port_id?: string | null
          goods_currency?: string | null
          goods_value?: number | null
          hs_codes?: string[] | null
          id?: string
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          metadata?: Json | null
          notes?: string | null
          origin_country?: string | null
          origin_port_id?: string | null
          outcome_notes?: string | null
          package_count?: number | null
          quote_number: string
          quoted_amount?: number | null
          quoted_currency?: string | null
          requester_company?: string | null
          requester_country?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          requester_type?: Database["public"]["Enums"]["ops_quote_requester_type"]
          required_by?: string | null
          requires_cold_chain?: boolean | null
          responded_at?: string | null
          screening_check_id?: string | null
          sent_at?: string | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          source_channel?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["ops_quote_status"]
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          cargo_description?: string | null
          cargo_ready_date?: string | null
          container_type?: Database["public"]["Enums"]["container_type"] | null
          converted_purchase_order_id?: string | null
          converted_shipment_id?: string | null
          cost_components?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          destination_country?: string | null
          destination_port_id?: string | null
          goods_currency?: string | null
          goods_value?: number | null
          hs_codes?: string[] | null
          id?: string
          is_fragile?: boolean | null
          is_hazardous?: boolean | null
          metadata?: Json | null
          notes?: string | null
          origin_country?: string | null
          origin_port_id?: string | null
          outcome_notes?: string | null
          package_count?: number | null
          quote_number?: string
          quoted_amount?: number | null
          quoted_currency?: string | null
          requester_company?: string | null
          requester_country?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          requester_type?: Database["public"]["Enums"]["ops_quote_requester_type"]
          required_by?: string | null
          requires_cold_chain?: boolean | null
          responded_at?: string | null
          screening_check_id?: string | null
          sent_at?: string | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          source_channel?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["ops_quote_status"]
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_freight_quotes_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_freight_quotes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_freight_quotes_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_freight_quotes_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_freight_quotes_screening_check_id_fkey"
            columns: ["screening_check_id"]
            isOneToOne: false
            referencedRelation: "screening_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      optimized_route_shipments: {
        Row: {
          created_at: string | null
          id: string
          optimized_route_id: string
          shipment_id: string
          stop_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          optimized_route_id: string
          shipment_id: string
          stop_order: number
        }
        Update: {
          created_at?: string | null
          id?: string
          optimized_route_id?: string
          shipment_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "optimized_route_shipments_optimized_route_id_fkey"
            columns: ["optimized_route_id"]
            isOneToOne: false
            referencedRelation: "optimized_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      optimized_routes: {
        Row: {
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          created_at: string | null
          driver_name: string | null
          estimated_fuel_cost: number | null
          estimated_fuel_liters: number | null
          id: string
          route_name: string
          run_id: string
          shipment_count: number | null
          status: string | null
          stops: Json
          total_distance_km: number | null
          total_duration_min: number | null
          total_volume_cbm: number | null
          total_weight_kg: number | null
          updated_at: string | null
          vehicle_reg: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_volume_utilization_pct: number | null
          vehicle_weight_utilization_pct: number | null
        }
        Insert: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          created_at?: string | null
          driver_name?: string | null
          estimated_fuel_cost?: number | null
          estimated_fuel_liters?: number | null
          id?: string
          route_name: string
          run_id: string
          shipment_count?: number | null
          status?: string | null
          stops?: Json
          total_distance_km?: number | null
          total_duration_min?: number | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          vehicle_reg?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_volume_utilization_pct?: number | null
          vehicle_weight_utilization_pct?: number | null
        }
        Update: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          created_at?: string | null
          driver_name?: string | null
          estimated_fuel_cost?: number | null
          estimated_fuel_liters?: number | null
          id?: string
          route_name?: string
          run_id?: string
          shipment_count?: number | null
          status?: string | null
          stops?: Json
          total_distance_km?: number | null
          total_duration_min?: number | null
          total_volume_cbm?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          vehicle_reg?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_volume_utilization_pct?: number | null
          vehicle_weight_utilization_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "optimized_routes_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_routes_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_routes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "route_optimization_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          from_status: Database["public"]["Enums"]["b2b_order_status"] | null
          id: string
          reason: string | null
          supplier_order_id: string
          to_status: Database["public"]["Enums"]["b2b_order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["b2b_order_status"] | null
          id?: string
          reason?: string | null
          supplier_order_id: string
          to_status: Database["public"]["Enums"]["b2b_order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["b2b_order_status"] | null
          id?: string
          reason?: string | null
          supplier_order_id?: string
          to_status?: Database["public"]["Enums"]["b2b_order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_last4: string | null
          company_id: string | null
          created_at: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string | null
          mobile_money_country: string | null
          mobile_money_phone: string | null
          mobile_money_provider: string | null
          stripe_payment_method_id: string | null
          user_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          mobile_money_country?: string | null
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          stripe_payment_method_id?: string | null
          user_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string | null
          gateway?: Database["public"]["Enums"]["payment_gateway"]
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          mobile_money_country?: string | null
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          stripe_payment_method_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          alipay_trade_no: string | null
          amount: number
          amount_in_usd: number | null
          balance_due_at: string | null
          created_at: string | null
          currency: string
          deposit_amount: number | null
          deposit_paid_at: string | null
          exchange_rate: number | null
          expires_at: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_transaction_id: string | null
          id: string
          mobile_money_phone: string | null
          mobile_money_provider: string | null
          mobile_money_reference: string | null
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null
          purchase_order_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          supplier_order_id: string | null
          updated_at: string | null
          webhook_events: Json[] | null
          wechat_prepay_id: string | null
          wechat_transaction_id: string | null
        }
        Insert: {
          alipay_trade_no?: string | null
          amount: number
          amount_in_usd?: number | null
          balance_due_at?: string | null
          created_at?: string | null
          currency: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_transaction_id?: string | null
          id?: string
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          mobile_money_reference?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          purchase_order_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          supplier_order_id?: string | null
          updated_at?: string | null
          webhook_events?: Json[] | null
          wechat_prepay_id?: string | null
          wechat_transaction_id?: string | null
        }
        Update: {
          alipay_trade_no?: string | null
          amount?: number
          amount_in_usd?: number | null
          balance_due_at?: string | null
          created_at?: string | null
          currency?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
          gateway?: Database["public"]["Enums"]["payment_gateway"]
          gateway_transaction_id?: string | null
          id?: string
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          mobile_money_reference?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          purchase_order_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          supplier_order_id?: string | null
          updated_at?: string | null
          webhook_events?: Json[] | null
          wechat_prepay_id?: string | null
          wechat_transaction_id?: string | null
        }
        Relationships: []
      }
      platform_wallets: {
        Row: {
          balance: number | null
          company_id: string
          currency: string
          held_balance: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          company_id: string
          currency: string
          held_balance?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          company_id?: string
          currency?: string
          held_balance?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ports: {
        Row: {
          city: string | null
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean | null
          is_destination: boolean | null
          is_origin: boolean | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          name: string
          port_type: Database["public"]["Enums"]["port_type"]
          region: Database["public"]["Enums"]["market_region"] | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          code: string
          country: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_destination?: boolean | null
          is_origin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          port_type?: Database["public"]["Enums"]["port_type"]
          region?: Database["public"]["Enums"]["market_region"] | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_destination?: boolean | null
          is_origin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          port_type?: Database["public"]["Enums"]["port_type"]
          region?: Database["public"]["Enums"]["market_region"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_certifications: {
        Row: {
          cert_number: string | null
          cert_type: string
          created_at: string | null
          document_url: string | null
          id: string
          product_id: string
          valid_until: string | null
        }
        Insert: {
          cert_number?: string | null
          cert_type: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          product_id: string
          valid_until?: string | null
        }
        Update: {
          cert_number?: string | null
          cert_type?: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          product_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_certifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing_tiers: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          max_quantity: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_override: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          box_pack_qty: number | null
          brand: string | null
          category_id: string | null
          cogs: number | null
          compare_price: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          dimensions_cm: Json | null
          hs_code: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          jan_code: string | null
          lead_time_days: number | null
          legal_category: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          moq: number | null
          name: string
          name_local: string | null
          origin_country: string | null
          sample_available: boolean | null
          sample_moq: number | null
          sample_price: number | null
          scent: string | null
          search_vector: unknown
          shelf_life_days: number | null
          shipping_mode: string | null
          skin_hair_type: string | null
          slug: string
          storage_instructions: string | null
          supplier_id: string
          target_audience: string | null
          texture: string | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          usage_instructions: string | null
          warnings: string | null
          weight_kg: number | null
        }
        Insert: {
          base_price: number
          box_pack_qty?: number | null
          brand?: string | null
          category_id?: string | null
          cogs?: number | null
          compare_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dimensions_cm?: Json | null
          hs_code?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          jan_code?: string | null
          lead_time_days?: number | null
          legal_category?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          moq?: number | null
          name: string
          name_local?: string | null
          origin_country?: string | null
          sample_available?: boolean | null
          sample_moq?: number | null
          sample_price?: number | null
          scent?: string | null
          search_vector?: unknown
          shelf_life_days?: number | null
          shipping_mode?: string | null
          skin_hair_type?: string | null
          slug: string
          storage_instructions?: string | null
          supplier_id: string
          target_audience?: string | null
          texture?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          usage_instructions?: string | null
          warnings?: string | null
          weight_kg?: number | null
        }
        Update: {
          base_price?: number
          box_pack_qty?: number | null
          brand?: string | null
          category_id?: string | null
          cogs?: number | null
          compare_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dimensions_cm?: Json | null
          hs_code?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          jan_code?: string | null
          lead_time_days?: number | null
          legal_category?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          moq?: number | null
          name?: string
          name_local?: string | null
          origin_country?: string | null
          sample_available?: boolean | null
          sample_moq?: number | null
          sample_price?: number | null
          scent?: string | null
          search_vector?: unknown
          shelf_life_days?: number | null
          shipping_mode?: string | null
          skin_hair_type?: string | null
          slug?: string
          storage_instructions?: string | null
          supplier_id?: string
          target_audience?: string | null
          texture?: string | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          usage_instructions?: string | null
          warnings?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      promoted_listings: {
        Row: {
          billing_type: string | null
          clicks: number | null
          created_at: string | null
          currency: string | null
          daily_budget: number | null
          ends_at: string
          id: string
          impressions: number | null
          inquiries: number | null
          is_active: boolean | null
          placement: string
          priority: number | null
          product_id: string
          starts_at: string
          supplier_id: string
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          billing_type?: string | null
          clicks?: number | null
          created_at?: string | null
          currency?: string | null
          daily_budget?: number | null
          ends_at: string
          id?: string
          impressions?: number | null
          inquiries?: number | null
          is_active?: boolean | null
          placement?: string
          priority?: number | null
          product_id: string
          starts_at?: string
          supplier_id: string
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_type?: string | null
          clicks?: number | null
          created_at?: string | null
          currency?: string | null
          daily_budget?: number | null
          ends_at?: string
          id?: string
          impressions?: number | null
          inquiries?: number | null
          is_active?: boolean | null
          placement?: string
          priority?: number | null
          product_id?: string
          starts_at?: string
          supplier_id?: string
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoted_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoted_listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_usage: {
        Row: {
          created_at: string | null
          id: string
          month_start: string
          promotions_limit: number
          promotions_used: number | null
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_start: string
          promotions_limit: number
          promotions_used?: number | null
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_start?: string
          promotions_limit?: number
          promotions_used?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_company_id: string | null
          buyer_company_name: string | null
          buyer_tax_id: string | null
          buyer_user_id: string
          cost_components: Json | null
          created_at: string
          currency: string | null
          default_invoice_type:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id: string
          market_region: Database["public"]["Enums"]["market_region"] | null
          metadata: Json | null
          note: string | null
          order_number: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount: number | null
          total_shipping: number | null
          total_tax: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id?: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total?: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders_2026q2: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_company_id: string | null
          buyer_company_name: string | null
          buyer_tax_id: string | null
          buyer_user_id: string
          cost_components: Json | null
          created_at: string
          currency: string | null
          default_invoice_type:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id: string
          market_region: Database["public"]["Enums"]["market_region"] | null
          metadata: Json | null
          note: string | null
          order_number: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount: number | null
          total_shipping: number | null
          total_tax: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id?: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total?: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders_2026q3: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_company_id: string | null
          buyer_company_name: string | null
          buyer_tax_id: string | null
          buyer_user_id: string
          cost_components: Json | null
          created_at: string
          currency: string | null
          default_invoice_type:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id: string
          market_region: Database["public"]["Enums"]["market_region"] | null
          metadata: Json | null
          note: string | null
          order_number: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount: number | null
          total_shipping: number | null
          total_tax: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id?: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total?: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders_2026q4: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_company_id: string | null
          buyer_company_name: string | null
          buyer_tax_id: string | null
          buyer_user_id: string
          cost_components: Json | null
          created_at: string
          currency: string | null
          default_invoice_type:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id: string
          market_region: Database["public"]["Enums"]["market_region"] | null
          metadata: Json | null
          note: string | null
          order_number: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount: number | null
          total_shipping: number | null
          total_tax: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_tax_id?: string | null
          buyer_user_id?: string
          cost_components?: Json | null
          created_at?: string
          currency?: string | null
          default_invoice_type?:
            | Database["public"]["Enums"]["b2b_invoice_type"]
            | null
          grand_total?: number
          id?: string
          market_region?: Database["public"]["Enums"]["market_region"] | null
          metadata?: Json | null
          note?: string | null
          order_number?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          total_discount?: number | null
          total_shipping?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          quotation_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          quotation_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          quotation_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_attachments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          lead_time_days: number | null
          moq: number | null
          product_id: string | null
          product_name: string
          quantity: number
          quotation_id: string
          rfq_item_id: string | null
          sort_order: number | null
          specifications: Json | null
          total_price: number
          unit: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          lead_time_days?: number | null
          moq?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          quotation_id: string
          rfq_item_id?: string | null
          sort_order?: number | null
          specifications?: Json | null
          total_price: number
          unit?: string | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          lead_time_days?: number | null
          moq?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quotation_id?: string
          rfq_item_id?: string | null
          sort_order?: number | null
          specifications?: Json | null
          total_price?: number
          unit?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          buyer_feedback: string | null
          buyer_rating: number | null
          cost_components: Json | null
          created_at: string | null
          currency: string | null
          id: string
          inspection_agency: string | null
          lead_time_days: number | null
          moq: number | null
          notes: string | null
          parent_quotation_id: string | null
          payment_instrument: string | null
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null
          port_of_discharge: string | null
          port_of_loading: string | null
          quantity_numeric: number | null
          quotation_number: string
          rfq_id: string
          shipment_window_end: string | null
          shipment_window_start: string | null
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          status: Database["public"]["Enums"]["quotation_status"] | null
          submitted_at: string | null
          supplier_id: string
          supplier_name: string | null
          supplier_user_id: string
          terms_and_conditions: string | null
          total_amount: number
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          unit_of_measure: string | null
          unit_price_usd: number | null
          updated_at: string | null
          valid_until: string | null
          validity_days: number | null
          version: number | null
        }
        Insert: {
          buyer_feedback?: string | null
          buyer_rating?: number | null
          cost_components?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          inspection_agency?: string | null
          lead_time_days?: number | null
          moq?: number | null
          notes?: string | null
          parent_quotation_id?: string | null
          payment_instrument?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          quantity_numeric?: number | null
          quotation_number: string
          rfq_id: string
          shipment_window_end?: string | null
          shipment_window_start?: string | null
          shipping_cost?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          submitted_at?: string | null
          supplier_id: string
          supplier_name?: string | null
          supplier_user_id: string
          terms_and_conditions?: string | null
          total_amount: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit_of_measure?: string | null
          unit_price_usd?: number | null
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Update: {
          buyer_feedback?: string | null
          buyer_rating?: number | null
          cost_components?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          inspection_agency?: string | null
          lead_time_days?: number | null
          moq?: number | null
          notes?: string | null
          parent_quotation_id?: string | null
          payment_instrument?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          quantity_numeric?: number | null
          quotation_number?: string
          rfq_id?: string
          shipment_window_end?: string | null
          shipment_window_start?: string | null
          shipping_cost?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          submitted_at?: string | null
          supplier_id?: string
          supplier_name?: string | null
          supplier_user_id?: string
          terms_and_conditions?: string | null
          total_amount?: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit_of_measure?: string | null
          unit_price_usd?: number | null
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_user_id_fkey"
            columns: ["supplier_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_locks: {
        Row: {
          converted_amount: number
          created_at: string | null
          exchange_rate: number
          expires_at: string
          from_currency: string
          id: string
          locked_at: string
          original_amount: number
          purchase_order_id: string | null
          rate_source: string | null
          status: string | null
          to_currency: string
          used_at: string | null
          user_id: string
          validity_minutes: number | null
        }
        Insert: {
          converted_amount: number
          created_at?: string | null
          exchange_rate: number
          expires_at: string
          from_currency: string
          id?: string
          locked_at?: string
          original_amount: number
          purchase_order_id?: string | null
          rate_source?: string | null
          status?: string | null
          to_currency: string
          used_at?: string | null
          user_id: string
          validity_minutes?: number | null
        }
        Update: {
          converted_amount?: number
          created_at?: string | null
          exchange_rate?: number
          expires_at?: string
          from_currency?: string
          id?: string
          locked_at?: string
          original_amount?: number
          purchase_order_id?: string | null
          rate_source?: string | null
          status?: string | null
          to_currency?: string
          used_at?: string | null
          user_id?: string
          validity_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_processing_log: {
        Row: {
          completed_at: string | null
          created_at: string
          currency: string
          dispute_id: string | null
          error_message: string | null
          external_refund_id: string | null
          gateway: string
          id: string
          initiated_by: string | null
          order_id: string | null
          original_payment_id: string | null
          refund_amount: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          currency: string
          dispute_id?: string | null
          error_message?: string | null
          external_refund_id?: string | null
          gateway: string
          id?: string
          initiated_by?: string | null
          order_id?: string | null
          original_payment_id?: string | null
          refund_amount: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          currency?: string
          dispute_id?: string | null
          error_message?: string | null
          external_refund_id?: string | null
          gateway?: string
          id?: string
          initiated_by?: string | null
          order_id?: string | null
          original_payment_id?: string | null
          refund_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_processing_log_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_processing_log_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_processing_log_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string
          group_code: string
          hs_prefix: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_fr: string | null
          name_zh: string | null
          parent_id: string | null
          requires_assay: boolean | null
          requires_cites: boolean | null
          requires_gacc: boolean | null
          requires_kimberley: boolean | null
          requires_oecd_3tg: boolean | null
          requires_phytosanitary: boolean | null
          slug: string
          sort_order: number | null
          spec_schema: Json | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_code: string
          hs_prefix?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_fr?: string | null
          name_zh?: string | null
          parent_id?: string | null
          requires_assay?: boolean | null
          requires_cites?: boolean | null
          requires_gacc?: boolean | null
          requires_kimberley?: boolean | null
          requires_oecd_3tg?: boolean | null
          requires_phytosanitary?: boolean | null
          slug: string
          sort_order?: number | null
          spec_schema?: Json | null
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_code?: string
          hs_prefix?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_fr?: string | null
          name_zh?: string | null
          parent_id?: string | null
          requires_assay?: boolean | null
          requires_cites?: boolean | null
          requires_gacc?: boolean | null
          requires_kimberley?: boolean | null
          requires_oecd_3tg?: boolean | null
          requires_phytosanitary?: boolean | null
          slug?: string
          sort_order?: number | null
          spec_schema?: Json | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          communication_rating: number | null
          content: string | null
          created_at: string | null
          id: string
          images: string[] | null
          is_verified_purchase: boolean | null
          is_visible: boolean | null
          product_quality_rating: number | null
          rating: number
          reviewer_company_id: string
          reviewer_user_id: string
          shipping_rating: number | null
          supplier_company_id: string
          supplier_order_id: string
          supplier_responded_at: string | null
          supplier_response: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          communication_rating?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          is_visible?: boolean | null
          product_quality_rating?: number | null
          rating: number
          reviewer_company_id: string
          reviewer_user_id: string
          shipping_rating?: number | null
          supplier_company_id: string
          supplier_order_id: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          communication_rating?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          is_visible?: boolean | null
          product_quality_rating?: number | null
          rating?: number
          reviewer_company_id?: string
          reviewer_user_id?: string
          shipping_rating?: number | null
          supplier_company_id?: string
          supplier_order_id?: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_company_id_fkey"
            columns: ["reviewer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_activity_log: {
        Row: {
          action: string
          actor_company_id: string | null
          actor_user_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          quotation_id: string | null
          rfq_id: string
        }
        Insert: {
          action: string
          actor_company_id?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          quotation_id?: string | null
          rfq_id: string
        }
        Update: {
          action?: string
          actor_company_id?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          quotation_id?: string | null
          rfq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_activity_log_actor_company_id_fkey"
            columns: ["actor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_activity_log_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_activity_log_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          rfq_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          rfq_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          rfq_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_attachments_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          hs_code: string | null
          id: string
          product_name: string
          quantity: number
          reference_image_url: string | null
          rfq_id: string
          sort_order: number | null
          specifications: Json | null
          target_unit_price: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: string
          product_name: string
          quantity: number
          reference_image_url?: string | null
          rfq_id: string
          sort_order?: number | null
          specifications?: Json | null
          target_unit_price?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: string
          product_name?: string
          quantity?: number
          reference_image_url?: string | null
          rfq_id?: string
          sort_order?: number | null
          specifications?: Json | null
          target_unit_price?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          awarded_at: string | null
          awarded_quotation_id: string | null
          buyer_company_id: string | null
          buyer_company_name: string | null
          buyer_country: string | null
          buyer_user_id: string
          category_id: string | null
          certifications_required: string[] | null
          commodity_id: string | null
          converted_order_id: string | null
          created_at: string | null
          deadline: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_country: string | null
          description: string | null
          id: string
          invited_supplier_ids: string[] | null
          is_public: boolean | null
          matched_supplier_count: number | null
          max_quotations: number | null
          payment_instrument: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          published_at: string | null
          quantity: number
          quantity_numeric: number | null
          quotation_count: number | null
          required_by: string | null
          resource_category_id: string | null
          rfq_number: string
          sample_required: boolean | null
          shipment_window_end: string | null
          shipment_window_start: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["rfq_status"] | null
          target_currency: string | null
          target_price: number | null
          title: string
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          unit: string | null
          unit_of_measure: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_quotation_id?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_country?: string | null
          buyer_user_id: string
          category_id?: string | null
          certifications_required?: string[] | null
          commodity_id?: string | null
          converted_order_id?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          description?: string | null
          id?: string
          invited_supplier_ids?: string[] | null
          is_public?: boolean | null
          matched_supplier_count?: number | null
          max_quotations?: number | null
          payment_instrument?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          published_at?: string | null
          quantity: number
          quantity_numeric?: number | null
          quotation_count?: number | null
          required_by?: string | null
          resource_category_id?: string | null
          rfq_number: string
          sample_required?: boolean | null
          shipment_window_end?: string | null
          shipment_window_start?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["rfq_status"] | null
          target_currency?: string | null
          target_price?: number | null
          title: string
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          awarded_at?: string | null
          awarded_quotation_id?: string | null
          buyer_company_id?: string | null
          buyer_company_name?: string | null
          buyer_country?: string | null
          buyer_user_id?: string
          category_id?: string | null
          certifications_required?: string[] | null
          commodity_id?: string | null
          converted_order_id?: string | null
          created_at?: string | null
          deadline?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          description?: string | null
          id?: string
          invited_supplier_ids?: string[] | null
          is_public?: boolean | null
          matched_supplier_count?: number | null
          max_quotations?: number | null
          payment_instrument?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          published_at?: string | null
          quantity?: number
          quantity_numeric?: number | null
          quotation_count?: number | null
          required_by?: string | null
          resource_category_id?: string | null
          rfq_number?: string
          sample_required?: boolean | null
          shipment_window_end?: string | null
          shipment_window_start?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["rfq_status"] | null
          target_currency?: string | null
          target_price?: number | null
          title?: string
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_resource_category_id_fkey"
            columns: ["resource_category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      route_optimization_runs: {
        Row: {
          avg_vehicle_utilization_pct: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          date: string
          estimated_fuel_cost: number | null
          fuel_currency: string | null
          id: string
          optimization_notes: string | null
          routes_created: number | null
          shipment_count: number
          status: string
          strategy: string
          total_distance_km: number | null
          total_duration_min: number | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          avg_vehicle_utilization_pct?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          estimated_fuel_cost?: number | null
          fuel_currency?: string | null
          id?: string
          optimization_notes?: string | null
          routes_created?: number | null
          shipment_count?: number
          status?: string
          strategy?: string
          total_distance_km?: number | null
          total_duration_min?: number | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          avg_vehicle_utilization_pct?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          estimated_fuel_cost?: number | null
          fuel_currency?: string | null
          id?: string
          optimization_notes?: string | null
          routes_created?: number | null
          shipment_count?: number
          status?: string
          strategy?: string
          total_distance_km?: number | null
          total_duration_min?: number | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_optimization_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_optimization_runs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_job_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          job_type: string
          metadata: Json | null
          next_scheduled_run: string | null
          rows_affected: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          job_type?: string
          metadata?: Json | null
          next_scheduled_run?: string | null
          rows_affected?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          job_type?: string
          metadata?: Json | null
          next_scheduled_run?: string | null
          rows_affected?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      screening_checks: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["screening_decision"] | null
          decision_notes: string | null
          id: string
          matches: Json | null
          provider: string
          query: Json
          result: Database["public"]["Enums"]["screening_result"]
          reviewed_at: string | null
          reviewed_by: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["screening_subject_type"]
          top_score: number | null
        }
        Insert: {
          created_at?: string
          decision?: Database["public"]["Enums"]["screening_decision"] | null
          decision_notes?: string | null
          id?: string
          matches?: Json | null
          provider: string
          query: Json
          result: Database["public"]["Enums"]["screening_result"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["screening_subject_type"]
          top_score?: number | null
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["screening_decision"] | null
          decision_notes?: string | null
          id?: string
          matches?: Json | null
          provider?: string
          query?: Json
          result?: Database["public"]["Enums"]["screening_result"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["screening_subject_type"]
          top_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_checks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string | null
          currency: string | null
          gross_sales: number
          id: string
          line_items: Json | null
          logistics_charges: number | null
          mobile_money_phone: string | null
          mobile_money_provider: string | null
          net_payout: number
          paid_at: string | null
          payout_method: string | null
          payout_reference: string | null
          period_end: string
          period_start: string
          settlement_number: string
          status: Database["public"]["Enums"]["settlement_status"] | null
          stripe_transfer_id: string | null
          supplier_id: string
          supplier_order_ids: string[] | null
          total_commission: number
          total_tax_on_commission: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          gross_sales: number
          id?: string
          line_items?: Json | null
          logistics_charges?: number | null
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          net_payout: number
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end: string
          period_start: string
          settlement_number: string
          status?: Database["public"]["Enums"]["settlement_status"] | null
          stripe_transfer_id?: string | null
          supplier_id: string
          supplier_order_ids?: string[] | null
          total_commission: number
          total_tax_on_commission?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          gross_sales?: number
          id?: string
          line_items?: Json | null
          logistics_charges?: number | null
          mobile_money_phone?: string | null
          mobile_money_provider?: string | null
          net_payout?: number
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          period_end?: string
          period_start?: string
          settlement_number?: string
          status?: Database["public"]["Enums"]["settlement_status"] | null
          stripe_transfer_id?: string | null
          supplier_id?: string
          supplier_order_ids?: string[] | null
          total_commission?: number
          total_tax_on_commission?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_exceptions: {
        Row: {
          created_at: string
          description: string | null
          exception_type: string
          id: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exception_type: string
          id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exception_type?: string
          id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_exceptions_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          created_at: string | null
          id: string
          quantity_shipped: number
          shipment_id: string
          supplier_order_item_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity_shipped: number
          shipment_id: string
          supplier_order_item_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity_shipped?: number
          shipment_id?: string
          supplier_order_item_id?: string
        }
        Relationships: []
      }
      shipment_sla_tracking: {
        Row: {
          actual_delivery_date: string | null
          created_at: string
          days_variance: number | null
          destination_country: string | null
          id: string
          origin_country: string | null
          promised_delivery_date: string | null
          shipment_id: string
          shipping_method: string | null
          sla_met: boolean | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string
          days_variance?: number | null
          destination_country?: string | null
          id?: string
          origin_country?: string | null
          promised_delivery_date?: string | null
          shipment_id: string
          shipping_method?: string | null
          sla_met?: boolean | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string
          days_variance?: number | null
          destination_country?: string | null
          id?: string
          origin_country?: string | null
          promised_delivery_date?: string | null
          shipment_id?: string
          shipping_method?: string | null
          sla_met?: boolean | null
        }
        Relationships: []
      }
      shipment_tracking_events: {
        Row: {
          created_at: string | null
          description: string | null
          driver_id: string | null
          event_type: string
          external_event_id: string | null
          id: string
          location: Json | null
          photo_url: string | null
          shipment_id: string
          source_adapter_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          event_type: string
          external_event_id?: string | null
          id?: string
          location?: Json | null
          photo_url?: string | null
          shipment_id: string
          source_adapter_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          location?: Json | null
          photo_url?: string | null
          shipment_id?: string
          source_adapter_id?: string | null
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          base_rate: number
          created_at: string | null
          currency: string | null
          destination_zone_id: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          free_shipping_threshold: number | null
          id: string
          is_active: boolean | null
          max_weight_kg: number | null
          min_charge: number | null
          min_weight_kg: number | null
          per_cbm_rate: number | null
          per_kg_rate: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          base_rate: number
          created_at?: string | null
          currency?: string | null
          destination_zone_id?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_weight_kg?: number | null
          min_charge?: number | null
          min_weight_kg?: number | null
          per_cbm_rate?: number | null
          per_kg_rate?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          base_rate?: number
          created_at?: string | null
          currency?: string | null
          destination_zone_id?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_weight_kg?: number | null
          min_charge?: number | null
          min_weight_kg?: number | null
          per_cbm_rate?: number | null
          per_kg_rate?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_destination_zone_id_fkey"
            columns: ["destination_zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          amount: number | null
          billing_period_end: string | null
          billing_period_start: string | null
          company_id: string
          created_at: string
          currency: string | null
          event_type: string
          failure_reason: string | null
          id: string
          metadata: Json | null
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
          tier_from: string | null
          tier_to: string | null
        }
        Insert: {
          amount?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          event_type: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          tier_from?: string | null
          tier_to?: string | null
        }
        Update: {
          amount?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          tier_from?: string | null
          tier_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_applications: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          certifications: string | null
          city: string | null
          company_name: string
          company_name_local: string | null
          country_code: string | null
          created_at: string
          email: string
          employee_range: string | null
          existing_markets: string | null
          full_name: string
          id: string
          locale: string | null
          monthly_capacity: string | null
          phone: string | null
          product_categories: string[] | null
          products_description: string
          requester_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_at_company: string | null
          sample_available: boolean | null
          source_path: string | null
          status: string
          updated_at: string
          user_agent: string | null
          website: string | null
          years_in_business: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          certifications?: string | null
          city?: string | null
          company_name: string
          company_name_local?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          employee_range?: string | null
          existing_markets?: string | null
          full_name: string
          id?: string
          locale?: string | null
          monthly_capacity?: string | null
          phone?: string | null
          product_categories?: string[] | null
          products_description: string
          requester_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_company?: string | null
          sample_available?: boolean | null
          source_path?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          certifications?: string | null
          city?: string | null
          company_name?: string
          company_name_local?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          employee_range?: string | null
          existing_markets?: string | null
          full_name?: string
          id?: string
          locale?: string | null
          monthly_capacity?: string | null
          phone?: string | null
          product_categories?: string[] | null
          products_description?: string
          requester_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_company?: string | null
          sample_available?: boolean | null
          source_path?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_applications_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_items: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          product_id: string
          product_name: string
          quantity: number
          sku: string | null
          subtotal: number
          supplier_order_id: string
          tax_amount: number | null
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          product_name: string
          quantity: number
          sku?: string | null
          subtotal: number
          supplier_order_id: string
          tax_amount?: number | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          product_name?: string
          quantity?: number
          sku?: string | null
          subtotal?: number
          supplier_order_id?: string
          tax_amount?: number | null
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: []
      }
      supplier_orders: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          estimated_ship_date: string | null
          gateway_transaction_id: string | null
          id: string
          note: string | null
          order_number: string
          payment_gateway: Database["public"]["Enums"]["payment_gateway"] | null
          purchase_order_id: string
          recipient_name: string | null
          recipient_phone: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_gps: Json | null
          ship_to_landmark: string | null
          shipping_fee: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          total_amount: number
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount?: number | null
          total_amount: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number?: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_orders_2026q2: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          estimated_ship_date: string | null
          gateway_transaction_id: string | null
          id: string
          note: string | null
          order_number: string
          payment_gateway: Database["public"]["Enums"]["payment_gateway"] | null
          purchase_order_id: string
          recipient_name: string | null
          recipient_phone: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_gps: Json | null
          ship_to_landmark: string | null
          shipping_fee: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          total_amount: number
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount?: number | null
          total_amount: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number?: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_orders_2026q3: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          estimated_ship_date: string | null
          gateway_transaction_id: string | null
          id: string
          note: string | null
          order_number: string
          payment_gateway: Database["public"]["Enums"]["payment_gateway"] | null
          purchase_order_id: string
          recipient_name: string | null
          recipient_phone: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_gps: Json | null
          ship_to_landmark: string | null
          shipping_fee: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          total_amount: number
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount?: number | null
          total_amount: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number?: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_orders_2026q4: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          estimated_ship_date: string | null
          gateway_transaction_id: string | null
          id: string
          note: string | null
          order_number: string
          payment_gateway: Database["public"]["Enums"]["payment_gateway"] | null
          purchase_order_id: string
          recipient_name: string | null
          recipient_phone: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_gps: Json | null
          ship_to_landmark: string | null
          shipping_fee: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          status: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          total_amount: number
          trade_term: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal: number
          supplier_id: string
          tax_amount?: number | null
          total_amount: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          estimated_ship_date?: string | null
          gateway_transaction_id?: string | null
          id?: string
          note?: string | null
          order_number?: string
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          purchase_order_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_gps?: Json | null
          ship_to_landmark?: string | null
          shipping_fee?: number | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          status?: Database["public"]["Enums"]["b2b_order_status"] | null
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number
          trade_term?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_profiles: {
        Row: {
          average_rating: number | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_code: string | null
          business_license_url: string | null
          categories: string[] | null
          certifications: string[] | null
          commission_rate: number | null
          company_id: string
          created_at: string | null
          factory_address: string | null
          factory_city: string | null
          factory_country: string | null
          id: string
          lead_time_days_default: number | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          moq_default: number | null
          on_time_delivery_rate: number | null
          response_rate: number | null
          stripe_account_id: string | null
          tier: Database["public"]["Enums"]["supplier_tier"] | null
          tier_expires_at: string | null
          total_orders: number | null
          total_revenue: number | null
          trade_terms_default: Database["public"]["Enums"]["trade_term"] | null
          updated_at: string | null
          warehouse_addresses: Json | null
        }
        Insert: {
          average_rating?: number | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          business_license_url?: string | null
          categories?: string[] | null
          certifications?: string[] | null
          commission_rate?: number | null
          company_id: string
          created_at?: string | null
          factory_address?: string | null
          factory_city?: string | null
          factory_country?: string | null
          id?: string
          lead_time_days_default?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          moq_default?: number | null
          on_time_delivery_rate?: number | null
          response_rate?: number | null
          stripe_account_id?: string | null
          tier?: Database["public"]["Enums"]["supplier_tier"] | null
          tier_expires_at?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          trade_terms_default?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          warehouse_addresses?: Json | null
        }
        Update: {
          average_rating?: number | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          business_license_url?: string | null
          categories?: string[] | null
          certifications?: string[] | null
          commission_rate?: number | null
          company_id?: string
          created_at?: string | null
          factory_address?: string | null
          factory_city?: string | null
          factory_country?: string | null
          id?: string
          lead_time_days_default?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          moq_default?: number | null
          on_time_delivery_rate?: number | null
          response_rate?: number | null
          stripe_account_id?: string | null
          tier?: Database["public"]["Enums"]["supplier_tier"] | null
          tier_expires_at?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          trade_terms_default?: Database["public"]["Enums"]["trade_term"] | null
          updated_at?: string | null
          warehouse_addresses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_activity_log: {
        Row: {
          activity_type: Database["public"]["Enums"]["system_activity_type"]
          actor_email: string | null
          actor_id: string | null
          created_at: string
          description: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["system_activity_type"]
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["system_activity_type"]
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          metadata: Json | null
          request_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          metadata?: Json | null
          request_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          metadata?: Json | null
          request_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_rates: {
        Row: {
          created_at: string
          destination_country: string
          duty_pct: number | null
          effective_from: string | null
          effective_to: string | null
          excise_pct: number | null
          hs_prefix: string
          id: string
          is_active: boolean | null
          notes: string | null
          other_fees: Json | null
          preferential_origin_countries: string[] | null
          preferential_rate_pct: number | null
          provider: string | null
          source: Database["public"]["Enums"]["rate_source"]
          updated_at: string | null
          vat_pct: number | null
        }
        Insert: {
          created_at?: string
          destination_country: string
          duty_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          excise_pct?: number | null
          hs_prefix: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          other_fees?: Json | null
          preferential_origin_countries?: string[] | null
          preferential_rate_pct?: number | null
          provider?: string | null
          source?: Database["public"]["Enums"]["rate_source"]
          updated_at?: string | null
          vat_pct?: number | null
        }
        Update: {
          created_at?: string
          destination_country?: string
          duty_pct?: number | null
          effective_from?: string | null
          effective_to?: string | null
          excise_pct?: number | null
          hs_prefix?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          other_fees?: Json | null
          preferential_origin_countries?: string[] | null
          preferential_rate_pct?: number | null
          provider?: string | null
          source?: Database["public"]["Enums"]["rate_source"]
          updated_at?: string | null
          vat_pct?: number | null
        }
        Relationships: []
      }
      tax_exemption_certificates: {
        Row: {
          certificate_number: string
          certificate_type: string
          company_id: string
          created_at: string | null
          document_url: string | null
          id: string
          is_verified: boolean | null
          issuing_authority: string | null
          valid_from: string
          valid_until: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_number: string
          certificate_type: string
          company_id: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          is_verified?: boolean | null
          issuing_authority?: string | null
          valid_from: string
          valid_until: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_number?: string
          certificate_type?: string
          company_id?: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          is_verified?: boolean | null
          issuing_authority?: string | null
          valid_from?: string
          valid_until?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_exemption_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_exemption_certificates_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          category: string | null
          country_code: string
          created_at: string | null
          description: string | null
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          rate: number
          region: string | null
          tax_name: string
          tax_type: string
        }
        Insert: {
          category?: string | null
          country_code: string
          created_at?: string | null
          description?: string | null
          effective_from: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          rate: number
          region?: string | null
          tax_name: string
          tax_type: string
        }
        Update: {
          category?: string | null
          country_code?: string
          created_at?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          rate?: number
          region?: string | null
          tax_name?: string
          tax_type?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_id: string
          avatar_url: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          company_id: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: unknown
          is_active: boolean
          is_suspicious: boolean
          last_activity_at: string | null
          logged_in_at: string
          logged_out_at: string | null
          suspicious_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          is_suspicious?: boolean
          last_activity_at?: string | null
          logged_in_at?: string
          logged_out_at?: string | null
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          is_suspicious?: boolean
          last_activity_at?: string | null
          logged_in_at?: string
          logged_out_at?: string | null
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity_cbm: number | null
          capacity_kg: number | null
          created_at: string | null
          current_location: Json | null
          fuel_type: string | null
          id: string
          last_maintenance_date: string | null
          make: string | null
          model: string | null
          registration_number: string
          status: string | null
          updated_at: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          warehouse_id: string | null
          year: number | null
        }
        Insert: {
          capacity_cbm?: number | null
          capacity_kg?: number | null
          created_at?: string | null
          current_location?: Json | null
          fuel_type?: string | null
          id?: string
          last_maintenance_date?: string | null
          make?: string | null
          model?: string | null
          registration_number: string
          status?: string | null
          updated_at?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          warehouse_id?: string | null
          year?: number | null
        }
        Update: {
          capacity_cbm?: number | null
          capacity_kg?: number | null
          created_at?: string | null
          current_location?: Json | null
          fuel_type?: string | null
          id?: string
          last_maintenance_date?: string | null
          make?: string | null
          model?: string | null
          registration_number?: string
          status?: string | null
          updated_at?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          warehouse_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capacity_sqm: number | null
          city: string | null
          code: string
          country_code: string
          created_at: string | null
          current_utilization_pct: number | null
          id: string
          is_active: boolean | null
          manager_user_id: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          type: Database["public"]["Enums"]["warehouse_type"] | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          capacity_sqm?: number | null
          city?: string | null
          code: string
          country_code: string
          created_at?: string | null
          current_utilization_pct?: number | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          type?: Database["public"]["Enums"]["warehouse_type"] | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          capacity_sqm?: number | null
          city?: string | null
          code?: string
          country_code?: string
          created_at?: string | null
          current_utilization_pct?: number | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          type?: Database["public"]["Enums"]["warehouse_type"] | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "logistics_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          external_event_id: string | null
          http_status_code: number | null
          id: string
          last_retry_at: string | null
          processing_time_ms: number | null
          request_headers: Json | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number
          status: string
          updated_at: string
          webhook_type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          external_event_id?: string | null
          http_status_code?: number | null
          id?: string
          last_retry_at?: string | null
          processing_time_ms?: number | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
          webhook_type: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_event_id?: string | null
          http_status_code?: number | null
          id?: string
          last_retry_at?: string | null
          processing_time_ms?: number | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      caller_has_paid_company: { Args: never; Returns: boolean }
      create_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_company_id: string
          p_icon?: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      expire_overdue_rfqs: { Args: never; Returns: undefined }
      expire_stale_rate_locks: { Args: never; Returns: undefined }
      get_user_companies: { Args: never; Returns: string[] }
      get_user_profile_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_logistics: { Args: never; Returns: boolean }
      is_paid_member: { Args: { company: string }; Returns: boolean }
      mark_messages_read: {
        Args: { p_conversation_id: string; p_reader_company_id: string }
        Returns: undefined
      }
      search_products: {
        Args: {
          filter_category?: string
          filter_moq_max?: number
          filter_price_max?: number
          filter_price_min?: number
          page_num?: number
          page_size?: number
          query: string
          sort_by?: string
        }
        Returns: {
          base_price: number
          category_name: string
          currency: string
          description: string
          id: string
          moq: number
          name: string
          name_local: string
          primary_image_url: string
          rank: number
          slug: string
          supplier_country: string
          supplier_id: string
          supplier_name: string
          supplier_verified: boolean
        }[]
      }
    }
    Enums: {
      address_format: "africa_landmark" | "cn_province" | "international"
      b2b_invoice_type:
        | "b2b_standard"
        | "proforma"
        | "commission"
        | "credit_note"
        | "fapiao_normal"
        | "fapiao_special"
      b2b_order_status:
        | "draft"
        | "pending_approval"
        | "pending_payment"
        | "deposit_paid"
        | "paid"
        | "confirmed"
        | "in_production"
        | "quality_check"
        | "ready_to_ship"
        | "assigned_to_logistics"
        | "dispatched"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "completed"
        | "cancelled"
        | "disputed"
        | "refund_requested"
        | "refunded"
      container_type:
        | "lcl"
        | "fcl_20"
        | "fcl_40"
        | "fcl_40hc"
        | "fcl_45"
        | "air_express"
        | "air_freight"
      customs_hold_reason:
        | "missing_documents"
        | "valuation_query"
        | "classification_dispute"
        | "license_required"
        | "inspection_pending"
        | "duty_unpaid"
        | "restricted_goods"
        | "other"
      customs_status_enum:
        | "not_required"
        | "pending"
        | "preparing"
        | "submitted"
        | "on_hold"
        | "cleared"
        | "rejected"
      dispute_resolution:
        | "full_pay_supplier"
        | "partial_refund_buyer"
        | "full_refund_buyer"
        | "replacement"
        | "dismissed"
      dispute_status:
        | "open"
        | "under_review"
        | "awaiting_evidence"
        | "resolved"
        | "escalated"
        | "closed"
      dispute_type:
        | "product_quality"
        | "wrong_item"
        | "not_delivered"
        | "damaged"
        | "quantity_mismatch"
        | "late_delivery"
        | "fraud"
        | "other"
      document_type:
        | "commercial_invoice"
        | "packing_list"
        | "bill_of_lading"
        | "air_waybill"
        | "certificate_of_origin"
        | "sgs_inspection"
        | "soncap"
        | "pvoc"
        | "fumigation"
        | "phytosanitary"
        | "health_certificate"
        | "cites"
        | "msds"
        | "dg_declaration"
        | "insurance_certificate"
        | "form_e"
        | "form_a"
        | "form_m"
        | "epz_permit"
        | "import_license"
        | "tax_id_certificate"
        | "other"
      driver_status: "available" | "on_delivery" | "off_duty" | "suspended"
      escrow_status:
        | "held"
        | "partial_release"
        | "released"
        | "disputed"
        | "refunded"
      inspection_agency:
        | "SGS"
        | "BV"
        | "Intertek"
        | "CCIC"
        | "ALS"
        | "Cotecna"
        | "other"
      inspection_status:
        | "requested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "failed"
      inspection_type:
        | "pre_shipment"
        | "loading_supervision"
        | "quality_assay"
        | "draft_survey"
        | "weight_verification"
        | "sanitary"
        | "container_tally"
      invoice_status:
        | "pending"
        | "issued"
        | "sent"
        | "voided"
        | "void_pending"
        | "failed"
      lc_status:
        | "draft"
        | "applied"
        | "issued"
        | "advised"
        | "confirmed"
        | "docs_presented"
        | "discrepancies"
        | "accepted"
        | "settled"
        | "expired"
        | "cancelled"
      lc_type:
        | "sight"
        | "usance_30"
        | "usance_60"
        | "usance_90"
        | "usance_120"
        | "usance_180"
      log_level: "debug" | "info" | "warn" | "error" | "fatal"
      market_region:
        | "africa_west"
        | "africa_east"
        | "africa_south"
        | "africa_central"
        | "africa_north"
        | "cn"
        | "global"
      moderation_status: "pending" | "approved" | "rejected" | "suspended"
      ops_quote_requester_type:
        | "forwarder"
        | "walk_in"
        | "partner"
        | "internal"
        | "other"
      ops_quote_status:
        | "draft"
        | "quoted"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "archived"
        | "pending_screening"
      payment_gateway:
        | "mtn_momo"
        | "airtel_money"
        | "tigo_cash"
        | "mpesa"
        | "stripe"
        | "alipay"
        | "wechat_pay"
        | "bank_transfer"
        | "escrow"
        | "platform_wallet"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
        | "expired"
        | "cancelled"
      payment_terms: "immediate" | "net_30" | "net_60" | "deposit_balance"
      platform_role:
        | "buyer"
        | "buyer_staff"
        | "buyer_finance"
        | "buyer_viewer"
        | "supplier_owner"
        | "supplier_sales"
        | "supplier_catalog"
        | "supplier_warehouse"
        | "logistics_admin"
        | "logistics_dispatcher"
        | "logistics_driver"
        | "admin_super"
        | "admin_moderator"
        | "admin_support"
      port_type: "sea" | "air" | "inland" | "rail"
      quotation_status:
        | "draft"
        | "submitted"
        | "revised"
        | "accepted"
        | "rejected"
        | "expired"
        | "withdrawn"
      rate_source:
        | "manual_forwarder"
        | "carrier_api"
        | "rate_card"
        | "tariff_db"
        | "tariff_api"
      rfq_status:
        | "draft"
        | "open"
        | "quoted"
        | "awarded"
        | "expired"
        | "cancelled"
        | "converted"
      screening_decision: "cleared" | "rejected"
      screening_result: "clear" | "hit" | "error"
      screening_subject_type: "ops_quote" | "buyer_request" | "company" | "user"
      settlement_status:
        | "pending"
        | "calculating"
        | "ready"
        | "processing"
        | "paid"
        | "failed"
        | "disputed"
      shipment_cost_category:
        | "freight"
        | "fuel"
        | "thc"
        | "customs_duty"
        | "customs_vat"
        | "customs_other"
        | "insurance"
        | "first_mile"
        | "last_mile"
        | "handling"
        | "demurrage"
        | "detention"
        | "docs"
        | "other"
      shipment_status:
        | "pending"
        | "assigned"
        | "driver_accepted"
        | "picking"
        | "packed"
        | "dispatched"
        | "in_transit"
        | "at_hub"
        | "out_for_delivery"
        | "delivery_attempted"
        | "delivered"
        | "returned"
        | "lost"
        | "damaged"
      shipping_method:
        | "platform_standard"
        | "platform_express"
        | "platform_freight"
        | "platform_cold_chain"
        | "supplier_self"
        | "buyer_pickup"
        | "third_party"
      supplier_tier: "free" | "standard" | "gold" | "verified"
      system_activity_type:
        | "user_login"
        | "user_logout"
        | "user_registered"
        | "company_created"
        | "company_verified"
        | "company_rejected"
        | "product_created"
        | "product_approved"
        | "product_rejected"
        | "order_created"
        | "order_status_changed"
        | "payment_received"
        | "payment_failed"
        | "dispute_opened"
        | "dispute_resolved"
        | "settlement_processed"
        | "shipment_created"
        | "shipment_delivered"
        | "rfq_published"
        | "admin_action"
        | "system_event"
        | "config_changed"
        | "role_changed"
      tax_system: "africa_vat" | "cn_vat" | "stripe_tax" | "manual"
      tax_type: "taxable" | "zero_rated" | "exempt" | "mixed"
      trade_term: "fob" | "cif" | "exw" | "ddp" | "dap" | "cpt" | "fca"
      vehicle_type:
        | "motorcycle"
        | "van"
        | "truck_small"
        | "truck_large"
        | "container"
        | "refrigerated"
      verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
        | "expired"
      warehouse_type: "fulfillment" | "hub" | "cross_dock" | "cold_storage"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      address_format: ["africa_landmark", "cn_province", "international"],
      b2b_invoice_type: [
        "b2b_standard",
        "proforma",
        "commission",
        "credit_note",
        "fapiao_normal",
        "fapiao_special",
      ],
      b2b_order_status: [
        "draft",
        "pending_approval",
        "pending_payment",
        "deposit_paid",
        "paid",
        "confirmed",
        "in_production",
        "quality_check",
        "ready_to_ship",
        "assigned_to_logistics",
        "dispatched",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "completed",
        "cancelled",
        "disputed",
        "refund_requested",
        "refunded",
      ],
      container_type: [
        "lcl",
        "fcl_20",
        "fcl_40",
        "fcl_40hc",
        "fcl_45",
        "air_express",
        "air_freight",
      ],
      customs_hold_reason: [
        "missing_documents",
        "valuation_query",
        "classification_dispute",
        "license_required",
        "inspection_pending",
        "duty_unpaid",
        "restricted_goods",
        "other",
      ],
      customs_status_enum: [
        "not_required",
        "pending",
        "preparing",
        "submitted",
        "on_hold",
        "cleared",
        "rejected",
      ],
      dispute_resolution: [
        "full_pay_supplier",
        "partial_refund_buyer",
        "full_refund_buyer",
        "replacement",
        "dismissed",
      ],
      dispute_status: [
        "open",
        "under_review",
        "awaiting_evidence",
        "resolved",
        "escalated",
        "closed",
      ],
      dispute_type: [
        "product_quality",
        "wrong_item",
        "not_delivered",
        "damaged",
        "quantity_mismatch",
        "late_delivery",
        "fraud",
        "other",
      ],
      document_type: [
        "commercial_invoice",
        "packing_list",
        "bill_of_lading",
        "air_waybill",
        "certificate_of_origin",
        "sgs_inspection",
        "soncap",
        "pvoc",
        "fumigation",
        "phytosanitary",
        "health_certificate",
        "cites",
        "msds",
        "dg_declaration",
        "insurance_certificate",
        "form_e",
        "form_a",
        "form_m",
        "epz_permit",
        "import_license",
        "tax_id_certificate",
        "other",
      ],
      driver_status: ["available", "on_delivery", "off_duty", "suspended"],
      escrow_status: [
        "held",
        "partial_release",
        "released",
        "disputed",
        "refunded",
      ],
      inspection_agency: [
        "SGS",
        "BV",
        "Intertek",
        "CCIC",
        "ALS",
        "Cotecna",
        "other",
      ],
      inspection_status: [
        "requested",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "failed",
      ],
      inspection_type: [
        "pre_shipment",
        "loading_supervision",
        "quality_assay",
        "draft_survey",
        "weight_verification",
        "sanitary",
        "container_tally",
      ],
      invoice_status: [
        "pending",
        "issued",
        "sent",
        "voided",
        "void_pending",
        "failed",
      ],
      lc_status: [
        "draft",
        "applied",
        "issued",
        "advised",
        "confirmed",
        "docs_presented",
        "discrepancies",
        "accepted",
        "settled",
        "expired",
        "cancelled",
      ],
      lc_type: [
        "sight",
        "usance_30",
        "usance_60",
        "usance_90",
        "usance_120",
        "usance_180",
      ],
      log_level: ["debug", "info", "warn", "error", "fatal"],
      market_region: [
        "africa_west",
        "africa_east",
        "africa_south",
        "africa_central",
        "africa_north",
        "cn",
        "global",
      ],
      moderation_status: ["pending", "approved", "rejected", "suspended"],
      ops_quote_requester_type: [
        "forwarder",
        "walk_in",
        "partner",
        "internal",
        "other",
      ],
      ops_quote_status: [
        "draft",
        "quoted",
        "sent",
        "accepted",
        "declined",
        "expired",
        "archived",
        "pending_screening",
      ],
      payment_gateway: [
        "mtn_momo",
        "airtel_money",
        "tigo_cash",
        "mpesa",
        "stripe",
        "alipay",
        "wechat_pay",
        "bank_transfer",
        "escrow",
        "platform_wallet",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "expired",
        "cancelled",
      ],
      payment_terms: ["immediate", "net_30", "net_60", "deposit_balance"],
      platform_role: [
        "buyer",
        "buyer_staff",
        "buyer_finance",
        "buyer_viewer",
        "supplier_owner",
        "supplier_sales",
        "supplier_catalog",
        "supplier_warehouse",
        "logistics_admin",
        "logistics_dispatcher",
        "logistics_driver",
        "admin_super",
        "admin_moderator",
        "admin_support",
      ],
      port_type: ["sea", "air", "inland", "rail"],
      quotation_status: [
        "draft",
        "submitted",
        "revised",
        "accepted",
        "rejected",
        "expired",
        "withdrawn",
      ],
      rate_source: [
        "manual_forwarder",
        "carrier_api",
        "rate_card",
        "tariff_db",
        "tariff_api",
      ],
      rfq_status: [
        "draft",
        "open",
        "quoted",
        "awarded",
        "expired",
        "cancelled",
        "converted",
      ],
      screening_decision: ["cleared", "rejected"],
      screening_result: ["clear", "hit", "error"],
      screening_subject_type: ["ops_quote", "buyer_request", "company", "user"],
      settlement_status: [
        "pending",
        "calculating",
        "ready",
        "processing",
        "paid",
        "failed",
        "disputed",
      ],
      shipment_cost_category: [
        "freight",
        "fuel",
        "thc",
        "customs_duty",
        "customs_vat",
        "customs_other",
        "insurance",
        "first_mile",
        "last_mile",
        "handling",
        "demurrage",
        "detention",
        "docs",
        "other",
      ],
      shipment_status: [
        "pending",
        "assigned",
        "driver_accepted",
        "picking",
        "packed",
        "dispatched",
        "in_transit",
        "at_hub",
        "out_for_delivery",
        "delivery_attempted",
        "delivered",
        "returned",
        "lost",
        "damaged",
      ],
      shipping_method: [
        "platform_standard",
        "platform_express",
        "platform_freight",
        "platform_cold_chain",
        "supplier_self",
        "buyer_pickup",
        "third_party",
      ],
      supplier_tier: ["free", "standard", "gold", "verified"],
      system_activity_type: [
        "user_login",
        "user_logout",
        "user_registered",
        "company_created",
        "company_verified",
        "company_rejected",
        "product_created",
        "product_approved",
        "product_rejected",
        "order_created",
        "order_status_changed",
        "payment_received",
        "payment_failed",
        "dispute_opened",
        "dispute_resolved",
        "settlement_processed",
        "shipment_created",
        "shipment_delivered",
        "rfq_published",
        "admin_action",
        "system_event",
        "config_changed",
        "role_changed",
      ],
      tax_system: ["africa_vat", "cn_vat", "stripe_tax", "manual"],
      tax_type: ["taxable", "zero_rated", "exempt", "mixed"],
      trade_term: ["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"],
      vehicle_type: [
        "motorcycle",
        "van",
        "truck_small",
        "truck_large",
        "container",
        "refrigerated",
      ],
      verification_status: [
        "unverified",
        "pending",
        "verified",
        "rejected",
        "expired",
      ],
      warehouse_type: ["fulfillment", "hub", "cross_dock", "cold_storage"],
    },
  },
} as const

// ============================================================================
// MANUAL TYPE ALIASES — must be re-appended after `supabase gen types`.
// See feedback_supabase_types_aliases.md.
// ============================================================================
export type PlatformRole = Enums<"platform_role">
export type MarketRegion = Enums<"market_region">
export type TradeTerm = Enums<"trade_term">
export type VerificationStatus = Enums<"verification_status">
export type SupplierTier = Enums<"supplier_tier">
export type CompanyType = "buyer_org" | "supplier" | "logistics" | "both"
