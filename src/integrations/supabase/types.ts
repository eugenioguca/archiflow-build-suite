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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accounts_receivable: {
        Row: {
          amount_due: number
          amount_paid: number | null
          client_id: string
          created_at: string
          due_date: string
          id: string
          income_id: string
          status: Database["public"]["Enums"]["receivable_status"] | null
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          income_id: string
          status?: Database["public"]["Enums"]["receivable_status"] | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          income_id?: string
          status?: Database["public"]["Enums"]["receivable_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          assigned_advisor_id: string | null
          budget: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_advisor_id?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_advisor_id?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_advisor_id_fkey"
            columns: ["assigned_advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          file_path: string
          file_type: string | null
          id: string
          name: string
          project_id: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_type?: string | null
          id?: string
          name: string
          project_id?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_type?: string | null
          id?: string
          name?: string
          project_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          client_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          project_id: string | null
          tax_amount: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          client_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          project_id?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          project_id?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["income_category"]
          client_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          payment_date: string | null
          payment_status:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id: string | null
          tax_amount: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["income_category"]
          client_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_date?: string | null
          payment_status?:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["income_category"]
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_date?: string | null
          payment_status?:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          description: string | null
          id: string
          photo_url: string
          project_id: string
          taken_at: string
          taken_by: string
        }
        Insert: {
          description?: string | null
          id?: string
          photo_url: string
          project_id: string
          taken_at?: string
          taken_by: string
        }
        Update: {
          description?: string | null
          id?: string
          photo_url?: string
          project_id?: string
          taken_at?: string
          taken_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_completion: string | null
          budget: number | null
          client_id: string
          created_at: string
          description: string | null
          estimated_completion: string | null
          id: string
          name: string
          progress_percentage: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          actual_completion?: string | null
          budget?: number | null
          client_id: string
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          id?: string
          name: string
          progress_percentage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          actual_completion?: string | null
          budget?: number | null
          client_id?: string
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          id?: string
          name?: string
          progress_percentage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: Database["public"]["Enums"]["module_name"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["module_name"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["module_name"]
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
      has_module_permission: {
        Args: {
          _user_id: string
          _module: Database["public"]["Enums"]["module_name"]
          _permission: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      client_status: "potential" | "existing" | "active" | "completed"
      expense_category:
        | "administration"
        | "sales"
        | "financial"
        | "construction"
      income_category:
        | "construction_service"
        | "consultation"
        | "project_management"
        | "maintenance"
        | "other"
      income_payment_status: "pending" | "partial" | "paid" | "overdue"
      module_name:
        | "dashboard"
        | "clients"
        | "projects"
        | "documents"
        | "finances"
        | "accounting"
        | "progress_photos"
      project_status:
        | "planning"
        | "design"
        | "permits"
        | "construction"
        | "completed"
        | "cancelled"
      receivable_status: "pending" | "partial" | "paid" | "overdue"
      user_role: "admin" | "employee" | "client"
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
      client_status: ["potential", "existing", "active", "completed"],
      expense_category: [
        "administration",
        "sales",
        "financial",
        "construction",
      ],
      income_category: [
        "construction_service",
        "consultation",
        "project_management",
        "maintenance",
        "other",
      ],
      income_payment_status: ["pending", "partial", "paid", "overdue"],
      module_name: [
        "dashboard",
        "clients",
        "projects",
        "documents",
        "finances",
        "accounting",
        "progress_photos",
      ],
      project_status: [
        "planning",
        "design",
        "permits",
        "construction",
        "completed",
        "cancelled",
      ],
      receivable_status: ["pending", "partial", "paid", "overdue"],
      user_role: ["admin", "employee", "client"],
    },
  },
} as const
