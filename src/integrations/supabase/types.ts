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
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          triggered_by: string | null
          triggered_by_type: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          triggered_by?: string | null
          triggered_by_type?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          triggered_by?: string | null
          triggered_by_type?: string | null
        }
        Relationships: []
      }
      admin_financial_actions_log: {
        Row: {
          action_type: string
          admin_id: string
          amount: number | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          amount?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          amount?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
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
      admin_notification_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string | null
          id: string
          new_value: Json | null
          notification_id: string
          previous_value: Json | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          notification_id: string
          previous_value?: Json | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          notification_id?: string
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_recipients: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          specific_user_ids: string[] | null
          status: string
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          specific_user_ids?: string[] | null
          status?: string
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          specific_user_ids?: string[] | null
          status?: string
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
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
      admin_pending_approvals: {
        Row: {
          action_type: string
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          initiated_at: string
          initiated_by: string
          ip_address: string | null
          metadata: Json | null
          reason: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          initiated_at?: string
          initiated_by: string
          ip_address?: string | null
          metadata?: Json | null
          reason: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          initiated_at?: string
          initiated_by?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
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
      escrow_accounts: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          is_frozen: boolean
          locked_balance: number
          merchant_id: string
          notes: string | null
          risk_flag: string | null
          total_balance: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          is_frozen?: boolean
          locked_balance?: number
          merchant_id: string
          notes?: string | null
          risk_flag?: string | null
          total_balance?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          is_frozen?: boolean
          locked_balance?: number
          merchant_id?: string
          notes?: string | null
          risk_flag?: string | null
          total_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      escrow_resolution_log: {
        Row: {
          admin_id: string | null
          amount: number
          approval_source: string
          created_at: string
          escrow_account_id: string | null
          id: string
          idempotency_key: string
          ip_address: string | null
          new_order_status: string
          order_id: string
          previous_order_status: string
          reason: string
          resolution_type: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          approval_source: string
          created_at?: string
          escrow_account_id?: string | null
          id?: string
          idempotency_key: string
          ip_address?: string | null
          new_order_status: string
          order_id: string
          previous_order_status: string
          reason: string
          resolution_type: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          approval_source?: string
          created_at?: string
          escrow_account_id?: string | null
          id?: string
          idempotency_key?: string
          ip_address?: string | null
          new_order_status?: string
          order_id?: string
          previous_order_status?: string
          reason?: string
          resolution_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_resolution_log_escrow_account_id_fkey"
            columns: ["escrow_account_id"]
            isOneToOne: false
            referencedRelation: "escrow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_resolution_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          escrow_account_id: string
          id: string
          order_id: string | null
          reason: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          created_by?: string | null
          escrow_account_id: string
          id?: string
          order_id?: string | null
          reason?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          escrow_account_id?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_escrow_account_id_fkey"
            columns: ["escrow_account_id"]
            isOneToOne: false
            referencedRelation: "escrow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
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
      kyc_actions_log: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          document_hash: string | null
          document_type: string | null
          id: string
          ip_address: string | null
          kyc_id: string
          kyc_type: string
          metadata: Json | null
          new_status: string | null
          previous_status: string | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          document_hash?: string | null
          document_type?: string | null
          id?: string
          ip_address?: string | null
          kyc_id: string
          kyc_type: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          document_hash?: string | null
          document_type?: string | null
          id?: string
          ip_address?: string | null
          kyc_id?: string
          kyc_type?: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_document_history: {
        Row: {
          created_at: string
          document_type: string
          file_hash: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          kyc_id: string
          kyc_type: string
          replaced_by: string | null
          submission_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          kyc_id: string
          kyc_type: string
          replaced_by?: string | null
          submission_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          kyc_id?: string
          kyc_type?: string
          replaced_by?: string | null
          submission_number?: number
          user_id?: string
        }
        Relationships: []
      }
      kyc_document_reuse_attempts: {
        Row: {
          attempted_by: string
          created_at: string
          document_hash: string
          document_type: string
          id: string
          ip_address: string | null
          original_kyc_id: string
          original_user_id: string
          user_agent: string | null
        }
        Insert: {
          attempted_by: string
          created_at?: string
          document_hash: string
          document_type: string
          id?: string
          ip_address?: string | null
          original_kyc_id: string
          original_user_id: string
          user_agent?: string | null
        }
        Update: {
          attempted_by?: string
          created_at?: string
          document_hash?: string
          document_type?: string
          id?: string
          ip_address?: string | null
          original_kyc_id?: string
          original_user_id?: string
          user_agent?: string | null
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
          document_number_hash: string | null
          full_legal_name: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          last_rejection_id: string | null
          pincode: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submission_count: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          address_proof_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_number_hash?: string | null
          full_legal_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          last_rejection_id?: string | null
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submission_count?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          address_proof_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_number_hash?: string | null
          full_legal_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          last_rejection_id?: string | null
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submission_count?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
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
          gst_number_hash: string | null
          id: string
          last_rejection_id: string | null
          legal_business_name: string | null
          merchant_id: string
          owner_dob: string | null
          owner_name: string | null
          owner_phone: string | null
          pan_number: string | null
          pan_number_hash: string | null
          registered_address: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_count: number | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          gst_number_hash?: string | null
          id?: string
          last_rejection_id?: string | null
          legal_business_name?: string | null
          merchant_id: string
          owner_dob?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          pan_number_hash?: string | null
          registered_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_count?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          gst_number_hash?: string | null
          id?: string
          last_rejection_id?: string | null
          legal_business_name?: string | null
          merchant_id?: string
          owner_dob?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          pan_number?: string | null
          pan_number_hash?: string | null
          registered_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_count?: number | null
          updated_at?: string
          verified_at?: string | null
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
      merchant_order_actions_log: {
        Row: {
          action_type: string
          created_at: string
          field_changes: Json | null
          id: string
          ip_address: string | null
          merchant_id: string
          new_status: string | null
          order_id: string
          previous_status: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          field_changes?: Json | null
          id?: string
          ip_address?: string | null
          merchant_id: string
          new_status?: string | null
          order_id: string
          previous_status?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          field_changes?: Json | null
          id?: string
          ip_address?: string | null
          merchant_id?: string
          new_status?: string | null
          order_id?: string
          previous_status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_order_actions_log_order_id_fkey"
            columns: ["order_id"]
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
          gst: number | null
          id: string
          idempotency_key: string | null
          merchant_id: string
          net_amount: number
          notes: string | null
          platform_fee: number | null
          processed_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          withdrawal_fee: number | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          failure_reason?: string | null
          fee?: number
          gst?: number | null
          id?: string
          idempotency_key?: string | null
          merchant_id: string
          net_amount: number
          notes?: string | null
          platform_fee?: number | null
          processed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          withdrawal_fee?: number | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          failure_reason?: string | null
          fee?: number
          gst?: number | null
          id?: string
          idempotency_key?: string | null
          merchant_id?: string
          net_amount?: number
          notes?: string | null
          platform_fee?: number | null
          processed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          withdrawal_fee?: number | null
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
      merchant_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          currency: string | null
          entry_type: string | null
          id: string
          merchant_id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          entry_type?: string | null
          id?: string
          merchant_id: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          entry_type?: string | null
          id?: string
          merchant_id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: []
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
      order_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          escrow_finalized_at: string | null
          escrow_finalized_by: string | null
          escrow_resolution_type: string | null
          expected_delivery_date: string | null
          id: string
          merchant_id: string
          merchant_name: string
          merchant_net_amount: number | null
          platform_fee: number | null
          platform_fee_gst: number | null
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
          escrow_finalized_at?: string | null
          escrow_finalized_by?: string | null
          escrow_resolution_type?: string | null
          expected_delivery_date?: string | null
          id?: string
          merchant_id: string
          merchant_name: string
          merchant_net_amount?: number | null
          platform_fee?: number | null
          platform_fee_gst?: number | null
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
          escrow_finalized_at?: string | null
          escrow_finalized_by?: string | null
          escrow_resolution_type?: string | null
          expected_delivery_date?: string | null
          id?: string
          merchant_id?: string
          merchant_name?: string
          merchant_net_amount?: number | null
          platform_fee?: number | null
          platform_fee_gst?: number | null
          product_description?: string | null
          product_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          payment_id: string | null
          processed_at: string
          razorpay_event_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          payment_id?: string | null
          processed_at?: string
          razorpay_event_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed_at?: string
          razorpay_event_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          gateway_failure_reason: string | null
          gateway_status: string | null
          id: string
          is_final: boolean | null
          merchant_id: string
          order_id: string
          payment_gateway: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          gateway_failure_reason?: string | null
          gateway_status?: string | null
          id?: string
          is_final?: boolean | null
          merchant_id: string
          order_id: string
          payment_gateway?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          gateway_failure_reason?: string | null
          gateway_status?: string | null
          id?: string
          is_final?: boolean | null
          merchant_id?: string
          order_id?: string
          payment_gateway?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
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
          admin_id: string | null
          admin_notes: string | null
          amount: number
          created_at: string
          credited_at: string | null
          customer_id: string
          dispute_id: string | null
          failure_reason: string | null
          id: string
          initiated_by: string | null
          order_id: string
          payment_id: string | null
          payment_method: string | null
          payment_method_last4: string | null
          razorpay_refund_id: string | null
          reason: string
          receipt_url: string | null
          refund_type: string | null
          retry_allowed: boolean | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          credited_at?: string | null
          customer_id: string
          dispute_id?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          order_id: string
          payment_id?: string | null
          payment_method?: string | null
          payment_method_last4?: string | null
          razorpay_refund_id?: string | null
          reason: string
          receipt_url?: string | null
          refund_type?: string | null
          retry_allowed?: boolean | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          credited_at?: string | null
          customer_id?: string
          dispute_id?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          order_id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_method_last4?: string | null
          razorpay_refund_id?: string | null
          reason?: string
          receipt_url?: string | null
          refund_type?: string | null
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
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_actions_log: {
        Row: {
          action_type: string
          admin_id: string
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          shipment_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          shipment_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_actions_log_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_issues: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_status: string
          issue_type: string
          order_impact: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_status?: string
          issue_type: string
          order_impact?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_status?: string
          issue_type?: string
          order_impact?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_issues_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      support_actions_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          ticket_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          ticket_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_actions_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
      support_status_history: {
        Row: {
          changed_by: string
          changed_by_type: string
          created_at: string
          id: string
          new_priority: string | null
          new_status: string
          previous_priority: string | null
          previous_status: string | null
          reason: string | null
          ticket_id: string
        }
        Insert: {
          changed_by: string
          changed_by_type?: string
          created_at?: string
          id?: string
          new_priority?: string | null
          new_status: string
          previous_priority?: string | null
          previous_status?: string | null
          reason?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string
          changed_by_type?: string
          created_at?: string
          id?: string
          new_priority?: string | null
          new_status?: string
          previous_priority?: string | null
          previous_status?: string | null
          reason?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_status_history_ticket_id_fkey"
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
          actual_delivery_date: string | null
          carrier: string | null
          created_at: string
          estimated_delivery: string | null
          expected_delivery_date: string | null
          id: string
          is_delayed: boolean
          location: string | null
          logistics_provider: string | null
          order_id: string
          shipment_number: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          expected_delivery_date?: string | null
          id?: string
          is_delayed?: boolean
          location?: string | null
          logistics_provider?: string | null
          order_id: string
          shipment_number?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          expected_delivery_date?: string | null
          id?: string
          is_delayed?: boolean
          location?: string | null
          logistics_provider?: string | null
          order_id?: string
          shipment_number?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
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
      user_verification_history: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
      withdrawal_abuse_signals: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          signal_type: string
          user_agent: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          signal_type: string
          user_agent?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          signal_type?: string
          user_agent?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      withdrawal_actions_log: {
        Row: {
          account_last4: string | null
          action_type: string
          amount: number
          balance_after: number
          balance_before: number
          bank_account_id: string | null
          bank_name: string | null
          created_at: string
          fee: number | null
          gst: number | null
          id: string
          idempotency_key: string | null
          ip_address: string | null
          metadata: Json | null
          new_status: string | null
          previous_status: string | null
          session_id: string | null
          total_debit: number
          user_agent: string | null
          user_id: string
          user_type: string
          withdrawal_id: string
          withdrawal_type: string
        }
        Insert: {
          account_last4?: string | null
          action_type: string
          amount: number
          balance_after: number
          balance_before: number
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          fee?: number | null
          gst?: number | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          session_id?: string | null
          total_debit: number
          user_agent?: string | null
          user_id: string
          user_type: string
          withdrawal_id: string
          withdrawal_type: string
        }
        Update: {
          account_last4?: string | null
          action_type?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          fee?: number | null
          gst?: number | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          session_id?: string | null
          total_debit?: number
          user_agent?: string | null
          user_id?: string
          user_type?: string
          withdrawal_id?: string
          withdrawal_type?: string
        }
        Relationships: []
      }
      withdrawal_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          gateway_response: Json | null
          id: string
          message: string | null
          payout_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gateway_response?: Json | null
          id?: string
          message?: string | null
          payout_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gateway_response?: Json | null
          id?: string
          message?: string | null
          payout_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_transactions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "merchant_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      merchant_wallet_balances: {
        Row: {
          available_balance: number | null
          currency: string | null
          current_balance: number | null
          frozen_amount: number | null
          merchant_id: string | null
          pending_releases: number | null
          total_credits: number | null
          total_debits: number | null
          total_withdrawn: number | null
          wallet_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_merchant_withdraw: {
        Args: { p_amount: number; p_merchant_id: string }
        Returns: {
          allowed: boolean
          available_balance: number
          has_disputes: boolean
          is_frozen: boolean
          kyc_status: string
          reason: string
        }[]
      }
      check_all_wallet_consistency: {
        Args: never
        Returns: {
          discrepancy: number
          ledger_balance: number
          needs_attention: boolean
          stored_balance: number
          user_id: string
          user_type: string
        }[]
      }
      check_kyc_document_uniqueness: {
        Args: {
          p_document_hash: string
          p_document_type: string
          p_user_id: string
        }
        Returns: {
          is_unique: boolean
          original_kyc_id: string
          original_user_id: string
        }[]
      }
      check_kyc_reupload_limit: {
        Args: { p_kyc_type: string; p_user_id: string }
        Returns: boolean
      }
      check_wallet_ledger_consistency: {
        Args: { p_customer_id: string }
        Returns: {
          discrepancy: number
          is_consistent: boolean
          ledger_balance: number
          wallet_balance: number
        }[]
      }
      check_withdrawal_rate_limit: {
        Args: { p_user_id: string; p_user_type: string }
        Returns: boolean
      }
      complete_withdrawal: { Args: { p_payout_id: string }; Returns: boolean }
      compute_merchant_balance_from_ledger: {
        Args: { p_merchant_id: string }
        Returns: {
          available_balance: number
          current_balance: number
          frozen_amount: number
          pending_releases: number
          total_credits: number
          total_debits: number
          total_withdrawn: number
        }[]
      }
      compute_merchant_wallet_balances: {
        Args: { p_merchant_id: string }
        Returns: {
          available_balance: number
          pending_balance: number
          total_paid_out: number
        }[]
      }
      compute_wallet_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      create_merchant_withdrawal: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_idempotency_key?: string
          p_merchant_id: string
          p_notes?: string
        }
        Returns: {
          amount: number
          error: string
          gst_on_fee: number
          net_amount: number
          payout_id: string
          success: boolean
          withdrawal_fee: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_financial_failure: {
        Args: {
          p_action_type: string
          p_admin_id?: string
          p_amount?: number
          p_error_message: string
          p_metadata?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      reverse_failed_withdrawal: {
        Args: { p_failure_reason?: string; p_payout_id: string }
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
