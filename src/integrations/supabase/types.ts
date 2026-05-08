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
      daily_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          progress_notes: string | null
          project_id: string
          tasks: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          progress_notes?: string | null
          project_id: string
          tasks: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          progress_notes?: string | null
          project_id?: string
          tasks?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_areas: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          observation_id: string
          snapshot: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          observation_id: string
          snapshot?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          observation_id?: string
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_history_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          accepted_text: string | null
          author_id: string
          created_at: string
          focus_area_id: string | null
          id: string
          included_in_report: boolean
          original_text: string
          project_id: string
          rewritten_text: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          accepted_text?: string | null
          author_id: string
          created_at?: string
          focus_area_id?: string | null
          id?: string
          included_in_report?: boolean
          original_text: string
          project_id: string
          rewritten_text?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accepted_text?: string | null
          author_id?: string
          created_at?: string
          focus_area_id?: string | null
          id?: string
          included_in_report?: boolean
          original_text?: string
          project_id?: string
          rewritten_text?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_focus_area_id_fkey"
            columns: ["focus_area_id"]
            isOneToOne: false
            referencedRelation: "focus_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          created_at: string
          end_date: string | null
          finalize_date: string | null
          id: string
          manager_id: string
          name: string
          quarter: string
          start_date: string | null
          status: string
          template_data: string | null
          template_filename: string | null
          template_path: string | null
          updated_at: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          end_date?: string | null
          finalize_date?: string | null
          id?: string
          manager_id: string
          name: string
          quarter: string
          start_date?: string | null
          status?: string
          template_data?: string | null
          template_filename?: string | null
          template_path?: string | null
          updated_at?: string
        }
        Update: {
          client?: string | null
          created_at?: string
          end_date?: string | null
          finalize_date?: string | null
          id?: string
          manager_id?: string
          name?: string
          quarter?: string
          start_date?: string | null
          status?: string
          template_data?: string | null
          template_filename?: string | null
          template_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_snapshots: {
        Row: {
          created_at: string
          created_by: string
          file_data: string | null
          file_path: string | null
          id: string
          kind: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_data?: string | null
          file_path?: string | null
          id?: string
          kind: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_data?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_metrics: {
        Row: {
          id: string
          project_id: string
          revenue: number | null
          expenses: number | null
          goals: Json | null
          kpi_scorecard: Json | null
          executive_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          revenue?: number | null
          expenses?: number | null
          goals?: Json | null
          kpi_scorecard?: Json | null
          executive_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          revenue?: number | null
          expenses?: number | null
          goals?: Json | null
          kpi_scorecard?: Json | null
          executive_summary?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      shared_reports: {
        Row: {
          id: string
          project_id: string
          token: string
          snapshot: Json
          view_count: number
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          token: string
          snapshot: Json
          view_count?: number
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          token?: string
          snapshot?: Json
          view_count?: number
          created_at?: string
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      access_requests: {
        Row: {
          id: string
          email: string
          name: string | null
          message: string | null
          status: "pending" | "approved" | "rejected"
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          message?: string | null
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          message?: string | null
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
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
      is_project_manager: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      increment_view_count: {
        Args: { row_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { target_user_id: string; new_role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      admin_user_overview: {
        Args: Record<string, never>
        Returns: {
          id: string
          name: string | null
          email: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "member" | "partner"
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
      app_role: ["admin", "manager", "member"],
    },
  },
} as const
