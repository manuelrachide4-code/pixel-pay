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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          method: string
          product_id: string | null
          provider_payment_id: string | null
          provider_response: Json | null
          reference: string
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          method: string
          product_id?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
          reference: string
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          method?: string
          product_id?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
          reference?: string
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          seller_id: string | null
          source: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          seller_id?: string | null
          source?: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          seller_id?: string | null
          source?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          access_url: string | null
          created_at: string
          currency: string
          description: string | null
          file_path: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          product_type: string
          seller_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          access_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          product_type?: string
          seller_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          access_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          product_type?: string
          seller_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available_balance: number
          blocked_balance: number
          country: string
          created_at: string
          document: string | null
          email: string | null
          email_verified: boolean
          full_name: string
          id: string
          kyc_status: string
          phone: string | null
          phone_verified: boolean
          preferred_currency: string
          total_revenue: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          blocked_balance?: number
          country?: string
          created_at?: string
          document?: string | null
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id: string
          kyc_status?: string
          phone?: string | null
          phone_verified?: boolean
          preferred_currency?: string
          total_revenue?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          blocked_balance?: number
          country?: string
          created_at?: string
          document?: string | null
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          kyc_status?: string
          phone?: string | null
          phone_verified?: boolean
          preferred_currency?: string
          total_revenue?: number
          total_withdrawn?: number
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      withdrawals: {
        Row: {
          account_name: string | null
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          destination: string
          fee_amount: number
          fee_percent: number
          id: string
          method: string
          net_amount: number
          processed_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          destination: string
          fee_amount?: number
          fee_percent?: number
          id?: string
          method: string
          net_amount?: number
          processed_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          destination?: string
          fee_amount?: number
          fee_percent?: number
          id?: string
          method?: string
          net_amount?: number
          processed_at?: string | null
          seller_id?: string
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
      request_withdrawal: {
        Args: {
          _account_name?: string
          _amount: number
          _destination: string
          _method: string
        }
        Returns: string
      }
      resolve_withdrawal: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "affiliate"
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
      app_role: ["admin", "seller", "affiliate"],
    },
  },
} as const
