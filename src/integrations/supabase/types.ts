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
      assemblies: {
        Row: {
          absent_time: string
          class_slug: string
          created_at: string
          created_by: string
          id: string
          late_time: string
          qr_token: string
          title: string
        }
        Insert: {
          absent_time: string
          class_slug: string
          created_at?: string
          created_by: string
          id?: string
          late_time: string
          qr_token?: string
          title?: string
        }
        Update: {
          absent_time?: string
          class_slug?: string
          created_at?: string
          created_by?: string
          id?: string
          late_time?: string
          qr_token?: string
          title?: string
        }
        Relationships: []
      }
      assembly_attendance: {
        Row: {
          assembly_id: string
          created_at: string
          id: string
          signed_in_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          assembly_id: string
          created_at?: string
          id?: string
          signed_in_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          assembly_id?: string
          created_at?: string
          id?: string
          signed_in_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_attendance_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_in_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      keen_join_requests: {
        Row: {
          class_slug: string
          created_at: string
          email: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          class_slug: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          class_slug?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      keen_members: {
        Row: {
          class_slug: string
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          class_slug: string
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          class_slug?: string
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          class_name: string
          created_at: string
          description: string
          duration: number
          id: string
          media_name: string
          media_type: string
          media_url: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_name?: string
          created_at?: string
          description?: string
          duration?: number
          id?: string
          media_name?: string
          media_type: string
          media_url: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_name?: string
          created_at?: string
          description?: string
          duration?: number
          id?: string
          media_name?: string
          media_type?: string
          media_url?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability_mode: string
          avatar_url: string | null
          created_at: string
          id: string
          text_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_mode?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          text_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_mode?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          text_status?: string | null
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
      has_keen_role: {
        Args: { _class_slug: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      is_keen_member: {
        Args: { _class_slug: string; _user_id: string }
        Returns: boolean
      }
      lookup_assembly_by_token: {
        Args: { _qr_token: string }
        Returns: {
          absent_time: string
          class_slug: string
          id: string
          late_time: string
          title: string
        }[]
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
