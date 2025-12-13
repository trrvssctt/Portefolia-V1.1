export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      contact_saves: {
        Row: {
          id: string
          portfolio_id: string
          saved_at: string | null
          visitor_ip: string | null
        }
        Insert: {
          id?: string
          portfolio_id: string
          saved_at?: string | null
          visitor_ip?: string | null
        }
        Update: {
          id?: string
          portfolio_id?: string
          saved_at?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_saves_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string | null
          degree: string
          description: string | null
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          is_current: boolean | null
          order_index: number | null
          portfolio_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          degree: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          is_current?: boolean | null
          order_index?: number | null
          portfolio_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          degree?: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          is_current?: boolean | null
          order_index?: number | null
          portfolio_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          location: string | null
          order_index: number | null
          portfolio_id: string
          position: string
          start_date: string
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          order_index?: number | null
          portfolio_id: string
          position: string
          start_date: string
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          order_index?: number | null
          portfolio_id?: string
          position?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_cards: {
        Row: {
          activated_at: string | null
          card_uid: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_validated: boolean | null
          ordered_at: string | null
          portfolio_id: string
          rejected_at: string | null
          user_id: string
          validated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          card_uid: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_validated?: boolean | null
          ordered_at?: string | null
          portfolio_id: string
          rejected_at?: string | null
          user_id: string
          validated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          card_uid?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_validated?: boolean | null
          ordered_at?: string | null
          portfolio_id?: string
          rejected_at?: string | null
          user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_cards_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_visits: {
        Row: {
          city: string | null
          country: string | null
          id: string
          nfc_card_id: string | null
          portfolio_id: string
          referrer: string | null
          visited_at: string | null
          visitor_ip: string | null
          visitor_user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          nfc_card_id?: string | null
          portfolio_id: string
          referrer?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          nfc_card_id?: string | null
          portfolio_id?: string
          referrer?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_visits_nfc_card_id_fkey"
            columns: ["nfc_card_id"]
            isOneToOne: false
            referencedRelation: "nfc_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_visits_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          banner_color: string | null
          banner_image_url: string | null
          banner_type: string | null
          bio: string | null
          created_at: string | null
          cv_url: string | null
          github_url: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          profile_image_url: string | null
          slug: string
          theme_color: string | null
          title: string
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          banner_color?: string | null
          banner_image_url?: string | null
          banner_type?: string | null
          bio?: string | null
          created_at?: string | null
          cv_url?: string | null
          github_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          profile_image_url?: string | null
          slug: string
          theme_color?: string | null
          title: string
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          banner_color?: string | null
          banner_image_url?: string | null
          banner_type?: string | null
          bio?: string | null
          created_at?: string | null
          cv_url?: string | null
          github_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          profile_image_url?: string | null
          slug?: string
          theme_color?: string | null
          title?: string
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          github_url: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          order_index: number | null
          portfolio_id: string
          project_url: string | null
          start_date: string | null
          technologies: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          order_index?: number | null
          portfolio_id: string
          project_url?: string | null
          start_date?: string | null
          technologies?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          order_index?: number | null
          portfolio_id?: string
          project_url?: string | null
          start_date?: string | null
          technologies?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          level: number | null
          name: string
          order_index: number | null
          portfolio_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: number | null
          name: string
          order_index?: number | null
          portfolio_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: number | null
          name?: string
          order_index?: number | null
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
      user_role: "user" | "admin"
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
      user_role: ["user", "admin"],
    },
  },
} as const
