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
      ai_strategy_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          market_analysis: Json
          reasoning: string | null
          recommended_models: string[] | null
          strategy_id: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_analysis?: Json
          reasoning?: string | null
          recommended_models?: string[] | null
          strategy_id?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_analysis?: Json
          reasoning?: string | null
          recommended_models?: string[] | null
          strategy_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_strategy_recommendations_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_credentials: {
        Row: {
          account_id: string | null
          account_name: string
          account_type: string
          api_secret: string | null
          api_token: string | null
          broker_type: string
          created_at: string | null
          encrypted_password: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          login: string | null
          metadata: Json | null
          server: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name: string
          account_type?: string
          api_secret?: string | null
          api_token?: string | null
          broker_type?: string
          created_at?: string | null
          encrypted_password?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          login?: string | null
          metadata?: Json | null
          server?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string
          account_type?: string
          api_secret?: string | null
          api_token?: string | null
          broker_type?: string
          created_at?: string | null
          encrypted_password?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          login?: string | null
          metadata?: Json | null
          server?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      execution_audit_log: {
        Row: {
          broker_account_id: string | null
          broker_account_name: string | null
          broker_account_type: string | null
          created_at: string
          entry_price: number | null
          error_message: string | null
          execution_timeline: Json
          id: string
          lot_size: number | null
          model_id: string | null
          model_version: string | null
          request_params: Json
          retry_of: string | null
          status: string | null
          stop_loss: number | null
          strategy_id: string | null
          success: boolean
          symbol: string | null
          take_profit: number | null
          trade_id: string | null
          trade_type: string | null
          user_id: string
        }
        Insert: {
          broker_account_id?: string | null
          broker_account_name?: string | null
          broker_account_type?: string | null
          created_at?: string
          entry_price?: number | null
          error_message?: string | null
          execution_timeline?: Json
          id?: string
          lot_size?: number | null
          model_id?: string | null
          model_version?: string | null
          request_params?: Json
          retry_of?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          success?: boolean
          symbol?: string | null
          take_profit?: number | null
          trade_id?: string | null
          trade_type?: string | null
          user_id: string
        }
        Update: {
          broker_account_id?: string | null
          broker_account_name?: string | null
          broker_account_type?: string | null
          created_at?: string
          entry_price?: number | null
          error_message?: string | null
          execution_timeline?: Json
          id?: string
          lot_size?: number | null
          model_id?: string | null
          model_version?: string | null
          request_params?: Json
          retry_of?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          success?: boolean
          symbol?: string | null
          take_profit?: number | null
          trade_id?: string | null
          trade_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          accuracy: number | null
          created_at: string | null
          id: string
          indicators: string[] | null
          is_active: boolean | null
          last_trained_at: string | null
          name: string
          params: Json | null
          type: Database["public"]["Enums"]["model_type"]
          updated_at: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          indicators?: string[] | null
          is_active?: boolean | null
          last_trained_at?: string | null
          name: string
          params?: Json | null
          type: Database["public"]["Enums"]["model_type"]
          updated_at?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          indicators?: string[] | null
          is_active?: boolean | null
          last_trained_at?: string | null
          name?: string
          params?: Json | null
          type?: Database["public"]["Enums"]["model_type"]
          updated_at?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      model_retraining_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          model_id: string
          result_version: string | null
          started_at: string | null
          status: string
          trade_sample_window_end: string | null
          trade_sample_window_start: string | null
          trigger_reason: string
          triggering_trade_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          model_id: string
          result_version?: string | null
          started_at?: string | null
          status?: string
          trade_sample_window_end?: string | null
          trade_sample_window_start?: string | null
          trigger_reason?: string
          triggering_trade_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          model_id?: string
          result_version?: string | null
          started_at?: string | null
          status?: string
          trade_sample_window_end?: string | null
          trade_sample_window_start?: string | null
          trigger_reason?: string
          triggering_trade_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_versions: {
        Row: {
          activated_for_signals_at: string
          created_at: string
          executed_trade_count: number
          id: string
          metrics: Json
          model_id: string
          model_snapshot: Json
          previous_version: string | null
          trade_sample_window_end: string | null
          trade_sample_window_start: string | null
          trained_at: string
          trigger_reason: string
          user_id: string
          version: string
        }
        Insert: {
          activated_for_signals_at?: string
          created_at?: string
          executed_trade_count?: number
          id?: string
          metrics?: Json
          model_id: string
          model_snapshot?: Json
          previous_version?: string | null
          trade_sample_window_end?: string | null
          trade_sample_window_start?: string | null
          trained_at?: string
          trigger_reason?: string
          user_id: string
          version: string
        }
        Update: {
          activated_for_signals_at?: string
          created_at?: string
          executed_trade_count?: number
          id?: string
          metrics?: Json
          model_id?: string
          model_snapshot?: Json
          previous_version?: string | null
          trade_sample_window_end?: string | null
          trade_sample_window_start?: string | null
          trained_at?: string
          trigger_reason?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          id: string
          is_active: boolean
          symbol: string
          triggered_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          symbol: string
          triggered_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          symbol?: string
          triggered_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          allowed_brokers: string[] | null
          allowed_markets: string[] | null
          auto_execute: boolean | null
          created_at: string | null
          features: string[] | null
          id: string
          interval: string | null
          is_active: boolean | null
          max_broker_accounts: number | null
          max_signals_per_day: number | null
          name: string
          paystack_plan_code: string | null
          price: number
        }
        Insert: {
          allowed_brokers?: string[] | null
          allowed_markets?: string[] | null
          auto_execute?: boolean | null
          created_at?: string | null
          features?: string[] | null
          id: string
          interval?: string | null
          is_active?: boolean | null
          max_broker_accounts?: number | null
          max_signals_per_day?: number | null
          name: string
          paystack_plan_code?: string | null
          price: number
        }
        Update: {
          allowed_brokers?: string[] | null
          allowed_markets?: string[] | null
          auto_execute?: boolean | null
          created_at?: string | null
          features?: string[] | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          max_broker_accounts?: number | null
          max_signals_per_day?: number | null
          name?: string
          paystack_plan_code?: string | null
          price?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          broker_account_id: string | null
          close_price: number | null
          close_time: string | null
          commission: number | null
          created_at: string
          current_price: number | null
          entry_price: number
          execution_timeline: Json
          id: string
          last_execution_status: string | null
          lot_size: number
          model_id: string | null
          model_version: string | null
          open_time: string
          profit: number | null
          status: string
          stop_loss: number | null
          strategy_id: string | null
          swap: number | null
          symbol: string
          take_profit: number | null
          ticket_number: string | null
          trade_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_account_id?: string | null
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string
          current_price?: number | null
          entry_price: number
          execution_timeline?: Json
          id?: string
          last_execution_status?: string | null
          lot_size?: number
          model_id?: string | null
          model_version?: string | null
          open_time?: string
          profit?: number | null
          status?: string
          stop_loss?: number | null
          strategy_id?: string | null
          swap?: number | null
          symbol: string
          take_profit?: number | null
          ticket_number?: string | null
          trade_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_account_id?: string | null
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string
          current_price?: number | null
          entry_price?: number
          execution_timeline?: Json
          id?: string
          last_execution_status?: string | null
          lot_size?: number
          model_id?: string | null
          model_version?: string | null
          open_time?: string
          profit?: number | null
          status?: string
          stop_loss?: number | null
          strategy_id?: string | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          ticket_number?: string | null
          trade_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_bot_settings: {
        Row: {
          bot_enabled: boolean
          created_at: string
          interval_seconds: number
          telegram_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_enabled?: boolean
          created_at?: string
          interval_seconds?: number
          telegram_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_enabled?: boolean
          created_at?: string
          interval_seconds?: number
          telegram_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          confidence: number | null
          created_at: string | null
          entry_price: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          model_id: string | null
          model_version: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          status: string | null
          stop_loss: number | null
          strategy_id: string | null
          symbol: string
          target_price: number | null
          timeframe: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          model_version?: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          symbol: string
          target_price?: number | null
          timeframe?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          model_version?: string | null
          signal_type?: Database["public"]["Enums"]["signal_type"]
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          symbol?: string
          target_price?: number | null
          timeframe?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_signals_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_strategies: {
        Row: {
          ai_auto_select: boolean | null
          assets: string[] | null
          created_at: string | null
          description: string | null
          id: string
          indicator: string | null
          indicators: string[] | null
          is_active: boolean | null
          market_conditions: Json | null
          model_ids: string[] | null
          name: string
          risk_profile: string | null
          status: Database["public"]["Enums"]["strategy_status"] | null
          timeframe: string | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          ai_auto_select?: boolean | null
          assets?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator?: string | null
          indicators?: string[] | null
          is_active?: boolean | null
          market_conditions?: Json | null
          model_ids?: string[] | null
          name: string
          risk_profile?: string | null
          status?: Database["public"]["Enums"]["strategy_status"] | null
          timeframe?: string | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          ai_auto_select?: boolean | null
          assets?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          indicator?: string | null
          indicators?: string[] | null
          is_active?: boolean | null
          market_conditions?: Json | null
          model_ids?: string[] | null
          name?: string
          risk_profile?: string | null
          status?: Database["public"]["Enums"]["strategy_status"] | null
          timeframe?: string | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          ends_at: string | null
          id: string
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan_id: string | null
          starts_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          ends_at?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_id?: string | null
          starts_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          ends_at?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan_id?: string | null
          starts_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          payload: Json | null
          signature_valid: boolean | null
          source: string
          status: string
          status_code: number | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          signature_valid?: boolean | null
          source: string
          status: string
          status_code?: number | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          signature_valid?: boolean | null
          source?: string
          status?: string
          status_code?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tier: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      model_type:
        | "LSTM"
        | "Transformer"
        | "DQN"
        | "PPO"
        | "GRU"
        | "RandomForest"
        | "XGBoost"
      signal_type: "buy" | "sell" | "hold"
      strategy_status: "active" | "inactive" | "testing"
      subscription_tier:
        | "free"
        | "basic"
        | "premium"
        | "enterprise"
        | "starter"
        | "pro"
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
      app_role: ["admin", "moderator", "user"],
      model_type: [
        "LSTM",
        "Transformer",
        "DQN",
        "PPO",
        "GRU",
        "RandomForest",
        "XGBoost",
      ],
      signal_type: ["buy", "sell", "hold"],
      strategy_status: ["active", "inactive", "testing"],
      subscription_tier: [
        "free",
        "basic",
        "premium",
        "enterprise",
        "starter",
        "pro",
      ],
    },
  },
} as const
