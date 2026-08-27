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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_assignments: {
        Row: {
          account_id: string
          assigned_at: string
          created_at: string
          end_date: string | null
          id: string
          profile_id: string | null
          start_date: string
          unassigned_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          assigned_at?: string
          created_at?: string
          end_date?: string | null
          id?: string
          profile_id?: string | null
          start_date?: string
          unassigned_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          assigned_at?: string
          created_at?: string
          end_date?: string | null
          id?: string
          profile_id?: string | null
          start_date?: string
          unassigned_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_domain: string
          account_email: string
          account_password: string
          assigned_at: string | null
          assigned_to: string | null
          campaign: boolean
          created_at: string
          created_by: string | null
          currency: string
          drive_folder_id: string | null
          folder_name: string | null
          follow_message: string
          id: string
          is_manual: boolean
          main_message: string
          media: Json
          message: boolean
          model_active: boolean
          model_agency: string
          model_id: string
          model_language: string
          model_status: string
          platform: string
          post: boolean
          subfolder_name: string | null
          username: string | null
        }
        Insert: {
          account_domain?: string
          account_email?: string
          account_password?: string
          assigned_at?: string | null
          assigned_to?: string | null
          campaign?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          drive_folder_id?: string | null
          folder_name?: string | null
          follow_message?: string
          id?: string
          is_manual?: boolean
          main_message?: string
          media?: Json
          message?: boolean
          model_active?: boolean
          model_agency?: string
          model_id: string
          model_language?: string
          model_status?: string
          platform?: string
          post?: boolean
          subfolder_name?: string | null
          username?: string | null
        }
        Update: {
          account_domain?: string
          account_email?: string
          account_password?: string
          assigned_at?: string | null
          assigned_to?: string | null
          campaign?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          drive_folder_id?: string | null
          folder_name?: string | null
          follow_message?: string
          id?: string
          is_manual?: boolean
          main_message?: string
          media?: Json
          message?: boolean
          model_active?: boolean
          model_agency?: string
          model_id?: string
          model_language?: string
          model_status?: string
          platform?: string
          post?: boolean
          subfolder_name?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_data: {
        Row: {
          account_id: string
          amounts: Json
          created_at: string
          date: string
          followers: number | null
          id: string
          mass_dms: number | null
          model_id: string | null
          oldest_chat: number | null
          platform: string
          subscribers: number | null
          total: number
          unread_chats: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amounts?: Json
          created_at?: string
          date: string
          followers?: number | null
          id?: string
          mass_dms?: number | null
          model_id?: string | null
          oldest_chat?: number | null
          platform: string
          subscribers?: number | null
          total?: number
          unread_chats?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amounts?: Json
          created_at?: string
          date?: string
          followers?: number | null
          id?: string
          mass_dms?: number | null
          model_id?: string | null
          oldest_chat?: number | null
          platform?: string
          subscribers?: number | null
          total?: number
          unread_chats?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_2fa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_account_access: {
        Row: {
          account_id: string
          admin_user_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
        }
        Insert: {
          account_id: string
          admin_user_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Update: {
          account_id?: string
          admin_user_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_account_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_preferences: {
        Row: {
          new_request: boolean
          new_revenue: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          new_request?: boolean
          new_revenue?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          new_request?: boolean
          new_revenue?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_request_read_states: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          last_read_at: string
          request_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          last_read_at: string
          request_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_request_read_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "model_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_totp_secrets: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          totp_secret: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          totp_secret: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          totp_secret?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_billing_status: {
        Row: {
          agency: string
          in_progress: boolean
          month: number | null
          updated_at: string
          updated_by: string | null
          year: number | null
        }
        Insert: {
          agency: string
          in_progress?: boolean
          month?: number | null
          updated_at?: string
          updated_by?: string | null
          year?: number | null
        }
        Update: {
          agency?: string
          in_progress?: boolean
          month?: number | null
          updated_at?: string
          updated_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          id: string
          prompt_key: string
          prompt_text: string
          prompt_text_de_is_auto: boolean
          prompt_text_en: string
          prompt_text_en_is_auto: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          prompt_key?: string
          prompt_text: string
          prompt_text_de_is_auto?: boolean
          prompt_text_en?: string
          prompt_text_en_is_auto?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          prompt_key?: string
          prompt_text?: string
          prompt_text_de_is_auto?: boolean
          prompt_text_en?: string
          prompt_text_en_is_auto?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_install_status: {
        Row: {
          created_at: string
          last_active_at: string
          push_enabled_at: string | null
          pwa_installed_at: string | null
          role: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          last_active_at?: string
          push_enabled_at?: string | null
          pwa_installed_at?: string | null
          role?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          last_active_at?: string
          push_enabled_at?: string | null
          pwa_installed_at?: string | null
          role?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      automated_reminder_log: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_messages: {
        Row: {
          account_id: string | null
          created_at: string
          follow_up_message: string
          id: string
          is_active: boolean
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          follow_up_message?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          follow_up_message?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_notifications: {
        Row: {
          account_email: string | null
          account_id: string | null
          created_at: string
          date: string
          id: string
          message: string
          platform: string
          type: string
        }
        Insert: {
          account_email?: string | null
          account_id?: string | null
          created_at?: string
          date?: string
          id?: string
          message: string
          platform: string
          type: string
        }
        Update: {
          account_email?: string | null
          account_id?: string | null
          created_at?: string
          date?: string
          id?: string
          message?: string
          platform?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brezzels_comment_assignments: {
        Row: {
          account_id: string | null
          assigned_date: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          target_id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          assigned_date?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          target_id: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          assigned_date?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brezzels_comment_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brezzels_comment_assignments_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "brezzels_comment_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      brezzels_comment_targets: {
        Row: {
          active: boolean
          created_at: string
          id: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      chatter_daily_commitment: {
        Row: {
          auto_confirmed_by_revenue: boolean
          committed_at: string
          confirmed_at: string | null
          confirmed_by_user: boolean | null
          created_at: string
          daily_goal: number | null
          date: string
          honesty_verdict: string | null
          id: string
          signal_snapshot: Json
          slots: string[]
          streak_snapshot: number | null
          tier_snapshot: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          auto_confirmed_by_revenue?: boolean
          committed_at?: string
          confirmed_at?: string | null
          confirmed_by_user?: boolean | null
          created_at?: string
          daily_goal?: number | null
          date: string
          honesty_verdict?: string | null
          id?: string
          signal_snapshot?: Json
          slots?: string[]
          streak_snapshot?: number | null
          tier_snapshot?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          auto_confirmed_by_revenue?: boolean
          committed_at?: string
          confirmed_at?: string | null
          confirmed_by_user?: boolean | null
          created_at?: string
          daily_goal?: number | null
          date?: string
          honesty_verdict?: string | null
          id?: string
          signal_snapshot?: Json
          slots?: string[]
          streak_snapshot?: number | null
          tier_snapshot?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      chatter_push_log: {
        Row: {
          body: string
          context: Json
          id: string
          sent_at: string
          title: string
          trigger_key: string
          user_id: string
        }
        Insert: {
          body: string
          context?: Json
          id?: string
          sent_at?: string
          title: string
          trigger_key: string
          user_id: string
        }
        Update: {
          body?: string
          context?: Json
          id?: string
          sent_at?: string
          title?: string
          trigger_key?: string
          user_id?: string
        }
        Relationships: []
      }
      chatter_summaries: {
        Row: {
          created_at: string
          id: string
          summary: string
          summary_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary?: string
          summary_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          summary?: string
          summary_date?: string
          user_id?: string
        }
        Relationships: []
      }
      chatters: {
        Row: {
          bank_account_holder: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          brezzels_revenue: number
          compensation_type: string
          created_at: string
          created_by: string | null
          crypto_address: string
          currency: string
          custom_platform_name: string
          custom_revenue: number
          fourbased_revenue: number
          hourly_rate: number
          hours_worked: number
          id: string
          invoice_crypto_coin: string
          invoice_crypto_network: string
          invoice_currency: string
          invoice_description: string
          invoice_exchange_rate: string
          invoice_last_credit_note_number: string
          invoice_last_generated_at: string | null
          invoice_net_amount: number
          invoice_payment_date: string | null
          invoice_receiver_wallet: string
          invoice_service_period_end: string | null
          invoice_service_period_start: string | null
          invoice_tx_hash: string
          maloum_revenue: number
          name: string
          payment_method: string
          platform: string
          provider_address: string
          provider_is_business: boolean
          provider_name_override: string
          provider_vat_id: string
          revenue_percentage: number
          role: string
          updated_at: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          brezzels_revenue?: number
          compensation_type?: string
          created_at?: string
          created_by?: string | null
          crypto_address?: string
          currency?: string
          custom_platform_name?: string
          custom_revenue?: number
          fourbased_revenue?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          invoice_crypto_coin?: string
          invoice_crypto_network?: string
          invoice_currency?: string
          invoice_description?: string
          invoice_exchange_rate?: string
          invoice_last_credit_note_number?: string
          invoice_last_generated_at?: string | null
          invoice_net_amount?: number
          invoice_payment_date?: string | null
          invoice_receiver_wallet?: string
          invoice_service_period_end?: string | null
          invoice_service_period_start?: string | null
          invoice_tx_hash?: string
          maloum_revenue?: number
          name?: string
          payment_method?: string
          platform?: string
          provider_address?: string
          provider_is_business?: boolean
          provider_name_override?: string
          provider_vat_id?: string
          revenue_percentage?: number
          role?: string
          updated_at?: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          brezzels_revenue?: number
          compensation_type?: string
          created_at?: string
          created_by?: string | null
          crypto_address?: string
          currency?: string
          custom_platform_name?: string
          custom_revenue?: number
          fourbased_revenue?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          invoice_crypto_coin?: string
          invoice_crypto_network?: string
          invoice_currency?: string
          invoice_description?: string
          invoice_exchange_rate?: string
          invoice_last_credit_note_number?: string
          invoice_last_generated_at?: string | null
          invoice_net_amount?: number
          invoice_payment_date?: string | null
          invoice_receiver_wallet?: string
          invoice_service_period_end?: string | null
          invoice_service_period_start?: string | null
          invoice_tx_hash?: string
          maloum_revenue?: number
          name?: string
          payment_method?: string
          platform?: string
          provider_address?: string
          provider_is_business?: boolean
          provider_name_override?: string
          provider_vat_id?: string
          revenue_percentage?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_drop_reads: {
        Row: {
          drop_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          drop_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          drop_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drop_reads_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "content_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      content_drops: {
        Row: {
          content_link: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          model_id: string
          model_name: string
        }
        Insert: {
          content_link?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          model_id: string
          model_name?: string
        }
        Update: {
          content_link?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          model_id?: string
          model_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drops_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          marketer_user_id: string | null
          model_id: string | null
          plan_id: string
          start_date: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          marketer_user_id?: string | null
          model_id?: string | null
          plan_id: string
          start_date?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          marketer_user_id?: string | null
          model_id?: string | null
          plan_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_assignments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          items: Json
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          items?: Json
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          items?: Json
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_task_status: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          day_number: number
          done: boolean
          id: string
          item_index: number
          note: string | null
          updated_at: string
          upload_url: string | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          day_number: number
          done?: boolean
          id?: string
          item_index: number
          note?: string | null
          updated_at?: string
          upload_url?: string | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          day_number?: number
          done?: boolean
          id?: string
          item_index?: number
          note?: string | null
          updated_at?: string
          upload_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_task_status_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "content_plan_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_week_feedback: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string | null
          feedback: string | null
          folder_url: string | null
          id: string
          status: string
          updated_at: string
          week_number: number
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          folder_url?: string | null
          id?: string
          status?: string
          updated_at?: string
          week_number: number
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          folder_url?: string | null
          id?: string
          status?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_week_feedback_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "content_plan_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          account_id: string | null
          chatter_name: string | null
          created_at: string
          created_by: string
          credit_note_date: string
          credit_note_number: string
          crypto_coin: string | null
          description: string
          exchange_rate: string | null
          gross_amount: number
          id: string
          net_amount: number
          payment_date: string | null
          payment_method: string | null
          provider_address: string
          provider_is_business: boolean
          provider_name: string
          provider_vat_id: string | null
          service_period_end: string
          service_period_start: string
          settled_by_credit_note_number: string | null
          tx_hash: string | null
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          account_id?: string | null
          chatter_name?: string | null
          created_at?: string
          created_by: string
          credit_note_date?: string
          credit_note_number: string
          crypto_coin?: string | null
          description?: string
          exchange_rate?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_date?: string | null
          payment_method?: string | null
          provider_address?: string
          provider_is_business?: boolean
          provider_name?: string
          provider_vat_id?: string | null
          service_period_end?: string
          service_period_start?: string
          settled_by_credit_note_number?: string | null
          tx_hash?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          account_id?: string | null
          chatter_name?: string | null
          created_at?: string
          created_by?: string
          credit_note_date?: string
          credit_note_number?: string
          crypto_coin?: string | null
          description?: string
          exchange_rate?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_date?: string | null
          payment_method?: string | null
          provider_address?: string
          provider_is_business?: boolean
          provider_name?: string
          provider_vat_id?: string | null
          service_period_end?: string
          service_period_start?: string
          settled_by_credit_note_number?: string | null
          tx_hash?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_revenue: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deleted_records: {
        Row: {
          data: Json
          deleted_at: string
          deleted_by: string | null
          email: string | null
          entity_type: string
          group_name: string | null
          id: string
          model_agency: string | null
          name: string | null
          original_id: string
          platform: string | null
          reason: string | null
          restored_at: string | null
          restored_by: string | null
          telegram_id: string | null
          username: string | null
        }
        Insert: {
          data?: Json
          deleted_at?: string
          deleted_by?: string | null
          email?: string | null
          entity_type: string
          group_name?: string | null
          id?: string
          model_agency?: string | null
          name?: string | null
          original_id: string
          platform?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          telegram_id?: string | null
          username?: string | null
        }
        Update: {
          data?: Json
          deleted_at?: string
          deleted_by?: string | null
          email?: string | null
          entity_type?: string
          group_name?: string | null
          id?: string
          model_agency?: string | null
          name?: string | null
          original_id?: string
          platform?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          telegram_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fanvue_instagram_post_snapshots: {
        Row: {
          created_at: string
          id: string
          instagram_url: string | null
          last_post_at: string | null
          model_id: string
          posts_30d: number
          posts_7d: number
          posts_total: number
          recorded_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_url?: string | null
          last_post_at?: string | null
          model_id: string
          posts_30d?: number
          posts_7d?: number
          posts_total?: number
          recorded_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_url?: string | null
          last_post_at?: string | null
          model_id?: string
          posts_30d?: number
          posts_7d?: number
          posts_total?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanvue_instagram_post_snapshots_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      fanvue_instagram_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          followers: number
          id: string
          instagram_url: string | null
          model_id: string
          recorded_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          followers: number
          id?: string
          instagram_url?: string | null
          model_id: string
          recorded_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          followers?: number
          id?: string
          instagram_url?: string | null
          model_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanvue_instagram_snapshots_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      fanvue_model_chatter_assignments: {
        Row: {
          chatter_name: string
          created_at: string
          ended_at: string | null
          id: string
          model_id: string
          started_at: string
        }
        Insert: {
          chatter_name: string
          created_at?: string
          ended_at?: string | null
          id?: string
          model_id: string
          started_at?: string
        }
        Update: {
          chatter_name?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          model_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanvue_model_chatter_assignments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      fanvue_model_users: {
        Row: {
          created_at: string
          email: string
          id: string
          model_id: string
          plaintext_password: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          model_id: string
          plaintext_password?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          model_id?: string
          plaintext_password?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanvue_model_users_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      fanvue_models: {
        Row: {
          account_setup: boolean
          archived_at: string | null
          chatter_assigned: boolean
          chatter_name: string
          chatter_needed: boolean
          created_at: string
          created_by: string | null
          id: string
          instagram_logins: Json
          instagram_url: string
          instagram_urls: Json
          is_active: boolean
          linktree_url: string | null
          marketers: Json
          name: string
          notes: string
          other_social: string
          platform_logins: Json
          social_linked: boolean
          stage: string
          status: string
          telegram_backgrounds_url: string | null
          telegram_feed_url: string | null
          telegram_reels_url: string | null
          tiktok_url: string
          twitter_url: string
          updated_at: string
          username: string
        }
        Insert: {
          account_setup?: boolean
          archived_at?: string | null
          chatter_assigned?: boolean
          chatter_name?: string
          chatter_needed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          instagram_logins?: Json
          instagram_url?: string
          instagram_urls?: Json
          is_active?: boolean
          linktree_url?: string | null
          marketers?: Json
          name?: string
          notes?: string
          other_social?: string
          platform_logins?: Json
          social_linked?: boolean
          stage?: string
          status?: string
          telegram_backgrounds_url?: string | null
          telegram_feed_url?: string | null
          telegram_reels_url?: string | null
          tiktok_url?: string
          twitter_url?: string
          updated_at?: string
          username?: string
        }
        Update: {
          account_setup?: boolean
          archived_at?: string | null
          chatter_assigned?: boolean
          chatter_name?: string
          chatter_needed?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          instagram_logins?: Json
          instagram_url?: string
          instagram_urls?: Json
          is_active?: boolean
          linktree_url?: string | null
          marketers?: Json
          name?: string
          notes?: string
          other_social?: string
          platform_logins?: Json
          social_linked?: boolean
          stage?: string
          status?: string
          telegram_backgrounds_url?: string | null
          telegram_feed_url?: string | null
          telegram_reels_url?: string | null
          tiktok_url?: string
          twitter_url?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      group_billings: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          group_name: string
          id: string
          line_items: Json
          period_end: string
          period_start: string
          total_commission: number
          total_gross: number
          total_net: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          group_name: string
          id?: string
          line_items?: Json
          period_end: string
          period_start: string
          total_commission?: number
          total_gross?: number
          total_net?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          group_name?: string
          id?: string
          line_items?: Json
          period_end?: string
          period_start?: string
          total_commission?: number
          total_gross?: number
          total_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_billings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "model_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_settings: {
        Row: {
          address: string
          id: string
          kvk: string
          name: string
          updated_at: string
          vat_id: string
        }
        Insert: {
          address?: string
          id?: string
          kvk?: string
          name?: string
          updated_at?: string
          vat_id?: string
        }
        Update: {
          address?: string
          id?: string
          kvk?: string
          name?: string
          updated_at?: string
          vat_id?: string
        }
        Relationships: []
      }
      library_reads: {
        Row: {
          completed_at: string | null
          content_key: string
          created_at: string
          id: string
          progress_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_key: string
          created_at?: string
          id?: string
          progress_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_key?: string
          created_at?: string
          id?: string
          progress_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          id: string
          logged_in_at: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_in_at?: string
          user_id: string
        }
        Update: {
          id?: string
          logged_in_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketer_coaching_progress: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: []
      }
      marketer_daily_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          task_date: string
          task_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          task_date: string
          task_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          task_date?: string
          task_key?: string
          user_id?: string
        }
        Relationships: []
      }
      marketer_list_items: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          list_id: string
          notes: string | null
          position: number
          reference_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          list_id: string
          notes?: string | null
          position?: number
          reference_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          list_id?: string
          notes?: string | null
          position?: number
          reference_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketer_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_lists: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          model_id: string
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model_id: string
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          model_id?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_lists_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      marketer_model_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          marketer_user_id: string
          model_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          marketer_user_id: string
          model_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          marketer_user_id?: string
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_model_assignments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "fanvue_models"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          account_id: string
          created_at: string
          date: string
          follow: number
          id: string
          main: number
          total: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          date: string
          follow?: number
          id?: string
          main?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          date?: string
          follow?: number
          id?: string
          main?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      model_biographies: {
        Row: {
          drive_file_id: string | null
          fetched_at: string
          file_name: string | null
          html: string | null
          model_id: string
          modified_time: string | null
        }
        Insert: {
          drive_file_id?: string | null
          fetched_at?: string
          file_name?: string | null
          html?: string | null
          model_id: string
          modified_time?: string | null
        }
        Update: {
          drive_file_id?: string | null
          fetched_at?: string
          file_name?: string | null
          html?: string | null
          model_id?: string
          modified_time?: string | null
        }
        Relationships: []
      }
      model_dashboard: {
        Row: {
          botdm_done: boolean
          brezzels_botdm_done: boolean
          brezzels_massdm_done: boolean
          brezzels_revenue: number | null
          brezzels_submitted: boolean
          contract_file_path: string | null
          created_at: string
          crypto_address: string | null
          currency: string | null
          fourbased_botdm_done: boolean
          fourbased_massdm_done: boolean
          fourbased_revenue: number | null
          fourbased_submitted: boolean
          id: string
          last_fetched_at: string | null
          last_fetched_month: number | null
          last_fetched_year: number | null
          maloum_botdm_done: boolean
          maloum_massdm_done: boolean
          maloum_revenue: number | null
          maloum_submitted: boolean
          massdm_done: boolean
          model_id: string
          monthly_revenue: number | null
          notes: string | null
          revenue_percentage: number | null
          total_revenue: number | null
          updated_at: string
          yesterday_revenue: number | null
        }
        Insert: {
          botdm_done?: boolean
          brezzels_botdm_done?: boolean
          brezzels_massdm_done?: boolean
          brezzels_revenue?: number | null
          brezzels_submitted?: boolean
          contract_file_path?: string | null
          created_at?: string
          crypto_address?: string | null
          currency?: string | null
          fourbased_botdm_done?: boolean
          fourbased_massdm_done?: boolean
          fourbased_revenue?: number | null
          fourbased_submitted?: boolean
          id?: string
          last_fetched_at?: string | null
          last_fetched_month?: number | null
          last_fetched_year?: number | null
          maloum_botdm_done?: boolean
          maloum_massdm_done?: boolean
          maloum_revenue?: number | null
          maloum_submitted?: boolean
          massdm_done?: boolean
          model_id: string
          monthly_revenue?: number | null
          notes?: string | null
          revenue_percentage?: number | null
          total_revenue?: number | null
          updated_at?: string
          yesterday_revenue?: number | null
        }
        Update: {
          botdm_done?: boolean
          brezzels_botdm_done?: boolean
          brezzels_massdm_done?: boolean
          brezzels_revenue?: number | null
          brezzels_submitted?: boolean
          contract_file_path?: string | null
          created_at?: string
          crypto_address?: string | null
          currency?: string | null
          fourbased_botdm_done?: boolean
          fourbased_massdm_done?: boolean
          fourbased_revenue?: number | null
          fourbased_submitted?: boolean
          id?: string
          last_fetched_at?: string | null
          last_fetched_month?: number | null
          last_fetched_year?: number | null
          maloum_botdm_done?: boolean
          maloum_massdm_done?: boolean
          maloum_revenue?: number | null
          maloum_submitted?: boolean
          massdm_done?: boolean
          model_id?: string
          monthly_revenue?: number | null
          notes?: string | null
          revenue_percentage?: number | null
          total_revenue?: number | null
          updated_at?: string
          yesterday_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_dashboard_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_groups: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          default_commission: number
          id: string
          name: string
          notes: string
          referral_source: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          default_commission?: number
          id?: string
          name: string
          notes?: string
          referral_source?: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          default_commission?: number
          id?: string
          name?: string
          notes?: string
          referral_source?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_profiles: {
        Row: {
          account_name: string | null
          additional_info: string | null
          age: string | null
          approved_snapshot: Json | null
          bra_size: string | null
          city: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          content_anal_fingering: boolean | null
          content_anal_penetration: boolean | null
          content_anal_plug: boolean | null
          content_audios_for_chat: boolean | null
          content_dick_ratings: boolean | null
          content_joi: boolean | null
          content_moaning_name: boolean | null
          content_orgasm: boolean | null
          content_preferences: string | null
          content_roleplay_costumes: boolean | null
          content_squirting: boolean | null
          content_video_speaking: boolean | null
          created_at: string
          dream: string | null
          education: string | null
          favorite_color: string | null
          favorite_food: string | null
          favorite_movie: string | null
          favorite_music: string | null
          height: string | null
          hobbies: string | null
          id: string
          languages: string | null
          last_change_at: string | null
          model_id: string
          name: string | null
          natural_hair: string | null
          no_gos: string | null
          occupation: string | null
          personality: string | null
          place_of_birth: string | null
          shoe_size: string | null
          source_language: string
          special_marks: string | null
          submitted_at: string | null
          updated_at: string
          weight: string | null
          work: string | null
        }
        Insert: {
          account_name?: string | null
          additional_info?: string | null
          age?: string | null
          approved_snapshot?: Json | null
          bra_size?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          content_anal_fingering?: boolean | null
          content_anal_penetration?: boolean | null
          content_anal_plug?: boolean | null
          content_audios_for_chat?: boolean | null
          content_dick_ratings?: boolean | null
          content_joi?: boolean | null
          content_moaning_name?: boolean | null
          content_orgasm?: boolean | null
          content_preferences?: string | null
          content_roleplay_costumes?: boolean | null
          content_squirting?: boolean | null
          content_video_speaking?: boolean | null
          created_at?: string
          dream?: string | null
          education?: string | null
          favorite_color?: string | null
          favorite_food?: string | null
          favorite_movie?: string | null
          favorite_music?: string | null
          height?: string | null
          hobbies?: string | null
          id?: string
          languages?: string | null
          last_change_at?: string | null
          model_id: string
          name?: string | null
          natural_hair?: string | null
          no_gos?: string | null
          occupation?: string | null
          personality?: string | null
          place_of_birth?: string | null
          shoe_size?: string | null
          source_language?: string
          special_marks?: string | null
          submitted_at?: string | null
          updated_at?: string
          weight?: string | null
          work?: string | null
        }
        Update: {
          account_name?: string | null
          additional_info?: string | null
          age?: string | null
          approved_snapshot?: Json | null
          bra_size?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          content_anal_fingering?: boolean | null
          content_anal_penetration?: boolean | null
          content_anal_plug?: boolean | null
          content_audios_for_chat?: boolean | null
          content_dick_ratings?: boolean | null
          content_joi?: boolean | null
          content_moaning_name?: boolean | null
          content_orgasm?: boolean | null
          content_preferences?: string | null
          content_roleplay_costumes?: boolean | null
          content_squirting?: boolean | null
          content_video_speaking?: boolean | null
          created_at?: string
          dream?: string | null
          education?: string | null
          favorite_color?: string | null
          favorite_food?: string | null
          favorite_movie?: string | null
          favorite_music?: string | null
          height?: string | null
          hobbies?: string | null
          id?: string
          languages?: string | null
          last_change_at?: string | null
          model_id?: string
          name?: string | null
          natural_hair?: string | null
          no_gos?: string | null
          occupation?: string | null
          personality?: string | null
          place_of_birth?: string | null
          shoe_size?: string | null
          source_language?: string
          special_marks?: string | null
          submitted_at?: string | null
          updated_at?: string
          weight?: string | null
          work?: string | null
        }
        Relationships: []
      }
      model_request_followups: {
        Row: {
          admin_id: string | null
          id: string
          note: string | null
          request_id: string
          sent_at: string
        }
        Insert: {
          admin_id?: string | null
          id?: string
          note?: string | null
          request_id: string
          sent_at?: string
        }
        Update: {
          admin_id?: string | null
          id?: string
          note?: string | null
          request_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_request_followups_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "model_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      model_request_messages: {
        Row: {
          approved_by_admin: string | null
          approved_by_admin_at: string | null
          attachments: Json
          body: string
          created_at: string
          id: string
          request_id: string
          sender_role: string
          user_id: string
          visible_to_chatter: boolean
        }
        Insert: {
          approved_by_admin?: string | null
          approved_by_admin_at?: string | null
          attachments?: Json
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_role: string
          user_id: string
          visible_to_chatter?: boolean
        }
        Update: {
          approved_by_admin?: string | null
          approved_by_admin_at?: string | null
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_role?: string
          user_id?: string
          visible_to_chatter?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "model_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "model_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      model_requests: {
        Row: {
          admin_comment: string | null
          attachments: Json
          content_link: string | null
          created_at: string
          customer_name: string | null
          description: string
          forwarded_to_model_at: string | null
          id: string
          model_completed_at: string | null
          model_id: string | null
          model_language: string
          model_name: string
          model_status: string | null
          price: number | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          attachments?: Json
          content_link?: string | null
          created_at?: string
          customer_name?: string | null
          description: string
          forwarded_to_model_at?: string | null
          id?: string
          model_completed_at?: string | null
          model_id?: string | null
          model_language?: string
          model_name: string
          model_status?: string | null
          price?: number | null
          request_type?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          attachments?: Json
          content_link?: string | null
          created_at?: string
          customer_name?: string | null
          description?: string
          forwarded_to_model_at?: string | null
          id?: string
          model_completed_at?: string | null
          model_id?: string | null
          model_language?: string
          model_name?: string
          model_status?: string | null
          price?: number | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_users: {
        Row: {
          account_id: string | null
          created_at: string
          email: string | null
          id: string
          model_id: string | null
          plaintext_password: string | null
          pwa_installed: boolean
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          model_id?: string | null
          plaintext_password?: string | null
          pwa_installed?: boolean
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          model_id?: string | null
          plaintext_password?: string | null
          pwa_installed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_users_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          address: string | null
          bank_account_holder: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          commission_override: number | null
          commission_override_brezzels: number | null
          commission_override_fourbased: number | null
          commission_override_maloum: number | null
          contract_file_path: string | null
          created_at: string
          created_by: string | null
          crypto_address: string | null
          currency: string
          drive_folder_id: string | null
          fourbased_payout_configured: boolean
          group_id: string | null
          id: string
          invoice_crypto_coin: string
          invoice_crypto_network: string
          invoice_currency: string
          invoice_description: string
          invoice_exchange_rate: string
          invoice_last_credit_note_number: string
          invoice_last_generated_at: string | null
          invoice_net_amount: number
          invoice_payment_date: string | null
          invoice_receiver_wallet: string
          invoice_service_period_end: string | null
          invoice_service_period_start: string | null
          invoice_tx_hash: string
          model_active: boolean
          model_agency: string
          model_language: string
          model_status: string
          name: string
          notes: string | null
          payment_method: string
          provider_address: string
          provider_is_business: boolean
          provider_name_override: string
          provider_vat_id: string
          referral_source: string
          referrer_tag: string
          revenue_percentage: number
          revenue_percentage_admireme: number
          revenue_percentage_brezzels: number
          revenue_percentage_fourbased: number
          revenue_percentage_maloum: number
          updated_at: string
          username: string | null
        }
        Insert: {
          address?: string | null
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          commission_override?: number | null
          commission_override_brezzels?: number | null
          commission_override_fourbased?: number | null
          commission_override_maloum?: number | null
          contract_file_path?: string | null
          created_at?: string
          created_by?: string | null
          crypto_address?: string | null
          currency?: string
          drive_folder_id?: string | null
          fourbased_payout_configured?: boolean
          group_id?: string | null
          id?: string
          invoice_crypto_coin?: string
          invoice_crypto_network?: string
          invoice_currency?: string
          invoice_description?: string
          invoice_exchange_rate?: string
          invoice_last_credit_note_number?: string
          invoice_last_generated_at?: string | null
          invoice_net_amount?: number
          invoice_payment_date?: string | null
          invoice_receiver_wallet?: string
          invoice_service_period_end?: string | null
          invoice_service_period_start?: string | null
          invoice_tx_hash?: string
          model_active?: boolean
          model_agency?: string
          model_language?: string
          model_status?: string
          name?: string
          notes?: string | null
          payment_method?: string
          provider_address?: string
          provider_is_business?: boolean
          provider_name_override?: string
          provider_vat_id?: string
          referral_source?: string
          referrer_tag?: string
          revenue_percentage?: number
          revenue_percentage_admireme?: number
          revenue_percentage_brezzels?: number
          revenue_percentage_fourbased?: number
          revenue_percentage_maloum?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          address?: string | null
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          commission_override?: number | null
          commission_override_brezzels?: number | null
          commission_override_fourbased?: number | null
          commission_override_maloum?: number | null
          contract_file_path?: string | null
          created_at?: string
          created_by?: string | null
          crypto_address?: string | null
          currency?: string
          drive_folder_id?: string | null
          fourbased_payout_configured?: boolean
          group_id?: string | null
          id?: string
          invoice_crypto_coin?: string
          invoice_crypto_network?: string
          invoice_currency?: string
          invoice_description?: string
          invoice_exchange_rate?: string
          invoice_last_credit_note_number?: string
          invoice_last_generated_at?: string | null
          invoice_net_amount?: number
          invoice_payment_date?: string | null
          invoice_receiver_wallet?: string
          invoice_service_period_end?: string | null
          invoice_service_period_start?: string | null
          invoice_tx_hash?: string
          model_active?: boolean
          model_agency?: string
          model_language?: string
          model_status?: string
          name?: string
          notes?: string | null
          payment_method?: string
          provider_address?: string
          provider_is_business?: boolean
          provider_name_override?: string
          provider_vat_id?: string
          referral_source?: string
          referrer_tag?: string
          revenue_percentage?: number
          revenue_percentage_admireme?: number
          revenue_percentage_brezzels?: number
          revenue_percentage_fourbased?: number
          revenue_percentage_maloum?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "model_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          body_de_is_auto: boolean
          body_en: string
          body_en_is_auto: boolean
          id: string
          label: string
          template_key: string
          title: string
          title_de_is_auto: boolean
          title_en: string
          title_en_is_auto: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          body_de_is_auto?: boolean
          body_en?: string
          body_en_is_auto?: boolean
          id?: string
          label?: string
          template_key: string
          title?: string
          title_de_is_auto?: boolean
          title_en?: string
          title_en_is_auto?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          body_de_is_auto?: boolean
          body_en?: string
          body_en_is_auto?: boolean
          id?: string
          label?: string
          template_key?: string
          title?: string
          title_de_is_auto?: boolean
          title_en?: string
          title_en_is_auto?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          id: string
          recipients_count: number | null
          sent_at: string
          sent_by: string | null
          title: string
        }
        Insert: {
          body: string
          id?: string
          recipients_count?: number | null
          sent_at?: string
          sent_by?: string | null
          title: string
        }
        Update: {
          body?: string
          id?: string
          recipients_count?: number | null
          sent_at?: string
          sent_by?: string | null
          title?: string
        }
        Relationships: []
      }
      payout_revenue: {
        Row: {
          admireme_revenue: number | null
          billed_amount: number | null
          billed_at: string | null
          billed_credit_note_number: string | null
          billed_snapshot: Json | null
          billing_in_progress: boolean
          brezzels_revenue: number | null
          created_at: string
          fourbased_revenue: number | null
          id: string
          last_fetched_at: string
          last_fetched_month: number
          last_fetched_year: number
          maloum_revenue: number | null
          model_id: string
          monthly_revenue: number
          raw_response: Json | null
          updated_at: string
        }
        Insert: {
          admireme_revenue?: number | null
          billed_amount?: number | null
          billed_at?: string | null
          billed_credit_note_number?: string | null
          billed_snapshot?: Json | null
          billing_in_progress?: boolean
          brezzels_revenue?: number | null
          created_at?: string
          fourbased_revenue?: number | null
          id?: string
          last_fetched_at?: string
          last_fetched_month: number
          last_fetched_year: number
          maloum_revenue?: number | null
          model_id: string
          monthly_revenue?: number
          raw_response?: Json | null
          updated_at?: string
        }
        Update: {
          admireme_revenue?: number | null
          billed_amount?: number | null
          billed_at?: string | null
          billed_credit_note_number?: string | null
          billed_snapshot?: Json | null
          billing_in_progress?: boolean
          brezzels_revenue?: number | null
          created_at?: string
          fourbased_revenue?: number | null
          id?: string
          last_fetched_at?: string
          last_fetched_month?: number
          last_fetched_year?: number
          maloum_revenue?: number | null
          model_id?: string
          monthly_revenue?: number
          raw_response?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_notifications: {
        Row: {
          created_at: string
          id: string
          send_at: string
          sent: boolean
          template_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          send_at: string
          sent?: boolean
          template_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          send_at?: string
          sent?: boolean
          template_key?: string
          user_id?: string
        }
        Relationships: []
      }
      platforms: {
        Row: {
          auto_synced: boolean
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          auto_synced?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          auto_synced?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_reports: {
        Row: {
          account_id: string
          created_at: string
          date: string
          failed: number
          id: string
          posted: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          date: string
          failed?: number
          id?: string
          posted?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          date?: string
          failed?: number
          id?: string
          posted?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_domain: string | null
          account_email: string | null
          account_password: string | null
          billing_unlock_override: boolean
          created_at: string
          daily_goal: number
          end_date: string | null
          group_name: string
          id: string
          language: string
          last_billed_month: string | null
          name: string | null
          offer: string | null
          pre_create: boolean
          presence: Json
          pwa_installed: boolean
          start_date: string | null
          telegram_id: string | null
          ui_language: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_domain?: string | null
          account_email?: string | null
          account_password?: string | null
          billing_unlock_override?: boolean
          created_at?: string
          daily_goal?: number
          end_date?: string | null
          group_name?: string
          id?: string
          language?: string
          last_billed_month?: string | null
          name?: string | null
          offer?: string | null
          pre_create?: boolean
          presence?: Json
          pwa_installed?: boolean
          start_date?: string | null
          telegram_id?: string | null
          ui_language?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_domain?: string | null
          account_email?: string | null
          account_password?: string | null
          billing_unlock_override?: boolean
          created_at?: string
          daily_goal?: number
          end_date?: string | null
          group_name?: string
          id?: string
          language?: string
          last_billed_month?: string | null
          name?: string | null
          offer?: string | null
          pre_create?: boolean
          presence?: Json
          pwa_installed?: boolean
          start_date?: string | null
          telegram_id?: string | null
          ui_language?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_data: {
        Row: {
          created_at: string
          date: string
          id: string
          mass_dm: number | null
          models: Json
          oldest_chat: number | null
          revenue: number
          telegram_id: string
          unread_chats: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mass_dm?: number | null
          models?: Json
          oldest_chat?: number | null
          revenue?: number
          telegram_id: string
          unread_chats?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mass_dm?: number | null
          models?: Json
          oldest_chat?: number | null
          revenue?: number
          telegram_id?: string
          unread_chats?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_routes: {
        Row: {
          created_at: string
          free_count: number
          id: string
          is_active: boolean
          name: string
          target_path: string
          weight: number
        }
        Insert: {
          created_at?: string
          free_count?: number
          id?: string
          is_active?: boolean
          name: string
          target_path: string
          weight?: number
        }
        Update: {
          created_at?: string
          free_count?: number
          id?: string
          is_active?: boolean
          name?: string
          target_path?: string
          weight?: number
        }
        Relationships: []
      }
      revenue_report: {
        Row: {
          created_at: string
          data: Json | null
          date: string
          id: string
          platform: Database["public"]["Enums"]["platform"]
          revenue_today: number | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          date: string
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          revenue_today?: number | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          date?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          revenue_today?: number | null
        }
        Relationships: []
      }
      revenue_sale_events: {
        Row: {
          amount: number
          id: string
          model: string
          occurred_at: string
          platform: string
        }
        Insert: {
          amount: number
          id?: string
          model: string
          occurred_at?: string
          platform: string
        }
        Update: {
          amount?: number
          id?: string
          model?: string
          occurred_at?: string
          platform?: string
        }
        Relationships: []
      }
      revenue_surge_log: {
        Row: {
          last_sent_at: string
          scope: string
        }
        Insert: {
          last_sent_at?: string
          scope: string
        }
        Update: {
          last_sent_at?: string
          scope?: string
        }
        Relationships: []
      }
      route_counter: {
        Row: {
          counter: number
          id: string
        }
        Insert: {
          counter?: number
          id?: string
        }
        Update: {
          counter?: number
          id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          day_of_month: number | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          send_time: string
          title: string
          weekday: number | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          send_time?: string
          title: string
          weekday?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          send_time?: string
          title?: string
          weekday?: number | null
        }
        Relationships: []
      }
      setup_attention: {
        Row: {
          account_id: string
          created_at: string
          date: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by_name: string | null
          resolved_by_user: boolean
          resolved_by_user_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          date?: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user?: boolean
          resolved_by_user_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by_name?: string | null
          resolved_by_user?: boolean
          resolved_by_user_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_attention_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      socialmedia_marketer_applications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          id: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          assigned_route: string | null
          created_at: string
          current_step: string
          id: string
          quiz_completed: boolean
          quiz_score: number | null
          updated_at: string
          user_id: string
          video_completed: boolean
        }
        Insert: {
          assigned_route?: string | null
          created_at?: string
          current_step?: string
          id?: string
          quiz_completed?: boolean
          quiz_score?: number | null
          updated_at?: string
          user_id: string
          video_completed?: boolean
        }
        Update: {
          assigned_route?: string | null
          created_at?: string
          current_step?: string
          id?: string
          quiz_completed?: boolean
          quiz_score?: number | null
          updated_at?: string
          user_id?: string
          video_completed?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_passes: {
        Row: {
          created_at: string
          id: string
          last_payload: Json | null
          pass_url: string
          serial_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_payload?: Json | null
          pass_url: string
          serial_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_payload?: Json | null
          pass_url?: string
          serial_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_reject_stale_model_requests: {
        Args: never
        Returns: {
          models_semi: number
          reason_age: number
          reason_followups: number
          rejected_count: number
        }[]
      }
      can_access_account: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: boolean
      }
      chatter_can_access_request_model: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      claim_pre_create_by_telegram: {
        Args: { p_telegram_id: string }
        Returns: Json
      }
      complete_marketer_list: {
        Args: { p_list_id: string }
        Returns: undefined
      }
      current_model_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_account_chatter_stats: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: {
          all_time: number
          assigned_since: string
          mass_dms: number
          month: number
          oldest_chat: number
          open_chats: number
          today: number
          week: number
          yesterday: number
        }[]
      }
      get_account_chatter_stats_window: {
        Args: {
          p_account_id: string
          p_end: string
          p_start: string
          p_user_id: string
        }
        Returns: {
          avg_per_day: number
          days: number
          mass_dms: number
          oldest_chat: number
          series: Json
          total: number
        }[]
      }
      get_brezzels_comment_targets: {
        Args: { p_count?: number }
        Returns: {
          completed: boolean
          id: string
          url: string
        }[]
      }
      get_brezzels_comment_targets_by_account: {
        Args: { p_count?: number }
        Returns: {
          account_id: string
          account_label: string
          completed: boolean
          model_name: string
          target_id: string
          url: string
        }[]
      }
      get_chatter_data_freshness: { Args: never; Returns: string }
      get_chatter_real_stats: {
        Args: { p_profile_ids?: string[]; p_user_ids: string[] }
        Returns: {
          all_time: number
          avg_open_days: number
          mass_dms: number
          month: number
          open_chats: number
          prev_month: number
          prev_week: number
          profile_id: string
          sparkline: Json
          today: number
          user_id: string
          week: number
        }[]
      }
      get_chatter_revenue_series: {
        Args: { p_from: string; p_to: string }
        Returns: {
          date: string
          total: number
        }[]
      }
      get_chatter_revenue_series_for_user: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          date: string
          total: number
        }[]
      }
      get_commitment_streak: {
        Args: { p_user_id: string }
        Returns: {
          streak: number
          tier: string
        }[]
      }
      get_credit_note_seq: { Args: never; Returns: number }
      get_free_account_counts: {
        Args: never
        Returns: {
          free_count: number
          platform_name: string
          route_id: string
          target_path: string
        }[]
      }
      get_model_revenue: {
        Args: { p_account_id: string; p_date_from: string; p_date_to: string }
        Returns: {
          chatter_count: number
          total_revenue: number
        }[]
      }
      get_stale_ingest_accounts: {
        Args: { p_hours?: number }
        Returns: {
          account_email: string
          account_id: string
          last_update: string
          platform: string
          total: number
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_route_counter: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_telegram_id_taken: {
        Args: { p_telegram_id: string }
        Returns: boolean
      }
      marketer_can_access_model: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_credit_note_number: { Args: never; Returns: string }
      purge_archived_account: {
        Args: { p_original_id: string }
        Returns: undefined
      }
      purge_archived_model: {
        Args: { p_original_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_profiles_data_today: { Args: never; Returns: number }
      refresh_setup_attention: { Args: never; Returns: number }
      set_credit_note_seq: { Args: { new_val: number }; Returns: undefined }
      validate_admin_2fa_session: {
        Args: { p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "model"
        | "super_admin"
        | "sub_admin"
        | "fanvue_partner"
        | "fanvue_model"
        | "socialmedia_marketer"
      platform: "new" | "maloum" | "4based" | "brezzels" | "admireme"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "model",
        "super_admin",
        "sub_admin",
        "fanvue_partner",
        "fanvue_model",
        "socialmedia_marketer",
      ],
      platform: ["new", "maloum", "4based", "brezzels", "admireme"],
    },
  },
} as const
