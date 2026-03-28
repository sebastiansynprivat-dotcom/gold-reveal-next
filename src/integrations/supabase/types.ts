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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_assignments: {
        Row: {
          account_id: string
          assigned_at: string
          created_at: string
          id: string
          unassigned_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          assigned_at?: string
          created_at?: string
          id?: string
          unassigned_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          assigned_at?: string
          created_at?: string
          id?: string
          unassigned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
          created_at: string
          drive_folder_id: string | null
          folder_name: string | null
          id: string
          is_manual: boolean
          model_active: boolean
          model_agency: string
          model_language: string
          platform: string
          subfolder_name: string | null
        }
        Insert: {
          account_domain?: string
          account_email?: string
          account_password?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          drive_folder_id?: string | null
          folder_name?: string | null
          id?: string
          is_manual?: boolean
          model_active?: boolean
          model_agency?: string
          model_language?: string
          platform?: string
          subfolder_name?: string | null
        }
        Update: {
          account_domain?: string
          account_email?: string
          account_password?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          drive_folder_id?: string | null
          folder_name?: string | null
          id?: string
          is_manual?: boolean
          model_active?: boolean
          model_agency?: string
          model_language?: string
          platform?: string
          subfolder_name?: string | null
        }
        Relationships: []
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
      ai_prompts: {
        Row: {
          id: string
          prompt_key: string
          prompt_text: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          prompt_key?: string
          prompt_text: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          prompt_key?: string
          prompt_text?: string
          updated_at?: string
          updated_by?: string | null
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
          brezzels_revenue: number
          compensation_type: string
          created_at: string
          crypto_address: string
          currency: string
          fourbased_revenue: number
          hourly_rate: number
          hours_worked: number
          id: string
          maloum_revenue: number
          name: string
          platform: string
          revenue_percentage: number
          role: string
          updated_at: string
        }
        Insert: {
          brezzels_revenue?: number
          compensation_type?: string
          created_at?: string
          crypto_address?: string
          currency?: string
          fourbased_revenue?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          maloum_revenue?: number
          name?: string
          platform?: string
          revenue_percentage?: number
          role?: string
          updated_at?: string
        }
        Update: {
          brezzels_revenue?: number
          compensation_type?: string
          created_at?: string
          crypto_address?: string
          currency?: string
          fourbased_revenue?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          maloum_revenue?: number
          name?: string
          platform?: string
          revenue_percentage?: number
          role?: string
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
      daily_goals: {
        Row: {
          created_at: string
          goal_text: string
          id: string
          target_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_text: string
          id?: string
          target_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_text?: string
          id?: string
          target_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      model_dashboard: {
        Row: {
          account_id: string
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
          maloum_botdm_done: boolean
          maloum_massdm_done: boolean
          maloum_revenue: number | null
          maloum_submitted: boolean
          massdm_done: boolean
          monthly_revenue: number | null
          notes: string | null
          revenue_percentage: number | null
          total_revenue: number | null
          updated_at: string
          yesterday_revenue: number | null
        }
        Insert: {
          account_id: string
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
          maloum_botdm_done?: boolean
          maloum_massdm_done?: boolean
          maloum_revenue?: number | null
          maloum_submitted?: boolean
          massdm_done?: boolean
          monthly_revenue?: number | null
          notes?: string | null
          revenue_percentage?: number | null
          total_revenue?: number | null
          updated_at?: string
          yesterday_revenue?: number | null
        }
        Update: {
          account_id?: string
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
          maloum_botdm_done?: boolean
          maloum_massdm_done?: boolean
          maloum_revenue?: number | null
          maloum_submitted?: boolean
          massdm_done?: boolean
          monthly_revenue?: number | null
          notes?: string | null
          revenue_percentage?: number | null
          total_revenue?: number | null
          updated_at?: string
          yesterday_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_dashboard_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      model_requests: {
        Row: {
          admin_comment: string | null
          content_link: string | null
          created_at: string
          customer_name: string | null
          description: string
          id: string
          model_language: string
          model_name: string
          price: number | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          content_link?: string | null
          created_at?: string
          customer_name?: string | null
          description: string
          id?: string
          model_language?: string
          model_name: string
          price?: number | null
          request_type?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          content_link?: string | null
          created_at?: string
          customer_name?: string | null
          description?: string
          id?: string
          model_language?: string
          model_name?: string
          price?: number | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      model_users: {
        Row: {
          account_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
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
        ]
      }
      notification_templates: {
        Row: {
          body: string
          id: string
          label: string
          template_key: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          id?: string
          label?: string
          template_key: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          id?: string
          label?: string
          template_key?: string
          title?: string
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
      profiles: {
        Row: {
          account_domain: string | null
          account_email: string | null
          account_password: string | null
          created_at: string
          group_name: string
          id: string
          offer: string | null
          pwa_installed: boolean
          telegram_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_domain?: string | null
          account_email?: string | null
          account_password?: string | null
          created_at?: string
          group_name?: string
          id?: string
          offer?: string | null
          pwa_installed?: boolean
          telegram_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_domain?: string | null
          account_email?: string | null
          account_password?: string | null
          created_at?: string
          group_name?: string
          id?: string
          offer?: string | null
          pwa_installed?: boolean
          telegram_id?: string | null
          updated_at?: string
          user_id?: string
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
          id: string
          is_active: boolean
          name: string
          target_path: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          target_path: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_path?: string
          weight?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_route_counter: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      next_credit_note_number: { Args: never; Returns: string }
      set_credit_note_seq: { Args: { new_val: number }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "model"
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
      app_role: ["admin", "moderator", "user", "model"],
    },
  },
} as const
