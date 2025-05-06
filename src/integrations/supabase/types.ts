export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      enhanced_signals: {
        Row: {
          confidence_score: number | null
          execution_data: Json | null
          id: string
          price: number
          risk_adjustment: number | null
          sentiment_factors: Json | null
          status: string
          stop_loss: number | null
          strategy_id: string | null
          strategy_name: string | null
          symbol: string
          take_profit_levels: Json | null
          technical_factors: Json | null
          time: string | null
          type: string
          volatility_forecast: number | null
        }
        Insert: {
          confidence_score?: number | null
          execution_data?: Json | null
          id?: string
          price: number
          risk_adjustment?: number | null
          sentiment_factors?: Json | null
          status: string
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol: string
          take_profit_levels?: Json | null
          technical_factors?: Json | null
          time?: string | null
          type: string
          volatility_forecast?: number | null
        }
        Update: {
          confidence_score?: number | null
          execution_data?: Json | null
          id?: string
          price?: number
          risk_adjustment?: number | null
          sentiment_factors?: Json | null
          status?: string
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol?: string
          take_profit_levels?: Json | null
          technical_factors?: Json | null
          time?: string | null
          type?: string
          volatility_forecast?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_signals_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      market_sentiment: {
        Row: {
          collected_at: string | null
          id: string
          news_sentiment: number | null
          sentiment_score: number
          social_sentiment: number | null
          source: string
          symbol: string
        }
        Insert: {
          collected_at?: string | null
          id?: string
          news_sentiment?: number | null
          sentiment_score: number
          social_sentiment?: number | null
          source: string
          symbol: string
        }
        Update: {
          collected_at?: string | null
          id?: string
          news_sentiment?: number | null
          sentiment_score?: number
          social_sentiment?: number | null
          source?: string
          symbol?: string
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          params: Json | null
          type: string
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          params?: Json | null
          type: string
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          params?: Json | null
          type?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      risk_profiles: {
        Row: {
          account_risk_per_trade: number
          correlation_risk_limits: Json | null
          created_at: string | null
          emotion_controls_enabled: boolean | null
          id: string
          max_drawdown_percent: number
          risk_tolerance: number
          updated_at: string | null
          user_id: string | null
          volatility_adjustments: boolean | null
        }
        Insert: {
          account_risk_per_trade: number
          correlation_risk_limits?: Json | null
          created_at?: string | null
          emotion_controls_enabled?: boolean | null
          id?: string
          max_drawdown_percent: number
          risk_tolerance: number
          updated_at?: string | null
          user_id?: string | null
          volatility_adjustments?: boolean | null
        }
        Update: {
          account_risk_per_trade?: number
          correlation_risk_limits?: Json | null
          created_at?: string | null
          emotion_controls_enabled?: boolean | null
          id?: string
          max_drawdown_percent?: number
          risk_tolerance?: number
          updated_at?: string | null
          user_id?: string | null
          volatility_adjustments?: boolean | null
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          feedback_data: Json | null
          id: string
          lot_size: number
          model_id: string | null
          notes: string | null
          profit_loss: number | null
          sentiment_state: Json | null
          signal_id: string | null
          strategy_id: string | null
          symbol: string
          technical_state: Json | null
          trade_duration: unknown | null
          type: string
          user_emotion: string | null
          win_loss: string | null
        }
        Insert: {
          entry_price: number
          entry_time: string
          exit_price?: number | null
          exit_time?: string | null
          feedback_data?: Json | null
          id?: string
          lot_size: number
          model_id?: string | null
          notes?: string | null
          profit_loss?: number | null
          sentiment_state?: Json | null
          signal_id?: string | null
          strategy_id?: string | null
          symbol: string
          technical_state?: Json | null
          trade_duration?: unknown | null
          type: string
          user_emotion?: string | null
          win_loss?: string | null
        }
        Update: {
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          feedback_data?: Json | null
          id?: string
          lot_size?: number
          model_id?: string | null
          notes?: string | null
          profit_loss?: number | null
          sentiment_state?: Json | null
          signal_id?: string | null
          strategy_id?: string | null
          symbol?: string
          technical_state?: Json | null
          trade_duration?: unknown | null
          type?: string
          user_emotion?: string | null
          win_loss?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "enhanced_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_strategies: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_id: string | null
          name: string
          parameters: Json | null
          risk_profile: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          name: string
          parameters?: Json | null
          risk_profile: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          name?: string
          parameters?: Json | null
          risk_profile?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_strategies_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
