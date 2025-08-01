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
      accounts_payable: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          due_date: string
          expense_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payable_status"] | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          due_date: string
          expense_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payable_status"] | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          due_date?: string
          expense_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payable_status"] | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      advance_justifications: {
        Row: {
          advance_id: string
          amount: number
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string
          fiscal_receipt: boolean | null
          id: string
          receipt_date: string
          receipt_url: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          advance_id: string
          amount: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description: string
          fiscal_receipt?: boolean | null
          id?: string
          receipt_date: string
          receipt_url?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          advance_id?: string
          amount?: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string
          fiscal_receipt?: boolean | null
          id?: string
          receipt_date?: string
          receipt_url?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_justifications_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advance_justifications_advance"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advance_justifications_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_type: string
          created_at: string
          created_by: string
          current_balance: number
          description: string | null
          id: string
          max_limit: number | null
          name: string
          project_id: string | null
          responsible_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          created_by: string
          current_balance?: number
          description?: string | null
          id?: string
          max_limit?: number | null
          name: string
          project_id?: string | null
          responsible_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          created_by?: string
          current_balance?: number
          description?: string | null
          id?: string
          max_limit?: number | null
          name?: string
          project_id?: string | null
          responsible_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cash_accounts_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_accounts_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_accounts_responsible_user"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_projections: {
        Row: {
          actual_expenses: number | null
          actual_income: number | null
          actual_net_flow: number | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          project_id: string | null
          projected_expenses: number | null
          projected_income: number | null
          projected_net_flow: number | null
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual_expenses?: number | null
          actual_income?: number | null
          actual_net_flow?: number | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          project_id?: string | null
          projected_expenses?: number | null
          projected_income?: number | null
          projected_net_flow?: number | null
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual_expenses?: number | null
          actual_income?: number | null
          actual_net_flow?: number | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          project_id?: string | null
          projected_expenses?: number | null
          projected_income?: number | null
          projected_net_flow?: number | null
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cash_flow_projections_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_flow_projections_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          cash_account_id: string
          category: string
          client_id: string | null
          created_at: string
          created_by: string
          description: string
          employee_name: string | null
          expense_id: string | null
          fiscal_compliant: boolean | null
          id: string
          notes: string | null
          project_id: string | null
          receipt_provided: boolean | null
          receipt_url: string | null
          reference_number: string | null
          requires_receipt: boolean | null
          supplier_id: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cash_account_id: string
          category: string
          client_id?: string | null
          created_at?: string
          created_by: string
          description: string
          employee_name?: string | null
          expense_id?: string | null
          fiscal_compliant?: boolean | null
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_provided?: boolean | null
          receipt_url?: string | null
          reference_number?: string | null
          requires_receipt?: boolean | null
          supplier_id?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cash_account_id?: string
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          employee_name?: string | null
          expense_id?: string | null
          fiscal_compliant?: boolean | null
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_provided?: boolean | null
          receipt_url?: string | null
          reference_number?: string | null
          requires_receipt?: boolean | null
          supplier_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_cash_account"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfdi_documents: {
        Row: {
          client_id: string | null
          conceptos: Json | null
          created_at: string
          created_by: string
          expense_id: string | null
          fecha_emision: string
          file_path: string
          folio: string | null
          forma_pago: string | null
          id: string
          ieps: number | null
          impuestos: Json | null
          income_id: string | null
          isr: number | null
          iva: number | null
          metodo_pago: string | null
          rfc_emisor: string
          rfc_receptor: string
          serie: string | null
          status: string | null
          subtotal: number
          supplier_id: string | null
          tipo_comprobante: string
          total: number
          updated_at: string
          uso_cfdi: string | null
          uuid_fiscal: string
          validation_status: string | null
          xml_content: string
        }
        Insert: {
          client_id?: string | null
          conceptos?: Json | null
          created_at?: string
          created_by: string
          expense_id?: string | null
          fecha_emision: string
          file_path: string
          folio?: string | null
          forma_pago?: string | null
          id?: string
          ieps?: number | null
          impuestos?: Json | null
          income_id?: string | null
          isr?: number | null
          iva?: number | null
          metodo_pago?: string | null
          rfc_emisor: string
          rfc_receptor: string
          serie?: string | null
          status?: string | null
          subtotal: number
          supplier_id?: string | null
          tipo_comprobante: string
          total: number
          updated_at?: string
          uso_cfdi?: string | null
          uuid_fiscal: string
          validation_status?: string | null
          xml_content: string
        }
        Update: {
          client_id?: string | null
          conceptos?: Json | null
          created_at?: string
          created_by?: string
          expense_id?: string | null
          fecha_emision?: string
          file_path?: string
          folio?: string | null
          forma_pago?: string | null
          id?: string
          ieps?: number | null
          impuestos?: Json | null
          income_id?: string | null
          isr?: number | null
          iva?: number | null
          metodo_pago?: string | null
          rfc_emisor?: string
          rfc_receptor?: string
          serie?: string | null
          status?: string | null
          subtotal?: number
          supplier_id?: string | null
          tipo_comprobante?: string
          total?: number
          updated_at?: string
          uso_cfdi?: string | null
          uuid_fiscal?: string
          validation_status?: string | null
          xml_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_documents_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount_paid: number
          client_id: string
          complement_due_date: string | null
          complement_issued: boolean | null
          created_at: string
          created_by: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount_paid: number
          client_id: string
          complement_due_date?: string | null
          complement_issued?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string
          complement_due_date?: string | null
          complement_issued?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_portal_settings: {
        Row: {
          can_view_documents: boolean | null
          can_view_finances: boolean | null
          can_view_photos: boolean | null
          can_view_progress: boolean | null
          client_id: string
          created_at: string
          custom_settings: Json | null
          id: string
          updated_at: string
        }
        Insert: {
          can_view_documents?: boolean | null
          can_view_finances?: boolean | null
          can_view_photos?: boolean | null
          can_view_progress?: boolean | null
          client_id: string
          created_at?: string
          custom_settings?: Json | null
          id?: string
          updated_at?: string
        }
        Update: {
          can_view_documents?: boolean | null
          can_view_finances?: boolean | null
          can_view_photos?: boolean | null
          can_view_progress?: boolean | null
          client_id?: string
          created_at?: string
          custom_settings?: Json | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          assigned_advisor_id: string | null
          budget: number | null
          company_size: string | null
          conversion_date: string | null
          conversion_notes: string | null
          created_at: string
          decision_maker_name: string | null
          decision_maker_role: string | null
          email: string | null
          estimated_value: number | null
          full_name: string
          id: string
          last_activity_date: string | null
          last_contact_date: string | null
          lead_score: number | null
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          location_details: Json | null
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage: number | null
          profile_id: string | null
          project_size: string | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          sales_pipeline_stage: string | null
          social_media: Json | null
          status: Database["public"]["Enums"]["client_status"]
          tags: string[] | null
          timeline_months: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_advisor_id?: string | null
          budget?: number | null
          company_size?: string | null
          conversion_date?: string | null
          conversion_notes?: string | null
          created_at?: string
          decision_maker_name?: string | null
          decision_maker_role?: string | null
          email?: string | null
          estimated_value?: number | null
          full_name: string
          id?: string
          last_activity_date?: string | null
          last_contact_date?: string | null
          lead_score?: number | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          location_details?: Json | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage?: number | null
          profile_id?: string | null
          project_size?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          sales_pipeline_stage?: string | null
          social_media?: Json | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          timeline_months?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_advisor_id?: string | null
          budget?: number | null
          company_size?: string | null
          conversion_date?: string | null
          conversion_notes?: string | null
          created_at?: string
          decision_maker_name?: string | null
          decision_maker_role?: string | null
          email?: string | null
          estimated_value?: number | null
          full_name?: string
          id?: string
          last_activity_date?: string | null
          last_contact_date?: string | null
          lead_score?: number | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          location_details?: Json | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage?: number | null
          profile_id?: string | null
          project_size?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          sales_pipeline_stage?: string | null
          social_media?: Json | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          timeline_months?: number | null
          updated_at?: string
          website?: string | null
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
      company_fiscal_config: {
        Row: {
          certificado_cer: string | null
          created_at: string
          domicilio_fiscal: Json
          id: string
          llave_privada_key: string | null
          pac_config: Json | null
          pac_provider: string | null
          password_sat: string | null
          razon_social: string
          regimen_fiscal: string
          rfc: string
          updated_at: string
        }
        Insert: {
          certificado_cer?: string | null
          created_at?: string
          domicilio_fiscal: Json
          id?: string
          llave_privada_key?: string | null
          pac_config?: Json | null
          pac_provider?: string | null
          password_sat?: string | null
          razon_social: string
          regimen_fiscal: string
          rfc: string
          updated_at?: string
        }
        Update: {
          certificado_cer?: string | null
          created_at?: string
          domicilio_fiscal?: Json
          id?: string
          llave_privada_key?: string | null
          pac_config?: Json | null
          pac_provider?: string | null
          password_sat?: string | null
          razon_social?: string
          regimen_fiscal?: string
          rfc?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          attachments: Json | null
          client_id: string
          completed_date: string | null
          contact_method: Database["public"]["Enums"]["contact_method"] | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_completed: boolean | null
          next_action: string | null
          next_action_date: string | null
          outcome: string | null
          scheduled_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          attachments?: Json | null
          client_id: string
          completed_date?: string | null
          contact_method?: Database["public"]["Enums"]["contact_method"] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          scheduled_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          attachments?: Json | null
          client_id?: string
          completed_date?: string | null
          contact_method?: Database["public"]["Enums"]["contact_method"] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          scheduled_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_metrics: {
        Row: {
          calls_made: number | null
          created_at: string
          date: string
          emails_sent: number | null
          id: string
          leads_converted: number | null
          meetings_held: number | null
          proposals_sent: number | null
          revenue_generated: number | null
          user_id: string
        }
        Insert: {
          calls_made?: number | null
          created_at?: string
          date?: string
          emails_sent?: number | null
          id?: string
          leads_converted?: number | null
          meetings_held?: number | null
          proposals_sent?: number | null
          revenue_generated?: number | null
          user_id: string
        }
        Update: {
          calls_made?: number | null
          created_at?: string
          date?: string
          emails_sent?: number | null
          id?: string
          leads_converted?: number | null
          meetings_held?: number | null
          proposals_sent?: number | null
          revenue_generated?: number | null
          user_id?: string
        }
        Relationships: []
      }
      crm_proposals: {
        Row: {
          amount: number | null
          client_id: string
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          document_url: string | null
          id: string
          proposal_date: string
          status: string | null
          terms_conditions: string | null
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          client_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          document_url?: string | null
          id?: string
          proposal_date?: string
          status?: string | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          document_url?: string | null
          id?: string
          proposal_date?: string
          status?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reminders: {
        Row: {
          activity_id: string | null
          client_id: string
          created_at: string
          email_sent: boolean | null
          id: string
          is_sent: boolean | null
          message: string
          popup_shown: boolean | null
          reminder_date: string
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          client_id: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_sent?: boolean | null
          message: string
          popup_shown?: boolean | null
          reminder_date: string
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          client_id?: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_sent?: boolean | null
          message?: string
          popup_shown?: boolean | null
          reminder_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reminders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "crm_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_level: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          document_status: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          project_id: string | null
          tags: string[] | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          access_level?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          document_status?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          project_id?: string | null
          tags?: string[] | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          access_level?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          document_status?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          project_id?: string | null
          tags?: string[] | null
          uploaded_by?: string
          version?: number | null
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
      employee_advances: {
        Row: {
          advance_amount: number
          advance_date: string
          amount_justified: number | null
          amount_pending: number | null
          cash_transaction_id: string | null
          created_at: string
          created_by: string
          due_date: string
          employee_name: string
          employee_position: string | null
          id: string
          notes: string | null
          project_id: string | null
          purpose: string
          status: string | null
          updated_at: string
        }
        Insert: {
          advance_amount: number
          advance_date: string
          amount_justified?: number | null
          amount_pending?: number | null
          cash_transaction_id?: string | null
          created_at?: string
          created_by: string
          due_date: string
          employee_name: string
          employee_position?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          purpose: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          advance_date?: string
          amount_justified?: number | null
          amount_pending?: number | null
          cash_transaction_id?: string | null
          created_at?: string
          created_by?: string
          due_date?: string
          employee_name?: string
          employee_position?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          purpose?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_advances_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_advances_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_advances_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account: string | null
          category: Database["public"]["Enums"]["expense_category"]
          cfdi_document_id: string | null
          client_id: string | null
          complement_received: boolean | null
          created_at: string
          created_by: string
          description: string
          forma_pago: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          payment_method: string | null
          project_id: string | null
          reference_number: string | null
          requires_complement: boolean | null
          rfc_emisor: string | null
          status_cfdi: string | null
          supplier_id: string | null
          tax_amount: number | null
          updated_at: string
          uuid_fiscal: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          cfdi_document_id?: string | null
          client_id?: string | null
          complement_received?: boolean | null
          created_at?: string
          created_by: string
          description: string
          forma_pago?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          requires_complement?: boolean | null
          rfc_emisor?: string | null
          status_cfdi?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          updated_at?: string
          uuid_fiscal?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          cfdi_document_id?: string | null
          client_id?: string | null
          complement_received?: boolean | null
          created_at?: string
          created_by?: string
          description?: string
          forma_pago?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_method?: string | null
          project_id?: string | null
          reference_number?: string | null
          requires_complement?: boolean | null
          rfc_emisor?: string | null
          status_cfdi?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          updated_at?: string
          uuid_fiscal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cfdi_document_id_fkey"
            columns: ["cfdi_document_id"]
            isOneToOne: false
            referencedRelation: "cfdi_documents"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_reports: {
        Row: {
          created_at: string
          created_by: string
          data: Json
          file_path: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data: Json
          file_path?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: Json
          file_path?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["income_category"]
          cfdi_document_id: string | null
          client_id: string | null
          complement_sent: boolean | null
          created_at: string
          created_by: string
          description: string
          forma_pago: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          payment_date: string | null
          payment_status:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id: string | null
          requires_complement: boolean | null
          rfc_receptor: string | null
          status_cfdi: string | null
          tax_amount: number | null
          updated_at: string
          uso_cfdi: string | null
          uuid_fiscal: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["income_category"]
          cfdi_document_id?: string | null
          client_id?: string | null
          complement_sent?: boolean | null
          created_at?: string
          created_by: string
          description: string
          forma_pago?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_date?: string | null
          payment_status?:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id?: string | null
          requires_complement?: boolean | null
          rfc_receptor?: string | null
          status_cfdi?: string | null
          tax_amount?: number | null
          updated_at?: string
          uso_cfdi?: string | null
          uuid_fiscal?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["income_category"]
          cfdi_document_id?: string | null
          client_id?: string | null
          complement_sent?: boolean | null
          created_at?: string
          created_by?: string
          description?: string
          forma_pago?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          payment_date?: string | null
          payment_status?:
            | Database["public"]["Enums"]["income_payment_status"]
            | null
          project_id?: string | null
          requires_complement?: boolean | null
          rfc_receptor?: string | null
          status_cfdi?: string | null
          tax_amount?: number | null
          updated_at?: string
          uso_cfdi?: string | null
          uuid_fiscal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomes_cfdi_document_id_fkey"
            columns: ["cfdi_document_id"]
            isOneToOne: false
            referencedRelation: "cfdi_documents"
            referencedColumns: ["id"]
          },
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
      payment_complements: {
        Row: {
          cfdi_document_id: string
          complement_uuid: string
          created_at: string
          fecha_pago: string
          file_path: string
          forma_pago: string
          id: string
          moneda: string | null
          monto_pago: number
          received_date: string | null
          status: string | null
          updated_at: string
          xml_content: string
        }
        Insert: {
          cfdi_document_id: string
          complement_uuid: string
          created_at?: string
          fecha_pago: string
          file_path: string
          forma_pago: string
          id?: string
          moneda?: string | null
          monto_pago: number
          received_date?: string | null
          status?: string | null
          updated_at?: string
          xml_content: string
        }
        Update: {
          cfdi_document_id?: string
          complement_uuid?: string
          created_at?: string
          fecha_pago?: string
          file_path?: string
          forma_pago?: string
          id?: string
          moneda?: string | null
          monto_pago?: number
          received_date?: string | null
          status?: string | null
          updated_at?: string
          xml_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_complements_cfdi_document_id_fkey"
            columns: ["cfdi_document_id"]
            isOneToOne: false
            referencedRelation: "cfdi_documents"
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
          file_path: string | null
          id: string
          phase_id: string | null
          photo_url: string
          project_id: string
          taken_at: string
          taken_by: string
          taken_date: string | null
          title: string | null
          uploaded_by_temp: string | null
        }
        Insert: {
          description?: string | null
          file_path?: string | null
          id?: string
          phase_id?: string | null
          photo_url: string
          project_id: string
          taken_at?: string
          taken_by: string
          taken_date?: string | null
          title?: string | null
          uploaded_by_temp?: string | null
        }
        Update: {
          description?: string | null
          file_path?: string | null
          id?: string
          phase_id?: string | null
          photo_url?: string
          project_id?: string
          taken_at?: string
          taken_by?: string
          taken_date?: string | null
          title?: string | null
          uploaded_by_temp?: string | null
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
      project_files: {
        Row: {
          access_level: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          document_status: string | null
          file_category: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          metadata: Json | null
          name: string
          project_id: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string
          version: number | null
        }
        Insert: {
          access_level?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          document_status?: string | null
          file_category: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          metadata?: Json | null
          name: string
          project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
          version?: number | null
        }
        Update: {
          access_level?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          document_status?: string | null
          file_category?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
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
          custom_fields: Json | null
          description: string | null
          estimated_completion: string | null
          id: string
          location: string | null
          name: string
          phases: Json | null
          progress_percentage: number | null
          project_type: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          team_members: Json | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          actual_completion?: string | null
          budget?: number | null
          client_id: string
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          location?: string | null
          name: string
          phases?: Json | null
          progress_percentage?: number | null
          project_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          team_members?: Json | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          actual_completion?: string | null
          budget?: number | null
          client_id?: string
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          location?: string | null
          name?: string
          phases?: Json | null
          progress_percentage?: number | null
          project_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          team_members?: Json | null
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
      sales_activities: {
        Row: {
          activity_type: string
          client_id: string
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          next_action: string | null
          outcome: string | null
          scheduled_date: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          client_id: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          next_action?: string | null
          outcome?: string | null
          scheduled_date?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          client_id?: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          next_action?: string | null
          outcome?: string | null
          scheduled_date?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          accounts_payable_id: string | null
          amount: number
          bank_account: string | null
          cfdi_complement_id: string | null
          created_at: string
          created_by: string
          expense_id: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          accounts_payable_id?: string | null
          amount: number
          bank_account?: string | null
          cfdi_complement_id?: string | null
          created_at?: string
          created_by: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          reference_number?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          accounts_payable_id?: string | null
          amount?: number
          bank_account?: string | null
          cfdi_complement_id?: string | null
          created_at?: string
          created_by?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_accounts_payable_id_fkey"
            columns: ["accounts_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_cfdi_complement_id_fkey"
            columns: ["cfdi_complement_id"]
            isOneToOne: false
            referencedRelation: "payment_complements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          city: string | null
          codigo_postal: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string
          credit_limit: number | null
          current_balance: number | null
          dias_credito: number | null
          email: string | null
          id: string
          limite_credito: number | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          regimen_fiscal: string | null
          rfc: string | null
          saldo_actual: number | null
          state: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_category: Database["public"]["Enums"]["supplier_category"]
          tax_id: string | null
          updated_at: string
          uso_cfdi_default: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          codigo_postal?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          credit_limit?: number | null
          current_balance?: number | null
          dias_credito?: number | null
          email?: string | null
          id?: string
          limite_credito?: number | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_actual?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_category?: Database["public"]["Enums"]["supplier_category"]
          tax_id?: string | null
          updated_at?: string
          uso_cfdi_default?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          codigo_postal?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          credit_limit?: number | null
          current_balance?: number | null
          dias_credito?: number | null
          email?: string | null
          id?: string
          limite_credito?: number | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_actual?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_category?: Database["public"]["Enums"]["supplier_category"]
          tax_id?: string | null
          updated_at?: string
          uso_cfdi_default?: string | null
          website?: string | null
        }
        Relationships: []
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
      calculate_complement_due_date: {
        Args: { payment_date: string }
        Returns: string
      }
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
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "proposal_sent"
        | "site_visit"
        | "follow_up"
        | "negotiation"
        | "contract_review"
      client_status: "potential" | "existing" | "active" | "completed"
      contact_method:
        | "phone"
        | "email"
        | "whatsapp"
        | "meeting"
        | "site_visit"
        | "video_call"
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
      lead_source:
        | "website"
        | "referral"
        | "social_media"
        | "advertisement"
        | "cold_call"
        | "event"
        | "partner"
      module_name:
        | "dashboard"
        | "clients"
        | "projects"
        | "documents"
        | "finances"
        | "accounting"
        | "progress_photos"
      payable_status: "pending" | "partial" | "paid" | "overdue" | "cancelled"
      priority_level: "low" | "medium" | "high" | "urgent"
      project_status:
        | "planning"
        | "design"
        | "permits"
        | "construction"
        | "completed"
        | "cancelled"
      project_type:
        | "residential"
        | "commercial"
        | "industrial"
        | "renovation"
        | "landscape"
        | "interior_design"
      receivable_status: "pending" | "partial" | "paid" | "overdue"
      supplier_category:
        | "materials"
        | "equipment"
        | "services"
        | "subcontractor"
        | "utilities"
        | "other"
      supplier_status: "active" | "inactive" | "blocked" | "pending_approval"
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
      activity_type: [
        "call",
        "email",
        "meeting",
        "proposal_sent",
        "site_visit",
        "follow_up",
        "negotiation",
        "contract_review",
      ],
      client_status: ["potential", "existing", "active", "completed"],
      contact_method: [
        "phone",
        "email",
        "whatsapp",
        "meeting",
        "site_visit",
        "video_call",
      ],
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
      lead_source: [
        "website",
        "referral",
        "social_media",
        "advertisement",
        "cold_call",
        "event",
        "partner",
      ],
      module_name: [
        "dashboard",
        "clients",
        "projects",
        "documents",
        "finances",
        "accounting",
        "progress_photos",
      ],
      payable_status: ["pending", "partial", "paid", "overdue", "cancelled"],
      priority_level: ["low", "medium", "high", "urgent"],
      project_status: [
        "planning",
        "design",
        "permits",
        "construction",
        "completed",
        "cancelled",
      ],
      project_type: [
        "residential",
        "commercial",
        "industrial",
        "renovation",
        "landscape",
        "interior_design",
      ],
      receivable_status: ["pending", "partial", "paid", "overdue"],
      supplier_category: [
        "materials",
        "equipment",
        "services",
        "subcontractor",
        "utilities",
        "other",
      ],
      supplier_status: ["active", "inactive", "blocked", "pending_approval"],
      user_role: ["admin", "employee", "client"],
    },
  },
} as const
