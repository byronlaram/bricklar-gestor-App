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
      app_settings: {
        Row: {
          branch_id: string | null
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
          value_json: Json | null
        }
        Insert: {
          branch_id?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Update: {
          branch_id?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          branch_id: string | null
          changes: Json | null
          created_at: string
          entity_code: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          branch_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_code?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          branch_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_code?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          document_config: Json | null
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          notification_config: Json | null
          phone: string | null
          primary_currency: string
          timezone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          document_config?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notification_config?: Json | null
          phone?: string | null
          primary_currency?: string
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          document_config?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notification_config?: Json | null
          phone?: string | null
          primary_currency?: string
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      bus_routes: {
        Row: {
          cooperative_name: string
          created_at: string
          departure_schedules: string
          destination_city: string
          dispatch_phone: string | null
          id: string
          is_active: boolean
          notes: string | null
          origin_terminal: string
          updated_at: string
        }
        Insert: {
          cooperative_name: string
          created_at?: string
          departure_schedules: string
          destination_city: string
          dispatch_phone?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          origin_terminal: string
          updated_at?: string
        }
        Update: {
          cooperative_name?: string
          created_at?: string
          departure_schedules?: string
          destination_city?: string
          dispatch_phone?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          origin_terminal?: string
          updated_at?: string
        }
        Relationships: []
      }
      bus_schedules: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          days_of_week: number[]
          departure_time: string
          destination_id: string
          id: string
          is_active: boolean
          notes: string | null
          price_nio: number | null
          price_usd: number | null
          terminal_address: string | null
          terminal_name: string | null
          transport_service_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          days_of_week?: number[]
          departure_time: string
          destination_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          price_nio?: number | null
          price_usd?: number | null
          terminal_address?: string | null
          terminal_name?: string | null
          transport_service_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          days_of_week?: number[]
          departure_time?: string
          destination_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          price_nio?: number | null
          price_usd?: number | null
          terminal_address?: string | null
          terminal_name?: string | null
          transport_service_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_transport_service_id_fkey"
            columns: ["transport_service_id"]
            isOneToOne: false
            referencedRelation: "transport_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          courier_id: string
          created_at: string
          currency: string
          description: string
          direction: string
          id: string
          movement_type: string
          payment_method: string
          receipt_url: string | null
          task_id: string | null
          workday_id: string
        }
        Insert: {
          amount: number
          courier_id: string
          created_at?: string
          currency?: string
          description: string
          direction: string
          id?: string
          movement_type: string
          payment_method?: string
          receipt_url?: string | null
          task_id?: string | null
          workday_id: string
        }
        Update: {
          amount?: number
          courier_id?: string
          created_at?: string
          currency?: string
          description?: string
          direction?: string
          id?: string
          movement_type?: string
          payment_method?: string
          receipt_url?: string | null
          task_id?: string | null
          workday_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: false
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          branch_id: string
          confirmation_status: string
          confirmed_at: string | null
          confirmed_by: string | null
          courier_id: string
          created_at: string
          currency: string
          delivered_at: string
          delivered_by: string
          equivalent_nio: number | null
          exchange_rate: number | null
          id: string
          notes: string | null
          reason: string
          rejection_reason: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          workday_id: string
        }
        Insert: {
          amount: number
          branch_id: string
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          courier_id: string
          created_at?: string
          currency: string
          delivered_at?: string
          delivered_by: string
          equivalent_nio?: number | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reason: string
          rejection_reason?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workday_id: string
        }
        Update: {
          amount?: number
          branch_id?: string
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          courier_id?: string
          created_at?: string
          currency?: string
          delivered_at?: string
          delivered_by?: string
          equivalent_nio?: number | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reason?: string
          rejection_reason?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workday_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: false
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_branch_assignments: {
        Row: {
          assigned_by: string
          courier_id: string
          created_at: string
          end_date: string | null
          from_branch_id: string
          id: string
          notes: string | null
          reason: string
          start_date: string
          status: string
          to_branch_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          courier_id: string
          created_at?: string
          end_date?: string | null
          from_branch_id: string
          id?: string
          notes?: string | null
          reason: string
          start_date: string
          status?: string
          to_branch_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          courier_id?: string
          created_at?: string
          end_date?: string | null
          from_branch_id?: string
          id?: string
          notes?: string | null
          reason?: string
          start_date?: string
          status?: string
          to_branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_branch_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_branch_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_branch_assignments_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_branch_assignments_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_closures: {
        Row: {
          branch_id: string
          closed_at: string | null
          closed_by: string | null
          closure_date: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          status: string
          tasks_cancelled: number
          tasks_completed: number
          tasks_not_completed: number
          tasks_total: number
          total_collections_nio: number
          total_collections_usd: number
          total_delivered_nio: number | null
          total_delivered_usd: number | null
          total_difference_nio: number | null
          total_difference_usd: number | null
          total_expected_nio: number
          total_expected_usd: number
          total_payments_nio: number
          total_payments_usd: number
          updated_at: string
          updated_by: string | null
          workdays_count: number
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closed_by?: string | null
          closure_date: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          status?: string
          tasks_cancelled?: number
          tasks_completed?: number
          tasks_not_completed?: number
          tasks_total?: number
          total_collections_nio?: number
          total_collections_usd?: number
          total_delivered_nio?: number | null
          total_delivered_usd?: number | null
          total_difference_nio?: number | null
          total_difference_usd?: number | null
          total_expected_nio?: number
          total_expected_usd?: number
          total_payments_nio?: number
          total_payments_usd?: number
          updated_at?: string
          updated_by?: string | null
          workdays_count?: number
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_date?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          status?: string
          tasks_cancelled?: number
          tasks_completed?: number
          tasks_not_completed?: number
          tasks_total?: number
          total_collections_nio?: number
          total_collections_usd?: number
          total_delivered_nio?: number | null
          total_delivered_usd?: number | null
          total_difference_nio?: number | null
          total_difference_usd?: number | null
          total_expected_nio?: number
          total_expected_usd?: number
          total_payments_nio?: number
          total_payments_usd?: number
          updated_at?: string
          updated_by?: string | null
          workdays_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closures_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          name: string
          region: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          name: string
          region?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          name?: string
          region?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          nio_per_usd: number
          notes: string | null
          rate_date: string
          source: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          nio_per_usd: number
          notes?: string | null
          rate_date: string
          source?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          nio_per_usd?: number
          notes?: string | null
          rate_date?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_movements: {
        Row: {
          branch_id: string
          courier_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          equivalent_nio: number
          exchange_rate: number | null
          id: string
          idempotency_key: string | null
          movement_type: string
          notes: string | null
          original_amount: number
          original_currency: string
          payment_method: string
          reference_number: string | null
          task_id: string | null
          updated_at: string
          updated_by: string | null
          workday_id: string
        }
        Insert: {
          branch_id: string
          courier_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          equivalent_nio: number
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          movement_type: string
          notes?: string | null
          original_amount: number
          original_currency: string
          payment_method?: string
          reference_number?: string | null
          task_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workday_id: string
        }
        Update: {
          branch_id?: string
          courier_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          equivalent_nio?: number
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          movement_type?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          payment_method?: string
          reference_number?: string | null
          task_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workday_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_movements_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: false
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          daily_closure: boolean
          fund_received: boolean
          id: string
          settlement_ready: boolean
          task_assigned: boolean
          task_status_changed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_closure?: boolean
          fund_received?: boolean
          id?: string
          settlement_ready?: boolean
          task_assigned?: boolean
          task_status_changed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_closure?: boolean
          fund_received?: boolean
          id?: string
          settlement_ready?: boolean
          task_assigned?: boolean
          task_status_changed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          data: Json | null
          dismissed_at: string | null
          id: string
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
          workday_id: string | null
        }
        Insert: {
          body: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          dismissed_at?: string | null
          id?: string
          read_at?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
          workday_id?: string | null
        }
        Update: {
          body?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          dismissed_at?: string | null
          id?: string
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
          workday_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: false
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_sign_in_at: string | null
          must_change_password: boolean | null
          phone: string | null
          primary_branch_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_sign_in_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          primary_branch_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          primary_branch_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_primary_branch"
            columns: ["primary_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      settlement_adjustments: {
        Row: {
          adjusted_by: string
          adjustment_amount: number
          created_at: string
          id: string
          reason: string
          settlement_id: string
        }
        Insert: {
          adjusted_by: string
          adjustment_amount: number
          created_at?: string
          id?: string
          reason: string
          settlement_id: string
        }
        Update: {
          adjusted_by?: string
          adjustment_amount?: number
          created_at?: string
          id?: string
          reason?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_adjustments_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          actual_cash: number
          actual_transfers: number
          branch_id: string
          courier_id: string
          created_at: string
          difference: number
          expected_cash: number
          expected_transfers: number
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          settlement_date: string
          status: string
          total_expenses: number
          updated_at: string
          workday_id: string
        }
        Insert: {
          actual_cash?: number
          actual_transfers?: number
          branch_id: string
          courier_id: string
          created_at?: string
          difference?: number
          expected_cash?: number
          expected_transfers?: number
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_date: string
          status?: string
          total_expenses?: number
          updated_at?: string
          workday_id: string
        }
        Update: {
          actual_cash?: number
          actual_transfers?: number
          branch_id?: string
          courier_id?: string
          created_at?: string
          difference?: number
          expected_cash?: number
          expected_transfers?: number
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_date?: string
          status?: string
          total_expenses?: number
          updated_at?: string
          workday_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: true
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by: string
          courier_id: string
          created_at: string
          id: string
          reason: string | null
          task_id: string
          unassigned_at: string | null
          unassigned_by: string | null
        }
        Insert: {
          assigned_by: string
          courier_id: string
          created_at?: string
          id?: string
          reason?: string | null
          task_id: string
          unassigned_at?: string | null
          unassigned_by?: string | null
        }
        Update: {
          assigned_by?: string
          courier_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          task_id?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sequences: {
        Row: {
          branch_id: string
          id: string
          last_seq: number
          task_type: string
          year: number
        }
        Insert: {
          branch_id: string
          id?: string
          last_seq?: number
          task_type: string
          year: number
        }
        Update: {
          branch_id?: string
          id?: string
          last_seq?: number
          task_type?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_sequences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status_history: {
        Row: {
          changed_by: string
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          reason: string | null
          task_id: string
          to_status: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          task_id: string
          to_status: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          task_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_status_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          address: string | null
          address_reference: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          assigned_courier_id: string | null
          branch_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          code: string
          company_name: string | null
          completed_at: string | null
          contact_name: string | null
          created_at: string
          created_by: string
          creation_origin: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          destination_contact: string | null
          evidence_url: string | null
          expected_collection_amount: number | null
          expected_collection_currency: string | null
          expected_payment_amount: number | null
          expected_payment_currency: string | null
          expected_payment_method: string | null
          financial_status: string
          id: string
          institution_name: string | null
          latitude: number | null
          longitude: number | null
          management_description: string | null
          maps_url: string | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          priority: string
          provider_name: string | null
          rejection_reason: string | null
          requires_collection: boolean
          requires_payment: boolean
          rescheduled_from_task_id: string | null
          route_order: number | null
          scheduled_date: string
          scheduled_deadline: string | null
          scheduled_start_time: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
          workday_id: string | null
        }
        Insert: {
          address?: string | null
          address_reference?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_courier_id?: string | null
          branch_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          code: string
          company_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          created_at?: string
          created_by: string
          creation_origin?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          destination_contact?: string | null
          evidence_url?: string | null
          expected_collection_amount?: number | null
          expected_collection_currency?: string | null
          expected_payment_amount?: number | null
          expected_payment_currency?: string | null
          expected_payment_method?: string | null
          financial_status?: string
          id?: string
          institution_name?: string | null
          latitude?: number | null
          longitude?: number | null
          management_description?: string | null
          maps_url?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          priority?: string
          provider_name?: string | null
          rejection_reason?: string | null
          requires_collection?: boolean
          requires_payment?: boolean
          rescheduled_from_task_id?: string | null
          route_order?: number | null
          scheduled_date: string
          scheduled_deadline?: string | null
          scheduled_start_time?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          workday_id?: string | null
        }
        Update: {
          address?: string | null
          address_reference?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_courier_id?: string | null
          branch_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          code?: string
          company_name?: string | null
          completed_at?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string
          creation_origin?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          destination_contact?: string | null
          evidence_url?: string | null
          expected_collection_amount?: number | null
          expected_collection_currency?: string | null
          expected_payment_amount?: number | null
          expected_payment_currency?: string | null
          expected_payment_method?: string | null
          financial_status?: string
          id?: string
          institution_name?: string | null
          latitude?: number | null
          longitude?: number | null
          management_description?: string | null
          maps_url?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          priority?: string
          provider_name?: string | null
          rejection_reason?: string | null
          requires_collection?: boolean
          requires_payment?: boolean
          rescheduled_from_task_id?: string | null
          route_order?: number | null
          scheduled_date?: string
          scheduled_deadline?: string | null
          scheduled_start_time?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          workday_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_courier_id_fkey"
            columns: ["assigned_courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_rescheduled_from_task_id_fkey"
            columns: ["rescheduled_from_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workday_id_fkey"
            columns: ["workday_id"]
            isOneToOne: false
            referencedRelation: "workdays"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_services: {
        Row: {
          branch_id: string
          contact_name: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          contact_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branches: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          branch_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workdays: {
        Row: {
          branch_id: string
          closed_at: string | null
          closed_by: string | null
          courier_id: string
          created_at: string
          end_time: string | null
          final_km: number | null
          id: string
          initial_cash: number
          initial_km: number
          notes: string | null
          opened_at: string
          opened_by: string
          start_time: string | null
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closed_by?: string | null
          courier_id: string
          created_at?: string
          end_time?: string | null
          final_km?: number | null
          id?: string
          initial_cash?: number
          initial_km?: number
          notes?: string | null
          opened_at?: string
          opened_by: string
          start_time?: string | null
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closed_by?: string | null
          courier_id?: string
          created_at?: string
          end_time?: string | null
          final_km?: number | null
          id?: string
          initial_cash?: number
          initial_km?: number
          notes?: string | null
          opened_at?: string
          opened_by?: string
          start_time?: string | null
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workdays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workdays_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workdays_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workdays_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_settlement: { Args: { p_workday_id: string }; Returns: string }
      generate_task_code:
        | {
            Args: {
              p_branch_code: string
              p_branch_id: string
              p_task_type: string
            }
            Returns: string
          }
        | {
            Args: { p_branch_id: string; p_task_type: string }
            Returns: string
          }
      get_current_exchange_rate: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: number
      }
      get_my_branch_ids: { Args: never; Returns: string[] }
      get_my_branches: { Args: never; Returns: string[] }
      get_my_profile: { Args: never; Returns: Json }
      get_my_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_general_admin: { Args: never; Returns: boolean }
      reset_database_for_new_client: { Args: never; Returns: Json }
      log_audit_event: {
        Args: {
          p_action: string
          p_branch_id?: string
          p_changes?: Json
          p_entity_code?: string
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
