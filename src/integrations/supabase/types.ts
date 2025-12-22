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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_password_resets: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          reset_token: string
          used: boolean
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          reset_token: string
          used?: boolean
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          reset_token?: string
          used?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_password_resets_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          failed_login_attempts: number
          id: string
          is_active: boolean
          last_login_at: string | null
          locked_until: string | null
          pin_hash: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_login_attempts?: number
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          pin_hash: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_login_attempts?: number
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          pin_hash?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          created_at: string
          customer_id: string
          id: string
          ifsc_code: string
          is_default: boolean
          is_verified: boolean
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type?: string
          bank_name: string
          created_at?: string
          customer_id: string
          id?: string
          ifsc_code: string
          is_default?: boolean
          is_verified?: boolean
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          customer_id?: string
          id?: string
          ifsc_code?: string
          is_default?: boolean
          is_verified?: boolean
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      delivery_proofs: {
        Row: {
          created_at: string
          customer_id: string
          file_path: string
          id: string
          notes: string | null
          order_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_path: string
          id?: string
          notes?: string | null
          order_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_path?: string
          id?: string
          notes?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_comments: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          is_admin: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          is_admin?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_comments_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_files: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_files_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_responses: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          merchant_id: string
          response_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          merchant_id: string
          response_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          merchant_id?: string
          response_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_responses_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          dispute_id: string
          id: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispute_id: string
          id?: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispute_id?: string
          id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_updates_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          documents: string[] | null
          final_decision: string | null
          id: string
          issue_type: string | null
          merchant_responded: boolean | null
          order_id: string
          reason: string
          refund_amount: number | null
          resolution_notes: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          documents?: string[] | null
          final_decision?: string | null
          id?: string
          issue_type?: string | null
          merchant_responded?: boolean | null
          order_id: string
          reason: string
          refund_amount?: number | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          documents?: string[] | null
          final_decision?: string | null
          id?: string
          issue_type?: string | null
          merchant_responded?: boolean | null
          order_id?: string
          reason?: string
          refund_amount?: number | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          audience: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          order_index: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          audience?: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          audience?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_records: {
        Row: {
          address: string | null
          address_proof_url: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_legal_name: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          pincode: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          address_proof_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_legal_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          address_proof_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_legal_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          merchant_id: string
          name: string
          scopes: string[]
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          merchant_id: string
          name: string
          scopes?: string[]
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          merchant_id?: string
          name?: string
          scopes?: string[]
        }
        Relationships: []
      }
      merchant_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          account_type: string
          bank_name: string
          branch_name: string | null
          created_at: string
          id: string
          ifsc_code: string
          is_default: boolean
          is_verified: boolean
          merchant_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          account_type?: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          id?: string
          ifsc_code: string
          is_default?: boolean
          is_verified?: boolean
          merchant_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string
          is_default?: boolean
          is_verified?: boolean
          merchant_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      merchant_evidence: {
        Row: {
          created_at: string
          description: string | null
          dispute_id: string
          evidence_type: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          merchant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispute_id: string
          evidence_type?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          merchant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dispute_id?: string
          evidence_type?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_kyc: {
        Row: {
          additional_notes: string | null
          business_type: string | null
          created_at: string
          gst_number: string | null
          id: string
          legal_business_name: string | null
          merchant_id: string
          owner_dob: string | null
          owner_name: string | null
          owner_phone: string | null
          pan_number: string | null
          registered_address: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          legal_business_name?: string | null
          merchant_id: string
          owner_dob?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          registered_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          legal_business_name?: string | null
          merchant_id?: string
          owner_dob?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          registered_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          kyc_id: string | null
          merchant_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          kyc_id?: string | null
          merchant_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          kyc_id?: string | null
          merchant_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_kyc_documents_kyc_id_fkey"
            columns: ["kyc_id"]
            isOneToOne: false
            referencedRelation: "merchant_kyc"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_notification_prefs: {
        Row: {
          created_at: string
          dispute_email: boolean
          dispute_in_app: boolean
          dispute_sms: boolean
          id: string
          merchant_id: string
          order_email: boolean
          order_in_app: boolean
          order_sms: boolean
          payment_email: boolean
          payment_in_app: boolean
          payment_sms: boolean
          payout_email: boolean
          payout_in_app: boolean
          payout_sms: boolean
          system_email: boolean
          system_in_app: boolean
          system_sms: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_email?: boolean
          dispute_in_app?: boolean
          dispute_sms?: boolean
          id?: string
          merchant_id: string
          order_email?: boolean
          order_in_app?: boolean
          order_sms?: boolean
          payment_email?: boolean
          payment_in_app?: boolean
          payment_sms?: boolean
          payout_email?: boolean
          payout_in_app?: boolean
          payout_sms?: boolean
          system_email?: boolean
          system_in_app?: boolean
          system_sms?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_email?: boolean
          dispute_in_app?: boolean
          dispute_sms?: boolean
          id?: string
          merchant_id?: string
          order_email?: boolean
          order_in_app?: boolean
          order_sms?: boolean
          payment_email?: boolean
          payment_in_app?: boolean
          payment_sms?: boolean
          payout_email?: boolean
          payout_in_app?: boolean
          payout_sms?: boolean
          system_email?: boolean
          system_in_app?: boolean
          system_sms?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      merchant_notifications: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          data: Json | null
          id: string
          merchant_id: string
          priority: string
          read_at: string | null
          related_dispute_id: string | null
          related_order_id: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          archived_at?: string | null
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          merchant_id: string
          priority?: string
          read_at?: string | null
          related_dispute_id?: string | null
          related_order_id?: string | null
          status?: string
          title: string
          type?: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          merchant_id?: string
          priority?: string
          read_at?: string | null
          related_dispute_id?: string | null
          related_order_id?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_notifications_related_dispute_id_fkey"
            columns: ["related_dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payouts: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          failure_reason: string | null
          fee: number
          id: string
          merchant_id: string
          net_amount: number
          notes: string | null
          processed_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          merchant_id: string
          net_amount: number
          notes?: string | null
          processed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          merchant_id?: string
          net_amount?: number
          notes?: string | null
          processed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payouts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "merchant_bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          merchant_id: string
          pending_balance: number
          status: string
          total_paid_out: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_id: string
          pending_balance?: number
          status?: string
          total_paid_out?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_id?: string
          pending_balance?: number
          status?: string
          total_paid_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      merchant_webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_status: number | null
          last_triggered_at: string | null
          merchant_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status?: number | null
          last_triggered_at?: string | null
          merchant_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status?: number | null
          last_triggered_at?: string | null
          merchant_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          business_name: string
          category: string | null
          created_at: string
          email: string
          gst_number: string | null
          id: string
          logo_url: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_name: string
          category?: string | null
          created_at?: string
          email: string
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_name?: string
          category?: string | null
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          expected_delivery_date: string | null
          id: string
          merchant_id: string
          merchant_name: string
          product_description: string | null
          product_name: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          merchant_id: string
          merchant_name: string
          product_description?: string | null
          product_name: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          merchant_id?: string
          merchant_name?: string
          product_description?: string | null
          product_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          merchant_id: string
          order_id: string
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          merchant_id: string
          order_id: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          merchant_id?: string
          order_id?: string
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refund_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          refund_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          refund_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          refund_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_events_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          credited_at: string | null
          customer_id: string
          dispute_id: string | null
          failure_reason: string | null
          id: string
          order_id: string
          payment_method: string | null
          payment_method_last4: string | null
          reason: string
          receipt_url: string | null
          retry_allowed: boolean | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          credited_at?: string | null
          customer_id: string
          dispute_id?: string | null
          failure_reason?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          payment_method_last4?: string | null
          reason: string
          receipt_url?: string | null
          retry_allowed?: boolean | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          customer_id?: string
          dispute_id?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          payment_method_last4?: string | null
          reason?: string
          receipt_url?: string | null
          retry_allowed?: boolean | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_staff: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          related_order_id: string | null
          related_shipment_id: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          related_order_id?: string | null
          related_shipment_id?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          related_order_id?: string | null
          related_shipment_id?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking: {
        Row: {
          carrier: string | null
          created_at: string
          estimated_delivery: string | null
          id: string
          location: string | null
          order_id: string
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          location?: string | null
          order_id?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          occurred_at: string
          status: string
          tracking_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          status: string
          tracking_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          status?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          duration_days: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_prefs: {
        Row: {
          created_at: string
          dispute_email: boolean
          dispute_in_app: boolean
          dispute_sms: boolean
          id: string
          order_email: boolean
          order_in_app: boolean
          order_sms: boolean
          payment_email: boolean
          payment_in_app: boolean
          payment_sms: boolean
          refund_email: boolean
          refund_in_app: boolean
          refund_sms: boolean
          system_email: boolean
          system_in_app: boolean
          system_sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dispute_email?: boolean
          dispute_in_app?: boolean
          dispute_sms?: boolean
          id?: string
          order_email?: boolean
          order_in_app?: boolean
          order_sms?: boolean
          payment_email?: boolean
          payment_in_app?: boolean
          payment_sms?: boolean
          refund_email?: boolean
          refund_in_app?: boolean
          refund_sms?: boolean
          system_email?: boolean
          system_in_app?: boolean
          system_sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dispute_email?: boolean
          dispute_in_app?: boolean
          dispute_sms?: boolean
          id?: string
          order_email?: boolean
          order_in_app?: boolean
          order_sms?: boolean
          payment_email?: boolean
          payment_in_app?: boolean
          payment_sms?: boolean
          refund_email?: boolean
          refund_in_app?: boolean
          refund_sms?: boolean
          system_email?: boolean
          system_in_app?: boolean
          system_sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_privacy_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          created_at: string
          id: string
          last_password_change: string | null
          two_factor_enabled: boolean
          two_factor_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_password_change?: string | null
          two_factor_enabled?: boolean
          two_factor_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_password_change?: string | null
          two_factor_enabled?: boolean
          two_factor_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          customer_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "customer"
      dispute_status: "open" | "under_review" | "resolved" | "closed"
      order_status:
        | "pending"
        | "in_progress"
        | "delivered"
        | "completed"
        | "disputed"
        | "refunded"
        | "cancelled"
        | "draft"
        | "escrow_locked"
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
      app_role: ["admin", "merchant", "customer"],
      dispute_status: ["open", "under_review", "resolved", "closed"],
      order_status: [
        "pending",
        "in_progress",
        "delivered",
        "completed",
        "disputed",
        "refunded",
        "cancelled",
        "draft",
        "escrow_locked",
      ],
    },
  },
} as const
