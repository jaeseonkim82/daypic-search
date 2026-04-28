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
      artists: {
        Row: {
          artist_type: string | null
          created_at: string | null
          email: string | null
          id: string
          image: string | null
          kakao_id: string | null
          name: string
          open_chat_url: string | null
          phone: string | null
          portfolio: string | null
          portfolio_images: string[] | null
          price: string | null
          rating: number | null
          region: string[] | null
          service: string[] | null
          style_keywords: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          artist_type?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          image?: string | null
          kakao_id?: string | null
          name: string
          open_chat_url?: string | null
          phone?: string | null
          portfolio?: string | null
          portfolio_images?: string[] | null
          price?: string | null
          rating?: number | null
          region?: string[] | null
          service?: string[] | null
          style_keywords?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          artist_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          image?: string | null
          kakao_id?: string | null
          name?: string
          open_chat_url?: string | null
          phone?: string | null
          portfolio?: string | null
          portfolio_images?: string[] | null
          price?: string | null
          rating?: number | null
          region?: string[] | null
          service?: string[] | null
          style_keywords?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      closed_dates: {
        Row: {
          artist_id: string
          closed_date: string
          created_at: string | null
          id: string
        }
        Insert: {
          artist_id: string
          closed_date: string
          created_at?: string | null
          id: string
        }
        Update: {
          artist_id?: string
          closed_date?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closed_dates_artist_fk"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_dates_artist_fk"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          kakao_id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          kakao_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          kakao_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_portfolio_items: {
        Row: {
          artist_id: string
          created_at: string | null
          link: string
          position: number
          style_tags: string[]
          thumb: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          link: string
          position: number
          style_tags?: string[]
          thumb?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          link?: string
          position?: number
          style_tags?: string[]
          thumb?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_portfolio_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_portfolio_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      artists_public: {
        Row: {
          artist_type: string | null
          created_at: string | null
          id: string | null
          image: string | null
          name: string | null
          open_chat_url: string | null
          portfolio: string | null
          portfolio_images: string[] | null
          price: string | null
          rating: number | null
          region: string[] | null
          service: string[] | null
          style_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          artist_type?: string | null
          created_at?: string | null
          id?: string | null
          image?: string | null
          name?: string | null
          open_chat_url?: string | null
          portfolio?: string | null
          portfolio_images?: string[] | null
          price?: string | null
          rating?: number | null
          region?: string[] | null
          service?: string[] | null
          style_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          artist_type?: string | null
          created_at?: string | null
          id?: string | null
          image?: string | null
          name?: string | null
          open_chat_url?: string | null
          portfolio?: string | null
          portfolio_images?: string[] | null
          price?: string | null
          rating?: number | null
          region?: string[] | null
          service?: string[] | null
          style_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      register_artist: {
        Args: {
          p_email: string
          p_id: string
          p_kakao_id: string
          p_name: string
          p_open_chat_url: string
          p_phone: string
          p_portfolio: string
          p_price: string
          p_region: string[]
          p_service: string[]
          p_style_keywords: string[]
          p_user_id: string
        }
        Returns: {
          artist_type: string | null
          created_at: string | null
          email: string | null
          id: string
          image: string | null
          kakao_id: string | null
          name: string
          open_chat_url: string | null
          phone: string | null
          portfolio: string | null
          portfolio_images: string[] | null
          price: string | null
          rating: number | null
          region: string[] | null
          service: string[] | null
          style_keywords: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "artists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
