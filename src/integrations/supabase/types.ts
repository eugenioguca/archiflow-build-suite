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
      billing_clients: {
        Row: {
          activo: boolean | null
          client_id: string | null
          codigo_postal_fiscal: string
          contacto_principal: string | null
          created_at: string
          created_by: string
          domicilio_fiscal: Json
          email: string | null
          forma_pago_default: string | null
          id: string
          metodo_pago_default: string | null
          moneda_default: string | null
          nombre_comercial: string | null
          notas: string | null
          project_id: string | null
          razon_social: string
          regimen_fiscal: string
          rfc: string
          telefono: string | null
          updated_at: string
          uso_cfdi_default: string | null
        }
        Insert: {
          activo?: boolean | null
          client_id?: string | null
          codigo_postal_fiscal: string
          contacto_principal?: string | null
          created_at?: string
          created_by: string
          domicilio_fiscal: Json
          email?: string | null
          forma_pago_default?: string | null
          id?: string
          metodo_pago_default?: string | null
          moneda_default?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          project_id?: string | null
          razon_social: string
          regimen_fiscal: string
          rfc: string
          telefono?: string | null
          updated_at?: string
          uso_cfdi_default?: string | null
        }
        Update: {
          activo?: boolean | null
          client_id?: string | null
          codigo_postal_fiscal?: string
          contacto_principal?: string | null
          created_at?: string
          created_by?: string
          domicilio_fiscal?: Json
          email?: string | null
          forma_pago_default?: string | null
          id?: string
          metodo_pago_default?: string | null
          moneda_default?: string | null
          nombre_comercial?: string | null
          notas?: string | null
          project_id?: string | null
          razon_social?: string
          regimen_fiscal?: string
          rfc?: string
          telefono?: string | null
          updated_at?: string
          uso_cfdi_default?: string | null
        }
        Relationships: []
      }
      branch_offices: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          state_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_offices_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_offices_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "mexican_states"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string
          description: string | null
          id: string
          item_name: string
          item_order: number
          quantity: number | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          item_order: number
          quantity?: number | null
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          item_order?: number
          quantity?: number | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
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
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          project_id: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      client_projects: {
        Row: {
          actual_completion_date: string | null
          alliance_id: string | null
          assigned_advisor_id: string | null
          branch_office_id: string | null
          budget: number | null
          client_id: string
          constancia_situacion_fiscal_uploaded: boolean | null
          constancia_situacion_fiscal_url: string | null
          construction_area: number | null
          construction_budget: number | null
          construction_start_date: string | null
          construction_supervisor_id: string | null
          contract_uploaded: boolean | null
          contract_url: string | null
          conversion_date: string | null
          conversion_notes: string | null
          created_at: string
          curp: string | null
          estimated_completion_date: string | null
          estimated_value: number | null
          has_existing_design: boolean | null
          id: string
          land_square_meters: number | null
          last_activity_date: string | null
          last_contact_date: string | null
          lead_referral_details: string | null
          lead_source: string | null
          lead_source_details: string | null
          location_coordinates: Json | null
          location_details: Json | null
          moved_to_construction_at: string | null
          next_contact_date: string | null
          notes: string | null
          overall_progress_percentage: number | null
          payment_plan: Json | null
          permit_expiry_date: string | null
          permit_status: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage: number | null
          project_description: string | null
          project_location: string | null
          project_manager_id: string | null
          project_name: string
          project_size: string | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          safety_requirements: string | null
          sales_pipeline_stage:
            | Database["public"]["Enums"]["sales_pipeline_stage"]
            | null
          service_type: string | null
          spent_budget: number | null
          status: Database["public"]["Enums"]["client_status"] | null
          tags: string[] | null
          timeline_months: number | null
          updated_at: string
          weather_considerations: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          alliance_id?: string | null
          assigned_advisor_id?: string | null
          branch_office_id?: string | null
          budget?: number | null
          client_id: string
          constancia_situacion_fiscal_uploaded?: boolean | null
          constancia_situacion_fiscal_url?: string | null
          construction_area?: number | null
          construction_budget?: number | null
          construction_start_date?: string | null
          construction_supervisor_id?: string | null
          contract_uploaded?: boolean | null
          contract_url?: string | null
          conversion_date?: string | null
          conversion_notes?: string | null
          created_at?: string
          curp?: string | null
          estimated_completion_date?: string | null
          estimated_value?: number | null
          has_existing_design?: boolean | null
          id?: string
          land_square_meters?: number | null
          last_activity_date?: string | null
          last_contact_date?: string | null
          lead_referral_details?: string | null
          lead_source?: string | null
          lead_source_details?: string | null
          location_coordinates?: Json | null
          location_details?: Json | null
          moved_to_construction_at?: string | null
          next_contact_date?: string | null
          notes?: string | null
          overall_progress_percentage?: number | null
          payment_plan?: Json | null
          permit_expiry_date?: string | null
          permit_status?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage?: number | null
          project_description?: string | null
          project_location?: string | null
          project_manager_id?: string | null
          project_name: string
          project_size?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          safety_requirements?: string | null
          sales_pipeline_stage?:
            | Database["public"]["Enums"]["sales_pipeline_stage"]
            | null
          service_type?: string | null
          spent_budget?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          timeline_months?: number | null
          updated_at?: string
          weather_considerations?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          alliance_id?: string | null
          assigned_advisor_id?: string | null
          branch_office_id?: string | null
          budget?: number | null
          client_id?: string
          constancia_situacion_fiscal_uploaded?: boolean | null
          constancia_situacion_fiscal_url?: string | null
          construction_area?: number | null
          construction_budget?: number | null
          construction_start_date?: string | null
          construction_supervisor_id?: string | null
          contract_uploaded?: boolean | null
          contract_url?: string | null
          conversion_date?: string | null
          conversion_notes?: string | null
          created_at?: string
          curp?: string | null
          estimated_completion_date?: string | null
          estimated_value?: number | null
          has_existing_design?: boolean | null
          id?: string
          land_square_meters?: number | null
          last_activity_date?: string | null
          last_contact_date?: string | null
          lead_referral_details?: string | null
          lead_source?: string | null
          lead_source_details?: string | null
          location_coordinates?: Json | null
          location_details?: Json | null
          moved_to_construction_at?: string | null
          next_contact_date?: string | null
          notes?: string | null
          overall_progress_percentage?: number | null
          payment_plan?: Json | null
          permit_expiry_date?: string | null
          permit_status?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          probability_percentage?: number | null
          project_description?: string | null
          project_location?: string | null
          project_manager_id?: string | null
          project_name?: string
          project_size?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          safety_requirements?: string | null
          sales_pipeline_stage?:
            | Database["public"]["Enums"]["sales_pipeline_stage"]
            | null
          service_type?: string | null
          spent_budget?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          timeline_months?: number | null
          updated_at?: string
          weather_considerations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "commercial_alliances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_assigned_advisor_id_fkey"
            columns: ["assigned_advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_branch_office_id_fkey"
            columns: ["branch_office_id"]
            isOneToOne: false
            referencedRelation: "branch_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_client_id_fkey"
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
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          profile_id: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_alliances: {
        Row: {
          active: boolean | null
          address: string | null
          clients_referred: number | null
          commission_rate: number | null
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          projects_converted: number | null
          total_commission_earned: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          clients_referred?: number | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          projects_converted?: number | null
          total_commission_earned?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          clients_referred?: number | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          projects_converted?: number | null
          total_commission_earned?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      construction_budget_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_percentage: number
          id: string
          is_read: boolean
          message: string
          project_id: string
          read_at: string | null
          read_by: string | null
          threshold_percentage: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          current_percentage: number
          id?: string
          is_read?: boolean
          message: string
          project_id: string
          read_at?: string | null
          read_by?: string | null
          threshold_percentage: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_percentage?: number
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string
          read_at?: string | null
          read_by?: string | null
          threshold_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "construction_budget_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_alerts_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_budget_changes: {
        Row: {
          authorized_by: string
          change_amount: number | null
          change_percentage: number | null
          change_reason: string
          created_at: string
          id: string
          new_budget: number
          notes: string | null
          previous_budget: number
          project_id: string
        }
        Insert: {
          authorized_by: string
          change_amount?: number | null
          change_percentage?: number | null
          change_reason: string
          created_at?: string
          id?: string
          new_budget: number
          notes?: string | null
          previous_budget: number
          project_id: string
        }
        Update: {
          authorized_by?: string
          change_amount?: number | null
          change_percentage?: number | null
          change_reason?: string
          created_at?: string
          id?: string
          new_budget?: number
          notes?: string | null
          previous_budget?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_budget_changes_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_budget_items: {
        Row: {
          cantidad: number
          categoria: string
          codigo: string
          created_at: string
          created_by: string
          descripcion: string
          id: string
          notas: string | null
          precio_unitario: number
          project_id: string
          status: string
          subcategoria: string | null
          supplier_id: string | null
          total: number
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          categoria: string
          codigo: string
          created_at?: string
          created_by: string
          descripcion: string
          id?: string
          notas?: string | null
          precio_unitario?: number
          project_id: string
          status?: string
          subcategoria?: string | null
          supplier_id?: string | null
          total?: number
          unidad: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          categoria?: string
          codigo?: string
          created_at?: string
          created_by?: string
          descripcion?: string
          id?: string
          notas?: string | null
          precio_unitario?: number
          project_id?: string
          status?: string
          subcategoria?: string | null
          supplier_id?: string | null
          total?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_budget_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_deliveries: {
        Row: {
          actual_arrival_time: string | null
          created_at: string | null
          created_by: string
          delivery_date: string
          delivery_note_number: string | null
          delivery_person_contact: string | null
          delivery_person_name: string | null
          delivery_photos: Json | null
          delivery_status: string | null
          id: string
          inspection_notes: string | null
          inspection_passed: boolean | null
          materials_delivered: Json
          project_id: string
          received_at: string | null
          received_by: string | null
          scheduled_time: string | null
          special_instructions: string | null
          supplier_id: string | null
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          created_at?: string | null
          created_by: string
          delivery_date: string
          delivery_note_number?: string | null
          delivery_person_contact?: string | null
          delivery_person_name?: string | null
          delivery_photos?: Json | null
          delivery_status?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          materials_delivered?: Json
          project_id: string
          received_at?: string | null
          received_by?: string | null
          scheduled_time?: string | null
          special_instructions?: string | null
          supplier_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          created_at?: string | null
          created_by?: string
          delivery_date?: string
          delivery_note_number?: string | null
          delivery_person_contact?: string | null
          delivery_person_name?: string | null
          delivery_photos?: Json | null
          delivery_status?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          materials_delivered?: Json
          project_id?: string
          received_at?: string | null
          received_by?: string | null
          scheduled_time?: string | null
          special_instructions?: string | null
          supplier_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_deliveries_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_deliveries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_expenses: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          description: string
          expense_date: string
          expense_type: string
          id: string
          invoice_number: string | null
          invoice_url: string | null
          notes: string | null
          partida_id: string | null
          payment_method: string | null
          phase_id: string | null
          project_id: string
          quantity: number
          receipt_url: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          supplier_id: string | null
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          description: string
          expense_date?: string
          expense_type: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          partida_id?: string | null
          payment_method?: string | null
          phase_id?: string | null
          project_id: string
          quantity?: number
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          supplier_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          description?: string
          expense_date?: string
          expense_type?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          partida_id?: string | null
          payment_method?: string | null
          phase_id?: string | null
          project_id?: string
          quantity?: number
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          supplier_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_expenses_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_expenses_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_expenses_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_materials: {
        Row: {
          certificate_url: string | null
          created_at: string | null
          created_by: string
          delivery_date: string | null
          description: string | null
          expiry_date: string | null
          id: string
          location_stored: string | null
          material_code: string | null
          material_name: string
          notes: string | null
          partida_id: string | null
          project_id: string
          quality_certified: boolean | null
          quantity_delivered: number | null
          quantity_ordered: number | null
          quantity_required: number
          quantity_used: number | null
          status: string | null
          supplier_id: string | null
          total_cost: number | null
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string | null
          created_by: string
          delivery_date?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          location_stored?: string | null
          material_code?: string | null
          material_name: string
          notes?: string | null
          partida_id?: string | null
          project_id: string
          quality_certified?: boolean | null
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          quantity_required?: number
          quantity_used?: number | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string | null
          created_by?: string
          delivery_date?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          location_stored?: string | null
          material_code?: string | null
          material_name?: string
          notes?: string | null
          partida_id?: string | null
          project_id?: string
          quality_certified?: boolean | null
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          quantity_required?: number
          quantity_used?: number | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_materials_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_phases: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          created_at: string | null
          created_by: string
          dependencies: string[] | null
          description: string | null
          estimated_budget: number | null
          estimated_end_date: string | null
          estimated_start_date: string | null
          id: string
          phase_name: string
          phase_order: number
          phase_type: Database["public"]["Enums"]["construction_phase_type"]
          progress_percentage: number | null
          project_id: string
          required_team_size: number | null
          special_requirements: string | null
          status:
            | Database["public"]["Enums"]["construction_phase_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string | null
          created_by: string
          dependencies?: string[] | null
          description?: string | null
          estimated_budget?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          phase_name: string
          phase_order: number
          phase_type: Database["public"]["Enums"]["construction_phase_type"]
          progress_percentage?: number | null
          project_id: string
          required_team_size?: number | null
          special_requirements?: string | null
          status?:
            | Database["public"]["Enums"]["construction_phase_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string | null
          created_by?: string
          dependencies?: string[] | null
          description?: string | null
          estimated_budget?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          phase_name?: string
          phase_order?: number
          phase_type?: Database["public"]["Enums"]["construction_phase_type"]
          progress_percentage?: number | null
          project_id?: string
          required_team_size?: number | null
          special_requirements?: string | null
          status?:
            | Database["public"]["Enums"]["construction_phase_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_phases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_projects: {
        Row: {
          actual_completion_date: string | null
          construction_area: number
          construction_supervisor_id: string | null
          created_at: string | null
          created_by: string
          estimated_completion_date: string | null
          id: string
          location_coordinates: Json | null
          overall_progress_percentage: number | null
          permit_expiry_date: string | null
          permit_status: string | null
          project_id: string
          project_manager_id: string | null
          safety_requirements: string | null
          spent_budget: number
          start_date: string | null
          total_budget: number
          updated_at: string | null
          weather_considerations: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          construction_area?: number
          construction_supervisor_id?: string | null
          created_at?: string | null
          created_by: string
          estimated_completion_date?: string | null
          id?: string
          location_coordinates?: Json | null
          overall_progress_percentage?: number | null
          permit_expiry_date?: string | null
          permit_status?: string | null
          project_id: string
          project_manager_id?: string | null
          safety_requirements?: string | null
          spent_budget?: number
          start_date?: string | null
          total_budget?: number
          updated_at?: string | null
          weather_considerations?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          construction_area?: number
          construction_supervisor_id?: string | null
          created_at?: string | null
          created_by?: string
          estimated_completion_date?: string | null
          id?: string
          location_coordinates?: Json | null
          overall_progress_percentage?: number | null
          permit_expiry_date?: string | null
          permit_status?: string | null
          project_id?: string
          project_manager_id?: string | null
          safety_requirements?: string | null
          spent_budget?: number
          start_date?: string | null
          total_budget?: number
          updated_at?: string | null
          weather_considerations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_projects_construction_supervisor_id_fkey"
            columns: ["construction_supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_teams: {
        Row: {
          active: boolean | null
          assigned_phases: string[] | null
          contact_info: Json | null
          created_at: string | null
          created_by: string
          daily_rate: number | null
          hourly_rate: number | null
          id: string
          performance_rating: number | null
          project_id: string
          safety_record: string | null
          specialization: string | null
          team_lead_id: string | null
          team_members: Json | null
          team_name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_phases?: string[] | null
          contact_info?: Json | null
          created_at?: string | null
          created_by: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          performance_rating?: number | null
          project_id: string
          safety_record?: string | null
          specialization?: string | null
          team_lead_id?: string | null
          team_members?: Json | null
          team_name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_phases?: string[] | null
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          performance_rating?: number | null
          project_id?: string
          safety_record?: string | null
          specialization?: string | null
          team_lead_id?: string | null
          team_members?: Json | null
          team_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_teams_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_timelines: {
        Row: {
          activity_name: string
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_team_id: string | null
          created_at: string | null
          created_by: string
          depends_on: string[] | null
          description: string | null
          duration_days: number | null
          id: string
          is_critical_path: boolean | null
          notes: string | null
          phase_id: string | null
          planned_end_date: string
          planned_start_date: string
          progress_percentage: number | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          activity_name: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_team_id?: string | null
          created_at?: string | null
          created_by: string
          depends_on?: string[] | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_critical_path?: boolean | null
          notes?: string | null
          phase_id?: string | null
          planned_end_date: string
          planned_start_date: string
          progress_percentage?: number | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          activity_name?: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_team_id?: string | null
          created_at?: string | null
          created_by?: string
          depends_on?: string[] | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_critical_path?: boolean | null
          notes?: string | null
          phase_id?: string | null
          planned_end_date?: string
          planned_start_date?: string
          progress_percentage?: number | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_timelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timelines_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contpaq_export_config: {
        Row: {
          activa: boolean | null
          agrupar_por: string | null
          codificacion: string | null
          concepto_poliza_template: string | null
          created_at: string
          created_by: string
          cuenta_clientes_default: string | null
          cuenta_isr_retenido: string | null
          cuenta_iva_retenido: string | null
          cuenta_iva_trasladado: string | null
          cuenta_ventas_default: string | null
          ejercicio: number
          empresa_bd: string
          formato_exportacion: string | null
          id: string
          incluir_encabezados: boolean | null
          mapeo_auxiliares: Json | null
          mapeo_cuentas: Json | null
          nombre_configuracion: string
          periodo: number | null
          separador_csv: string | null
          tipo_poliza: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean | null
          agrupar_por?: string | null
          codificacion?: string | null
          concepto_poliza_template?: string | null
          created_at?: string
          created_by: string
          cuenta_clientes_default?: string | null
          cuenta_isr_retenido?: string | null
          cuenta_iva_retenido?: string | null
          cuenta_iva_trasladado?: string | null
          cuenta_ventas_default?: string | null
          ejercicio: number
          empresa_bd: string
          formato_exportacion?: string | null
          id?: string
          incluir_encabezados?: boolean | null
          mapeo_auxiliares?: Json | null
          mapeo_cuentas?: Json | null
          nombre_configuracion: string
          periodo?: number | null
          separador_csv?: string | null
          tipo_poliza?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean | null
          agrupar_por?: string | null
          codificacion?: string | null
          concepto_poliza_template?: string | null
          created_at?: string
          created_by?: string
          cuenta_clientes_default?: string | null
          cuenta_isr_retenido?: string | null
          cuenta_iva_retenido?: string | null
          cuenta_iva_trasladado?: string | null
          cuenta_ventas_default?: string | null
          ejercicio?: number
          empresa_bd?: string
          formato_exportacion?: string | null
          id?: string
          incluir_encabezados?: boolean | null
          mapeo_auxiliares?: Json | null
          mapeo_cuentas?: Json | null
          nombre_configuracion?: string
          periodo?: number | null
          separador_csv?: string | null
          tipo_poliza?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      design_appointments: {
        Row: {
          appointment_date: string
          attendees: string[]
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          project_id: string
          status: string | null
          title: string
          updated_at: string
          visible_to_sales: boolean | null
        }
        Insert: {
          appointment_date: string
          attendees: string[]
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          project_id: string
          status?: string | null
          title: string
          updated_at?: string
          visible_to_sales?: boolean | null
        }
        Update: {
          appointment_date?: string
          attendees?: string[]
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          visible_to_sales?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "design_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_phases: {
        Row: {
          actual_completion_date: string | null
          created_at: string
          created_by: string | null
          days_elapsed: number | null
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          phase_name: string
          phase_order: number
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          created_at?: string
          created_by?: string | null
          days_elapsed?: number | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          phase_name: string
          phase_order: number
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          created_at?: string
          created_by?: string | null
          days_elapsed?: number | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          phase_name?: string
          phase_order?: number
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_phases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
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
          department: string | null
          department_permissions: string[] | null
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
          department?: string | null
          department_permissions?: string[] | null
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
          department?: string | null
          department_permissions?: string[] | null
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
      electronic_invoices: {
        Row: {
          cadena_original_complemento: string | null
          certificado_sat: string | null
          client_id: string | null
          conceptos: Json
          condiciones_pago: string | null
          created_at: string
          created_by: string
          descuento: number | null
          emisor_razon_social: string
          emisor_regimen_fiscal: string
          emisor_rfc: string
          estatus: string | null
          fecha_cancelacion: string | null
          fecha_certificacion: string | null
          fecha_emision: string
          fecha_timbrado: string | null
          fecha_vencimiento: string | null
          folio: string
          forma_pago: string | null
          id: string
          impuestos: Json | null
          income_id: string | null
          lugar_expedicion: string
          metodo_pago: string | null
          moneda: string | null
          motivo_cancelacion: string | null
          numero_certificado_sat: string | null
          observaciones: string | null
          orden_compra: string | null
          pac_error_message: string | null
          pac_response: Json | null
          pdf_path: string | null
          project_id: string | null
          receptor_domicilio_fiscal: string | null
          receptor_razon_social: string
          receptor_regimen_fiscal: string | null
          receptor_rfc: string
          receptor_uso_cfdi: string
          referencia_interna: string | null
          rfc_proveedor_certif: string | null
          sello_cfdi: string | null
          sello_sat: string | null
          serie: string
          subtotal: number
          tipo_cambio: number | null
          tipo_comprobante: string
          total: number
          total_impuestos_retenidos: number | null
          total_impuestos_trasladados: number | null
          updated_at: string
          uuid_fiscal: string | null
          uuid_sustitucion: string | null
          version_cfdi: string | null
          xml_content: string | null
          xml_path: string | null
        }
        Insert: {
          cadena_original_complemento?: string | null
          certificado_sat?: string | null
          client_id?: string | null
          conceptos?: Json
          condiciones_pago?: string | null
          created_at?: string
          created_by: string
          descuento?: number | null
          emisor_razon_social: string
          emisor_regimen_fiscal: string
          emisor_rfc: string
          estatus?: string | null
          fecha_cancelacion?: string | null
          fecha_certificacion?: string | null
          fecha_emision?: string
          fecha_timbrado?: string | null
          fecha_vencimiento?: string | null
          folio: string
          forma_pago?: string | null
          id?: string
          impuestos?: Json | null
          income_id?: string | null
          lugar_expedicion: string
          metodo_pago?: string | null
          moneda?: string | null
          motivo_cancelacion?: string | null
          numero_certificado_sat?: string | null
          observaciones?: string | null
          orden_compra?: string | null
          pac_error_message?: string | null
          pac_response?: Json | null
          pdf_path?: string | null
          project_id?: string | null
          receptor_domicilio_fiscal?: string | null
          receptor_razon_social: string
          receptor_regimen_fiscal?: string | null
          receptor_rfc: string
          receptor_uso_cfdi: string
          referencia_interna?: string | null
          rfc_proveedor_certif?: string | null
          sello_cfdi?: string | null
          sello_sat?: string | null
          serie: string
          subtotal?: number
          tipo_cambio?: number | null
          tipo_comprobante: string
          total?: number
          total_impuestos_retenidos?: number | null
          total_impuestos_trasladados?: number | null
          updated_at?: string
          uuid_fiscal?: string | null
          uuid_sustitucion?: string | null
          version_cfdi?: string | null
          xml_content?: string | null
          xml_path?: string | null
        }
        Update: {
          cadena_original_complemento?: string | null
          certificado_sat?: string | null
          client_id?: string | null
          conceptos?: Json
          condiciones_pago?: string | null
          created_at?: string
          created_by?: string
          descuento?: number | null
          emisor_razon_social?: string
          emisor_regimen_fiscal?: string
          emisor_rfc?: string
          estatus?: string | null
          fecha_cancelacion?: string | null
          fecha_certificacion?: string | null
          fecha_emision?: string
          fecha_timbrado?: string | null
          fecha_vencimiento?: string | null
          folio?: string
          forma_pago?: string | null
          id?: string
          impuestos?: Json | null
          income_id?: string | null
          lugar_expedicion?: string
          metodo_pago?: string | null
          moneda?: string | null
          motivo_cancelacion?: string | null
          numero_certificado_sat?: string | null
          observaciones?: string | null
          orden_compra?: string | null
          pac_error_message?: string | null
          pac_response?: Json | null
          pdf_path?: string | null
          project_id?: string | null
          receptor_domicilio_fiscal?: string | null
          receptor_razon_social?: string
          receptor_regimen_fiscal?: string | null
          receptor_rfc?: string
          receptor_uso_cfdi?: string
          referencia_interna?: string | null
          rfc_proveedor_certif?: string | null
          sello_cfdi?: string | null
          sello_sat?: string | null
          serie?: string
          subtotal?: number
          tipo_cambio?: number | null
          tipo_comprobante?: string
          total?: number
          total_impuestos_retenidos?: number | null
          total_impuestos_trasladados?: number | null
          updated_at?: string
          uuid_fiscal?: string | null
          uuid_sustitucion?: string | null
          version_cfdi?: string | null
          xml_content?: string | null
          xml_path?: string | null
        }
        Relationships: []
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
      invoice_cancellations: {
        Row: {
          acuse_cancelacion: string | null
          created_at: string
          created_by: string
          estatus: string | null
          fecha_cancelacion: string | null
          fecha_solicitud: string
          id: string
          invoice_id: string
          motivo_cancelacion: string
          observaciones: string | null
          uuid_sustitucion: string | null
        }
        Insert: {
          acuse_cancelacion?: string | null
          created_at?: string
          created_by: string
          estatus?: string | null
          fecha_cancelacion?: string | null
          fecha_solicitud?: string
          id?: string
          invoice_id: string
          motivo_cancelacion: string
          observaciones?: string | null
          uuid_sustitucion?: string | null
        }
        Update: {
          acuse_cancelacion?: string | null
          created_at?: string
          created_by?: string
          estatus?: string | null
          fecha_cancelacion?: string | null
          fecha_solicitud?: string
          id?: string
          invoice_id?: string
          motivo_cancelacion?: string
          observaciones?: string | null
          uuid_sustitucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_cancellations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "electronic_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_series: {
        Row: {
          activa: boolean | null
          automatica: boolean | null
          created_at: string
          created_by: string
          descripcion: string | null
          folio_actual: number
          folio_final: number | null
          folio_inicial: number
          id: string
          longitud_folio: number | null
          prefijo: string | null
          serie: string
          sufijo: string | null
          tipo_comprobante: string
          updated_at: string
        }
        Insert: {
          activa?: boolean | null
          automatica?: boolean | null
          created_at?: string
          created_by: string
          descripcion?: string | null
          folio_actual?: number
          folio_final?: number | null
          folio_inicial?: number
          id?: string
          longitud_folio?: number | null
          prefijo?: string | null
          serie: string
          sufijo?: string | null
          tipo_comprobante: string
          updated_at?: string
        }
        Update: {
          activa?: boolean | null
          automatica?: boolean | null
          created_at?: string
          created_by?: string
          descripcion?: string | null
          folio_actual?: number
          folio_final?: number | null
          folio_inicial?: number
          id?: string
          longitud_folio?: number | null
          prefijo?: string | null
          serie?: string
          sufijo?: string | null
          tipo_comprobante?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          colors_config: Json | null
          company_logo_path: string | null
          company_logo_url: string | null
          created_at: string
          created_by: string
          fonts_config: Json | null
          footer_config: Json | null
          header_config: Json | null
          id: string
          is_active: boolean | null
          layout_config: Json | null
          template_name: string
          updated_at: string
        }
        Insert: {
          colors_config?: Json | null
          company_logo_path?: string | null
          company_logo_url?: string | null
          created_at?: string
          created_by: string
          fonts_config?: Json | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          layout_config?: Json | null
          template_name?: string
          updated_at?: string
        }
        Update: {
          colors_config?: Json | null
          company_logo_path?: string | null
          company_logo_url?: string | null
          created_at?: string
          created_by?: string
          fonts_config?: Json | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          layout_config?: Json | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      mexican_states: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      module_notifications: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          source_module: string
          target_module: string
          title: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          source_module: string
          target_module: string
          title: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          source_module?: string
          target_module?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_configurations: {
        Row: {
          activo: boolean | null
          api_key: string | null
          api_secret: string | null
          api_url: string
          configuracion_adicional: Json | null
          costo_timbrado: number | null
          created_at: string
          created_by: string
          creditos_disponibles: number | null
          endpoint_cancelacion: string | null
          endpoint_consulta: string | null
          endpoint_timbrado: string | null
          id: string
          limite_mensual: number | null
          modo_pruebas: boolean | null
          nombre: string
          password: string | null
          principal: boolean | null
          proveedor: string
          updated_at: string
          usuario: string | null
        }
        Insert: {
          activo?: boolean | null
          api_key?: string | null
          api_secret?: string | null
          api_url: string
          configuracion_adicional?: Json | null
          costo_timbrado?: number | null
          created_at?: string
          created_by: string
          creditos_disponibles?: number | null
          endpoint_cancelacion?: string | null
          endpoint_consulta?: string | null
          endpoint_timbrado?: string | null
          id?: string
          limite_mensual?: number | null
          modo_pruebas?: boolean | null
          nombre: string
          password?: string | null
          principal?: boolean | null
          proveedor: string
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          activo?: boolean | null
          api_key?: string | null
          api_secret?: string | null
          api_url?: string
          configuracion_adicional?: Json | null
          costo_timbrado?: number | null
          created_at?: string
          created_by?: string
          creditos_disponibles?: number | null
          endpoint_cancelacion?: string | null
          endpoint_consulta?: string | null
          endpoint_timbrado?: string | null
          id?: string
          limite_mensual?: number | null
          modo_pruebas?: boolean | null
          nombre?: string
          password?: string | null
          principal?: boolean | null
          proveedor?: string
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
      partidas_catalog: {
        Row: {
          activo: boolean | null
          categoria: Database["public"]["Enums"]["partida_category"]
          codigo: string
          created_at: string | null
          created_by: string
          descripcion: string | null
          especificaciones_tecnicas: string | null
          factor_desperdicio: number | null
          id: string
          incluye_mano_obra: boolean | null
          nivel: number
          nombre: string
          normativa_aplicable: string | null
          parent_id: string | null
          precio_unitario_base: number | null
          rendimiento_mano_obra: number | null
          unidad: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria: Database["public"]["Enums"]["partida_category"]
          codigo: string
          created_at?: string | null
          created_by: string
          descripcion?: string | null
          especificaciones_tecnicas?: string | null
          factor_desperdicio?: number | null
          id?: string
          incluye_mano_obra?: boolean | null
          nivel?: number
          nombre: string
          normativa_aplicable?: string | null
          parent_id?: string | null
          precio_unitario_base?: number | null
          rendimiento_mano_obra?: number | null
          unidad: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: Database["public"]["Enums"]["partida_category"]
          codigo?: string
          created_at?: string | null
          created_by?: string
          descripcion?: string | null
          especificaciones_tecnicas?: string | null
          factor_desperdicio?: number | null
          id?: string
          incluye_mano_obra?: boolean | null
          nivel?: number
          nombre?: string
          normativa_aplicable?: string | null
          parent_id?: string | null
          precio_unitario_base?: number | null
          rendimiento_mano_obra?: number | null
          unidad?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_catalog_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "partidas_catalog"
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
      payment_complements_tracking: {
        Row: {
          cadena_pago: string | null
          certificado_pago: string | null
          complement_uuid: string | null
          created_at: string
          created_by: string
          cuenta_destino: string | null
          cuenta_origen: string | null
          estatus: string | null
          fecha_pago: string
          forma_pago: string
          id: string
          invoice_id: string
          moneda: string | null
          monto_pago: number
          numero_operacion: string | null
          payment_id: string | null
          pdf_path: string | null
          rfc_banco_destino: string | null
          rfc_banco_origen: string | null
          sello_pago: string | null
          tipo_cadena_pago: string | null
          tipo_cambio: number | null
          updated_at: string
          xml_path: string | null
        }
        Insert: {
          cadena_pago?: string | null
          certificado_pago?: string | null
          complement_uuid?: string | null
          created_at?: string
          created_by: string
          cuenta_destino?: string | null
          cuenta_origen?: string | null
          estatus?: string | null
          fecha_pago: string
          forma_pago: string
          id?: string
          invoice_id: string
          moneda?: string | null
          monto_pago: number
          numero_operacion?: string | null
          payment_id?: string | null
          pdf_path?: string | null
          rfc_banco_destino?: string | null
          rfc_banco_origen?: string | null
          sello_pago?: string | null
          tipo_cadena_pago?: string | null
          tipo_cambio?: number | null
          updated_at?: string
          xml_path?: string | null
        }
        Update: {
          cadena_pago?: string | null
          certificado_pago?: string | null
          complement_uuid?: string | null
          created_at?: string
          created_by?: string
          cuenta_destino?: string | null
          cuenta_origen?: string | null
          estatus?: string | null
          fecha_pago?: string
          forma_pago?: string
          id?: string
          invoice_id?: string
          moneda?: string | null
          monto_pago?: number
          numero_operacion?: string | null
          payment_id?: string | null
          pdf_path?: string | null
          rfc_banco_destino?: string | null
          rfc_banco_origen?: string | null
          sello_pago?: string | null
          tipo_cadena_pago?: string | null
          tipo_cambio?: number | null
          updated_at?: string
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_complements_tracking_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "electronic_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_complements_tracking_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "client_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_installments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          installment_number: number
          paid_date: string | null
          payment_plan_id: string
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_date?: string | null
          payment_plan_id: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_date?: string | null
          payment_plan_id?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          client_project_id: string
          created_at: string
          created_by: string
          currency: string
          end_date: string | null
          id: string
          notes: string | null
          payment_frequency: string
          plan_name: string
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_project_id: string
          created_at?: string
          created_by: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_frequency?: string
          plan_name: string
          start_date: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_project_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_frequency?: string
          plan_name?: string
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
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
      products_services: {
        Row: {
          activo: boolean | null
          aplica_ieps: boolean | null
          aplica_iva: boolean | null
          categoria: string | null
          clave_sat: string
          codigo_barras: string | null
          codigo_interno: string
          created_at: string
          created_by: string
          cuenta_contable: string | null
          descripcion: string | null
          id: string
          imagen_url: string | null
          marca: string | null
          modelo: string | null
          nombre: string
          notas: string | null
          objeto_impuesto: string | null
          precio_maximo: number | null
          precio_minimo: number | null
          precio_unitario: number
          stock_actual: number | null
          stock_minimo: number | null
          subcategoria: string | null
          tasa_ieps: number | null
          tasa_iva: number | null
          tipo: string
          unidad_sat: string
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          aplica_ieps?: boolean | null
          aplica_iva?: boolean | null
          categoria?: string | null
          clave_sat: string
          codigo_barras?: string | null
          codigo_interno: string
          created_at?: string
          created_by: string
          cuenta_contable?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre: string
          notas?: string | null
          objeto_impuesto?: string | null
          precio_maximo?: number | null
          precio_minimo?: number | null
          precio_unitario?: number
          stock_actual?: number | null
          stock_minimo?: number | null
          subcategoria?: string | null
          tasa_ieps?: number | null
          tasa_iva?: number | null
          tipo?: string
          unidad_sat: string
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          aplica_ieps?: boolean | null
          aplica_iva?: boolean | null
          categoria?: string | null
          clave_sat?: string
          codigo_barras?: string | null
          codigo_interno?: string
          created_at?: string
          created_by?: string
          cuenta_contable?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre?: string
          notas?: string | null
          objeto_impuesto?: string | null
          precio_maximo?: number | null
          precio_minimo?: number | null
          precio_unitario?: number
          stock_actual?: number | null
          stock_minimo?: number | null
          subcategoria?: string | null
          tasa_ieps?: number | null
          tasa_iva?: number | null
          tipo?: string
          unidad_sat?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          availability_status: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          position: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_milestones: {
        Row: {
          actual_date: string | null
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          completion_percentage: number | null
          construction_project_id: string
          created_at: string | null
          created_by: string
          id: string
          is_completed: boolean | null
          milestone_name: string
          milestone_type: Database["public"]["Enums"]["progress_milestone_type"]
          notes: string | null
          phase_id: string | null
          responsible_person_id: string | null
          target_date: string
          updated_at: string | null
          verification_criteria: string | null
        }
        Insert: {
          actual_date?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number | null
          construction_project_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_completed?: boolean | null
          milestone_name: string
          milestone_type: Database["public"]["Enums"]["progress_milestone_type"]
          notes?: string | null
          phase_id?: string | null
          responsible_person_id?: string | null
          target_date: string
          updated_at?: string | null
          verification_criteria?: string | null
        }
        Update: {
          actual_date?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number | null
          construction_project_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_completed?: boolean | null
          milestone_name?: string
          milestone_type?: Database["public"]["Enums"]["progress_milestone_type"]
          notes?: string | null
          phase_id?: string | null
          responsible_person_id?: string | null
          target_date?: string
          updated_at?: string | null
          verification_criteria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_milestones_construction_project_id_fkey"
            columns: ["construction_project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_milestones_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          before_photo_id: string | null
          camera_angle: string | null
          construction_project_id: string | null
          coordinates: Json | null
          description: string | null
          file_path: string | null
          id: string
          is_before_photo: boolean | null
          milestone_id: string | null
          phase_id: string | null
          photo_url: string
          project_id: string
          tags: string[] | null
          taken_at: string
          taken_by: string
          taken_date: string | null
          title: string | null
          uploaded_by_temp: string | null
          visibility: string | null
          weather_conditions: string | null
        }
        Insert: {
          before_photo_id?: string | null
          camera_angle?: string | null
          construction_project_id?: string | null
          coordinates?: Json | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_before_photo?: boolean | null
          milestone_id?: string | null
          phase_id?: string | null
          photo_url: string
          project_id: string
          tags?: string[] | null
          taken_at?: string
          taken_by: string
          taken_date?: string | null
          title?: string | null
          uploaded_by_temp?: string | null
          visibility?: string | null
          weather_conditions?: string | null
        }
        Update: {
          before_photo_id?: string | null
          camera_angle?: string | null
          construction_project_id?: string | null
          coordinates?: Json | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_before_photo?: boolean | null
          milestone_id?: string | null
          phase_id?: string | null
          photo_url?: string
          project_id?: string
          tags?: string[] | null
          taken_at?: string
          taken_by?: string
          taken_date?: string | null
          title?: string | null
          uploaded_by_temp?: string | null
          visibility?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_before_photo_id_fkey"
            columns: ["before_photo_id"]
            isOneToOne: false
            referencedRelation: "progress_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_construction_project_id_fkey"
            columns: ["construction_project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "progress_milestones"
            referencedColumns: ["id"]
          },
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
      project_budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_name: string
          created_at: string
          created_by: string
          id: string
          project_id: string
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_name?: string
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_name?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
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
      project_team_members: {
        Row: {
          assigned_date: string
          created_at: string
          id: string
          is_active: boolean | null
          project_id: string
          responsibilities: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id: string
          responsibilities?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          responsibilities?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_user_id_fkey"
            columns: ["user_id"]
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
      quality_checks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          check_name: string
          check_type: string
          construction_project_id: string
          corrective_actions: string | null
          created_at: string | null
          created_by: string
          criteria_checked: Json | null
          defects_found: string | null
          description: string | null
          documents: Json | null
          id: string
          inspection_date: string
          inspector_id: string | null
          notes: string | null
          phase_id: string | null
          photos: Json | null
          reinspection_date: string | null
          reinspection_required: boolean | null
          score: number | null
          status: Database["public"]["Enums"]["quality_check_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          check_name: string
          check_type: string
          construction_project_id: string
          corrective_actions?: string | null
          created_at?: string | null
          created_by: string
          criteria_checked?: Json | null
          defects_found?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          inspection_date: string
          inspector_id?: string | null
          notes?: string | null
          phase_id?: string | null
          photos?: Json | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          score?: number | null
          status?: Database["public"]["Enums"]["quality_check_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          check_name?: string
          check_type?: string
          construction_project_id?: string
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string
          criteria_checked?: Json | null
          defects_found?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          phase_id?: string | null
          photos?: Json | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          score?: number | null
          status?: Database["public"]["Enums"]["quality_check_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_construction_project_id_fkey"
            columns: ["construction_project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
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
      sat_product_catalog: {
        Row: {
          clave_producto: string
          complemento_concepto: string | null
          created_at: string
          descripcion: string
          estimulo_frontera: string | null
          fecha_fin_vigencia: string | null
          fecha_inicio_vigencia: string | null
          id: string
          incluye_iva: boolean | null
        }
        Insert: {
          clave_producto: string
          complemento_concepto?: string | null
          created_at?: string
          descripcion: string
          estimulo_frontera?: string | null
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          incluye_iva?: boolean | null
        }
        Update: {
          clave_producto?: string
          complemento_concepto?: string | null
          created_at?: string
          descripcion?: string
          estimulo_frontera?: string | null
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          incluye_iva?: boolean | null
        }
        Relationships: []
      }
      sat_product_keys: {
        Row: {
          clave: string
          created_at: string
          descripcion: string
          fecha_fin_vigencia: string | null
          fecha_inicio_vigencia: string | null
          id: string
          incluye_complemento: boolean | null
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          descripcion: string
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          incluye_complemento?: boolean | null
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          descripcion?: string
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          incluye_complemento?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      sat_unit_catalog: {
        Row: {
          clave_unidad: string
          created_at: string
          descripcion: string | null
          fecha_fin_vigencia: string | null
          fecha_inicio_vigencia: string | null
          id: string
          nombre: string
          nota: string | null
          simbolo: string | null
        }
        Insert: {
          clave_unidad: string
          created_at?: string
          descripcion?: string | null
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          nombre: string
          nota?: string | null
          simbolo?: string | null
        }
        Update: {
          clave_unidad?: string
          created_at?: string
          descripcion?: string | null
          fecha_fin_vigencia?: string | null
          fecha_inicio_vigencia?: string | null
          id?: string
          nombre?: string
          nota?: string | null
          simbolo?: string | null
        }
        Relationships: []
      }
      sat_unit_keys: {
        Row: {
          clave: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          simbolo: string | null
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          simbolo?: string | null
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          simbolo?: string | null
          updated_at?: string
        }
        Relationships: []
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
      check_budget_alerts: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      create_construction_project_from_client: {
        Args: { client_project_id: string }
        Returns: string
      }
      create_default_design_phases: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      get_project_cumulative_documents: {
        Args: { project_id_param: string; user_department?: string }
        Returns: {
          id: string
          name: string
          file_path: string
          department: string
          uploaded_by: string
          created_at: string
          file_type: string
          file_size: number
          description: string
          uploader_name: string
        }[]
      }
      has_module_permission: {
        Args: {
          _user_id: string
          _module: Database["public"]["Enums"]["module_name"]
          _permission: string
        }
        Returns: boolean
      }
      insert_default_budget_items: {
        Args: { budget_id_param: string }
        Returns: undefined
      }
      insert_default_construction_budget_items: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      revert_project_from_construction: {
        Args: { project_id_param: string; revert_reason: string }
        Returns: undefined
      }
      update_design_phase_days_elapsed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      client_status:
        | "potential"
        | "existing"
        | "active"
        | "completed"
        | "nuevo_lead"
        | "en_contacto"
        | "lead_perdido"
        | "cliente_cerrado"
        | "design"
        | "construction"
        | "design_completed"
        | "design_only_completed"
        | "budget_accepted"
      construction_phase_status:
        | "not_started"
        | "in_progress"
        | "paused"
        | "completed"
        | "cancelled"
      construction_phase_type:
        | "preliminares"
        | "cimentacion"
        | "estructura"
        | "albanileria"
        | "instalaciones"
        | "acabados"
        | "exteriores"
        | "limpieza"
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
      expense_status: "pending" | "approved" | "paid" | "cancelled"
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
        | "commercial_alliance"
      module_name:
        | "dashboard"
        | "clients"
        | "projects"
        | "documents"
        | "finances"
        | "accounting"
        | "progress_photos"
      partida_category:
        | "mano_obra"
        | "materiales"
        | "herramientas"
        | "transporte"
        | "otros"
      payable_status: "pending" | "partial" | "paid" | "overdue" | "cancelled"
      priority_level: "low" | "medium" | "high" | "urgent"
      progress_milestone_type:
        | "start"
        | "inspection"
        | "delivery"
        | "completion"
        | "quality_check"
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
      quality_check_status: "pending" | "passed" | "failed" | "needs_rework"
      receivable_status: "pending" | "partial" | "paid" | "overdue"
      sales_pipeline_stage:
        | "nuevo_lead"
        | "en_contacto"
        | "lead_perdido"
        | "cliente_cerrado"
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
      client_status: [
        "potential",
        "existing",
        "active",
        "completed",
        "nuevo_lead",
        "en_contacto",
        "lead_perdido",
        "cliente_cerrado",
        "design",
        "construction",
        "design_completed",
        "design_only_completed",
        "budget_accepted",
      ],
      construction_phase_status: [
        "not_started",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
      ],
      construction_phase_type: [
        "preliminares",
        "cimentacion",
        "estructura",
        "albanileria",
        "instalaciones",
        "acabados",
        "exteriores",
        "limpieza",
      ],
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
      expense_status: ["pending", "approved", "paid", "cancelled"],
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
        "commercial_alliance",
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
      partida_category: [
        "mano_obra",
        "materiales",
        "herramientas",
        "transporte",
        "otros",
      ],
      payable_status: ["pending", "partial", "paid", "overdue", "cancelled"],
      priority_level: ["low", "medium", "high", "urgent"],
      progress_milestone_type: [
        "start",
        "inspection",
        "delivery",
        "completion",
        "quality_check",
      ],
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
      quality_check_status: ["pending", "passed", "failed", "needs_rework"],
      receivable_status: ["pending", "partial", "paid", "overdue"],
      sales_pipeline_stage: [
        "nuevo_lead",
        "en_contacto",
        "lead_perdido",
        "cliente_cerrado",
      ],
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
