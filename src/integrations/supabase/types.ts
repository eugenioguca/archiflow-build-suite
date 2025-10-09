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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          account_type: string
          bank_name: string
          branch: string | null
          clabe: string | null
          created_at: string
          created_by: string
          credit_limit: number | null
          current_balance: number
          id: string
          notes: string | null
          status: string
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          account_type?: string
          bank_name: string
          branch?: string | null
          clabe?: string | null
          created_at?: string
          created_by: string
          credit_limit?: number | null
          current_balance?: number
          id?: string
          notes?: string | null
          status?: string
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          branch?: string | null
          clabe?: string | null
          created_at?: string
          created_by?: string
          credit_limit?: number | null
          current_balance?: number
          id?: string
          notes?: string | null
          status?: string
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bank_created_by"
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
      budget_annotations: {
        Row: {
          annotation_type: string
          budget_item_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          updated_at: string
        }
        Insert: {
          annotation_type?: string
          budget_item_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          budget_item_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_annotations_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_annotations_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "budget_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_change_log: {
        Row: {
          budget_item_id: string
          change_comments: string | null
          change_reason: string
          change_type: string
          changed_by: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          project_id: string
        }
        Insert: {
          budget_item_id: string
          change_comments?: string | null
          change_reason: string
          change_type: string
          changed_by: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id: string
        }
        Update: {
          budget_item_id?: string
          change_comments?: string | null
          change_reason?: string
          change_type?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_budget_change_log_changed_by"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budget_change_log_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budget_change_log_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_budget_change_log_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
      budget_supply_status: {
        Row: {
          budget_item_id: string
          created_at: string
          id: string
          last_updated_at: string
          notes: string | null
          status: string
          updated_by: string
        }
        Insert: {
          budget_item_id: string
          created_at?: string
          id?: string
          last_updated_at?: string
          notes?: string | null
          status?: string
          updated_by: string
        }
        Update: {
          budget_item_id?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          notes?: string | null
          status?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_supply_status_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_supply_status_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "budget_supply_status_updated_by_fkey"
            columns: ["updated_by"]
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
          {
            foreignKeyName: "fk_cash_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_cash_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_responsible_user"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "cfdi_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
            foreignKeyName: "cfdi_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts_departamentos: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string
          departamento: string
          id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by: string
          departamento: string
          id?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string
          departamento?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chart_of_accounts_mayor: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string
          departamento: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by: string
          departamento: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string
          departamento?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      chart_of_accounts_partidas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string
          id: string
          mayor_id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by: string
          id?: string
          mayor_id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string
          id?: string
          mayor_id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_partidas_mayor_id_fkey"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts_subpartidas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string
          departamento_aplicable: string | null
          es_global: boolean
          id: string
          nombre: string
          partida_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by: string
          departamento_aplicable?: string | null
          es_global?: boolean
          id?: string
          nombre: string
          partida_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string
          departamento_aplicable?: string | null
          es_global?: boolean
          id?: string
          nombre?: string
          partida_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_subpartidas_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_id: string
          project_id: string
          recipient_id: string
          recipient_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id: string
          project_id: string
          recipient_id: string
          recipient_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id?: string
          project_id?: string
          recipient_id?: string
          recipient_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_notifications_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "project_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_notifications_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_notifications_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_chat_notifications_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents_deprecated_backup: {
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
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
            foreignKeyName: "client_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
      client_payment_proofs: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          payment_installment_id: string | null
          project_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          upload_date: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_installment_id?: string | null
          project_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          upload_date?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_installment_id?: string | null
          project_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_proofs_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
      client_portal_notifications: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          project_id: string
          read: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          project_id: string
          read?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          project_id?: string
          read?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_portal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
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
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_calendar_event_alerts: {
        Row: {
          alert_type: string
          alert_value: number
          created_at: string
          event_id: string
          id: string
          is_triggered: boolean
          sound_enabled: boolean
          sound_type: string | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          alert_value: number
          created_at?: string
          event_id: string
          id?: string
          is_triggered?: boolean
          sound_enabled?: boolean
          sound_type?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          alert_value?: number
          created_at?: string
          event_id?: string
          id?: string
          is_triggered?: boolean
          sound_enabled?: boolean
          sound_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_calendar_event_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "client_project_calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_calendar_events: {
        Row: {
          all_day: boolean
          client_project_id: string
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_type: string
          id: string
          location: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          client_project_id: string
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_type?: string
          id?: string
          location?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          client_project_id?: string
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_calendar_events_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_project_calendar_events_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_project_calendar_events_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_project_calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          land_surface_area: number | null
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
          land_surface_area?: number | null
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
          land_surface_area?: number | null
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
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
      company_branding: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
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
      company_promotions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_budget_items: {
        Row: {
          actual_completion_date: string | null
          actual_start_date: string | null
          baseline_quantity: number | null
          baseline_total: number | null
          baseline_unit_price: number | null
          budget_version: number | null
          category: string
          created_at: string
          created_by: string
          current_eac_method: string | null
          drawing_references: Json | null
          environmental_considerations: string | null
          equipment_cost: number | null
          estimated_completion_date: string | null
          estimated_start_date: string | null
          executed_amount: number | null
          executed_quantity: number | null
          id: string
          is_baseline_locked: boolean | null
          item_code: string | null
          item_description: string | null
          item_name: string
          item_order: number
          labor_cost: number | null
          level_depth: number | null
          manual_eac_price: number | null
          material_cost: number | null
          overhead_percentage: number | null
          parent_item_id: string | null
          phase_id: string | null
          price_analysis: Json | null
          profit_percentage: number | null
          project_id: string
          quality_requirements: Json | null
          quantity: number
          remaining_quantity: number | null
          risk_factor: number | null
          safety_requirements: Json | null
          source_budget_item_id: string | null
          specialty: string | null
          specifications: string | null
          status: string | null
          subcategory: string | null
          supplier_id: string | null
          total_price: number
          unit_of_measure: string
          unit_price: number
          updated_at: string
          waste_factor: number | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          baseline_quantity?: number | null
          baseline_total?: number | null
          baseline_unit_price?: number | null
          budget_version?: number | null
          category: string
          created_at?: string
          created_by: string
          current_eac_method?: string | null
          drawing_references?: Json | null
          environmental_considerations?: string | null
          equipment_cost?: number | null
          estimated_completion_date?: string | null
          estimated_start_date?: string | null
          executed_amount?: number | null
          executed_quantity?: number | null
          id?: string
          is_baseline_locked?: boolean | null
          item_code?: string | null
          item_description?: string | null
          item_name: string
          item_order?: number
          labor_cost?: number | null
          level_depth?: number | null
          manual_eac_price?: number | null
          material_cost?: number | null
          overhead_percentage?: number | null
          parent_item_id?: string | null
          phase_id?: string | null
          price_analysis?: Json | null
          profit_percentage?: number | null
          project_id: string
          quality_requirements?: Json | null
          quantity?: number
          remaining_quantity?: number | null
          risk_factor?: number | null
          safety_requirements?: Json | null
          source_budget_item_id?: string | null
          specialty?: string | null
          specifications?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          total_price?: number
          unit_of_measure: string
          unit_price?: number
          updated_at?: string
          waste_factor?: number | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          baseline_quantity?: number | null
          baseline_total?: number | null
          baseline_unit_price?: number | null
          budget_version?: number | null
          category?: string
          created_at?: string
          created_by?: string
          current_eac_method?: string | null
          drawing_references?: Json | null
          environmental_considerations?: string | null
          equipment_cost?: number | null
          estimated_completion_date?: string | null
          estimated_start_date?: string | null
          executed_amount?: number | null
          executed_quantity?: number | null
          id?: string
          is_baseline_locked?: boolean | null
          item_code?: string | null
          item_description?: string | null
          item_name?: string
          item_order?: number
          labor_cost?: number | null
          level_depth?: number | null
          manual_eac_price?: number | null
          material_cost?: number | null
          overhead_percentage?: number | null
          parent_item_id?: string | null
          phase_id?: string | null
          price_analysis?: Json | null
          profit_percentage?: number | null
          project_id?: string
          quality_requirements?: Json | null
          quantity?: number
          remaining_quantity?: number | null
          risk_factor?: number | null
          safety_requirements?: Json | null
          source_budget_item_id?: string | null
          specialty?: string | null
          specifications?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          total_price?: number
          unit_of_measure?: string
          unit_price?: number
          updated_at?: string
          waste_factor?: number | null
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
            foreignKeyName: "construction_budget_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "construction_budget_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
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
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_equipment: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          assigned_to_user_id: string | null
          brand: string | null
          condition_rating: number | null
          created_at: string
          created_by: string
          current_phase_id: string | null
          current_value: number | null
          daily_rate: number | null
          depreciation_rate: number | null
          documents: Json | null
          equipment_code: string | null
          equipment_name: string
          equipment_type: string
          fuel_consumption_per_hour: number | null
          hourly_rate: number | null
          id: string
          insurance_expiry: string | null
          insurance_policy: string | null
          last_maintenance_date: string | null
          location: string | null
          maintenance_cost_total: number | null
          maintenance_schedule: Json | null
          model: string | null
          monthly_rate: number | null
          next_maintenance_date: string | null
          notes: string | null
          operating_hours_total: number | null
          operator_requirements: Json | null
          photos: Json | null
          project_id: string
          safety_certifications: Json | null
          serial_number: string | null
          status: string | null
          updated_at: string
          usage_log: Json | null
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_to_user_id?: string | null
          brand?: string | null
          condition_rating?: number | null
          created_at?: string
          created_by: string
          current_phase_id?: string | null
          current_value?: number | null
          daily_rate?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          equipment_code?: string | null
          equipment_name: string
          equipment_type: string
          fuel_consumption_per_hour?: number | null
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_cost_total?: number | null
          maintenance_schedule?: Json | null
          model?: string | null
          monthly_rate?: number | null
          next_maintenance_date?: string | null
          notes?: string | null
          operating_hours_total?: number | null
          operator_requirements?: Json | null
          photos?: Json | null
          project_id: string
          safety_certifications?: Json | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          usage_log?: Json | null
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_to_user_id?: string | null
          brand?: string | null
          condition_rating?: number | null
          created_at?: string
          created_by?: string
          current_phase_id?: string | null
          current_value?: number | null
          daily_rate?: number | null
          depreciation_rate?: number | null
          documents?: Json | null
          equipment_code?: string | null
          equipment_name?: string
          equipment_type?: string
          fuel_consumption_per_hour?: number | null
          hourly_rate?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          last_maintenance_date?: string | null
          location?: string | null
          maintenance_cost_total?: number | null
          maintenance_schedule?: Json | null
          model?: string | null
          monthly_rate?: number | null
          next_maintenance_date?: string | null
          notes?: string | null
          operating_hours_total?: number | null
          operator_requirements?: Json | null
          photos?: Json | null
          project_id?: string
          safety_certifications?: Json | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          usage_log?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_equipment_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_equipment_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_milestones: {
        Row: {
          completion_date: string | null
          created_at: string
          created_by: string
          deliverable_requirements: Json | null
          description: string | null
          id: string
          is_critical: boolean | null
          milestone_code: string | null
          milestone_name: string
          milestone_order: number
          phase_id: string
          project_id: string
          responsible_person_id: string | null
          status: string | null
          target_date: string
          updated_at: string
          verification_criteria: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          created_by: string
          deliverable_requirements?: Json | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          milestone_code?: string | null
          milestone_name: string
          milestone_order?: number
          phase_id: string
          project_id: string
          responsible_person_id?: string | null
          status?: string | null
          target_date: string
          updated_at?: string
          verification_criteria?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          created_by?: string
          deliverable_requirements?: Json | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          milestone_code?: string | null
          milestone_name?: string
          milestone_order?: number
          phase_id?: string
          project_id?: string
          responsible_person_id?: string | null
          status?: string | null
          target_date?: string
          updated_at?: string
          verification_criteria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_milestones_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_phases: {
        Row: {
          actual_cost: number | null
          actual_duration_days: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          created_at: string
          created_by: string
          critical_path: boolean | null
          deliverables: Json | null
          dependencies: Json | null
          description: string | null
          estimated_cost: number | null
          estimated_duration_days: number | null
          estimated_end_date: string | null
          estimated_start_date: string | null
          id: string
          parent_phase_id: string | null
          phase_code: string | null
          phase_name: string
          phase_order: number
          progress_percentage: number | null
          project_id: string
          requirements: Json | null
          responsible_team_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string
          created_by: string
          critical_path?: boolean | null
          deliverables?: Json | null
          dependencies?: Json | null
          description?: string | null
          estimated_cost?: number | null
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          parent_phase_id?: string | null
          phase_code?: string | null
          phase_name: string
          phase_order?: number
          progress_percentage?: number | null
          project_id: string
          requirements?: Json | null
          responsible_team_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          created_at?: string
          created_by?: string
          critical_path?: boolean | null
          deliverables?: Json | null
          dependencies?: Json | null
          description?: string | null
          estimated_cost?: number | null
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          parent_phase_id?: string | null
          phase_code?: string | null
          phase_name?: string
          phase_order?: number
          progress_percentage?: number | null
          project_id?: string
          requirements?: Json | null
          responsible_team_id?: string | null
          status?: string | null
          updated_at?: string
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
            foreignKeyName: "construction_phases_parent_phase_id_fkey"
            columns: ["parent_phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_settings: {
        Row: {
          alert_threshold_days: number
          created_at: string
          created_by: string
          eac_method_default: string
          id: string
          lead_days_default: number
          project_id: string
          updated_at: string
        }
        Insert: {
          alert_threshold_days?: number
          created_at?: string
          created_by: string
          eac_method_default?: string
          id?: string
          lead_days_default?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          alert_threshold_days?: number
          created_at?: string
          created_by?: string
          eac_method_default?: string
          id?: string
          lead_days_default?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_teams: {
        Row: {
          certifications: Json | null
          contact_information: Json | null
          created_at: string
          created_by: string
          current_location: string | null
          current_phase_id: string | null
          daily_rate: number | null
          emergency_contacts: Json | null
          end_date: string | null
          equipment_assigned: Json | null
          hourly_rate: number | null
          id: string
          insurance_coverage: Json | null
          members: Json
          notes: string | null
          performance_rating: number | null
          productivity_metrics: Json | null
          project_id: string
          safety_record: Json | null
          safety_training: Json | null
          specialty: string
          start_date: string
          status: string | null
          team_code: string | null
          team_leader_id: string | null
          team_name: string
          team_type: string
          updated_at: string
          work_schedule: Json | null
        }
        Insert: {
          certifications?: Json | null
          contact_information?: Json | null
          created_at?: string
          created_by: string
          current_location?: string | null
          current_phase_id?: string | null
          daily_rate?: number | null
          emergency_contacts?: Json | null
          end_date?: string | null
          equipment_assigned?: Json | null
          hourly_rate?: number | null
          id?: string
          insurance_coverage?: Json | null
          members?: Json
          notes?: string | null
          performance_rating?: number | null
          productivity_metrics?: Json | null
          project_id: string
          safety_record?: Json | null
          safety_training?: Json | null
          specialty: string
          start_date: string
          status?: string | null
          team_code?: string | null
          team_leader_id?: string | null
          team_name: string
          team_type: string
          updated_at?: string
          work_schedule?: Json | null
        }
        Update: {
          certifications?: Json | null
          contact_information?: Json | null
          created_at?: string
          created_by?: string
          current_location?: string | null
          current_phase_id?: string | null
          daily_rate?: number | null
          emergency_contacts?: Json | null
          end_date?: string | null
          equipment_assigned?: Json | null
          hourly_rate?: number | null
          id?: string
          insurance_coverage?: Json | null
          members?: Json
          notes?: string | null
          performance_rating?: number | null
          productivity_metrics?: Json | null
          project_id?: string
          safety_record?: Json | null
          safety_training?: Json | null
          specialty?: string
          start_date?: string
          status?: string | null
          team_code?: string | null
          team_leader_id?: string | null
          team_name?: string
          team_type?: string
          updated_at?: string
          work_schedule?: Json | null
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
            foreignKeyName: "construction_teams_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
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
            foreignKeyName: "construction_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_teams_team_leader_id_fkey"
            columns: ["team_leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_timeline: {
        Row: {
          acceptance_criteria: string | null
          activity_code: string | null
          activity_name: string
          activity_order: number | null
          activity_type: string | null
          actual_duration_days: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_resources: Json | null
          assigned_team_id: string | null
          assumptions: Json | null
          baseline_duration: number | null
          baseline_end_date: string | null
          baseline_start_date: string | null
          constraints: Json | null
          cost_actual: number | null
          cost_budget: number | null
          created_at: string
          created_by: string
          critical_path: boolean | null
          deliverables: Json | null
          earned_value: number | null
          estimated_duration_days: number | null
          estimated_end_date: string | null
          estimated_start_date: string | null
          free_float_days: number | null
          id: string
          level_depth: number | null
          notes: string | null
          parent_activity_id: string | null
          phase_id: string | null
          predecessor_activities: Json | null
          priority: string | null
          progress_percentage: number | null
          project_id: string
          quality_criteria: Json | null
          resource_leveling: Json | null
          resource_requirements: Json | null
          risks: Json | null
          status: string | null
          successor_activities: Json | null
          total_float_days: number | null
          updated_at: string
          variance_duration_days: number | null
          variance_end_days: number | null
          variance_start_days: number | null
          wbs_code: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          activity_code?: string | null
          activity_name: string
          activity_order?: number | null
          activity_type?: string | null
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_resources?: Json | null
          assigned_team_id?: string | null
          assumptions?: Json | null
          baseline_duration?: number | null
          baseline_end_date?: string | null
          baseline_start_date?: string | null
          constraints?: Json | null
          cost_actual?: number | null
          cost_budget?: number | null
          created_at?: string
          created_by: string
          critical_path?: boolean | null
          deliverables?: Json | null
          earned_value?: number | null
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          free_float_days?: number | null
          id?: string
          level_depth?: number | null
          notes?: string | null
          parent_activity_id?: string | null
          phase_id?: string | null
          predecessor_activities?: Json | null
          priority?: string | null
          progress_percentage?: number | null
          project_id: string
          quality_criteria?: Json | null
          resource_leveling?: Json | null
          resource_requirements?: Json | null
          risks?: Json | null
          status?: string | null
          successor_activities?: Json | null
          total_float_days?: number | null
          updated_at?: string
          variance_duration_days?: number | null
          variance_end_days?: number | null
          variance_start_days?: number | null
          wbs_code?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          activity_code?: string | null
          activity_name?: string
          activity_order?: number | null
          activity_type?: string | null
          actual_duration_days?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_resources?: Json | null
          assigned_team_id?: string | null
          assumptions?: Json | null
          baseline_duration?: number | null
          baseline_end_date?: string | null
          baseline_start_date?: string | null
          constraints?: Json | null
          cost_actual?: number | null
          cost_budget?: number | null
          created_at?: string
          created_by?: string
          critical_path?: boolean | null
          deliverables?: Json | null
          earned_value?: number | null
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          free_float_days?: number | null
          id?: string
          level_depth?: number | null
          notes?: string | null
          parent_activity_id?: string | null
          phase_id?: string | null
          predecessor_activities?: Json | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string
          quality_criteria?: Json | null
          resource_leveling?: Json | null
          resource_requirements?: Json | null
          risks?: Json | null
          status?: string | null
          successor_activities?: Json | null
          total_float_days?: number | null
          updated_at?: string
          variance_duration_days?: number | null
          variance_end_days?: number | null
          variance_start_days?: number | null
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timeline_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "construction_timeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timeline_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timeline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_timeline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_timeline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
          {
            foreignKeyName: "crm_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
          {
            foreignKeyName: "crm_proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
          {
            foreignKeyName: "crm_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_gantt: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string
          departamento: string
          duracion: number | null
          duration_weeks: number | null
          end_month: number | null
          end_week: number | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          mayor_id: string
          proyecto_id: string
          start_month: number | null
          start_week: number | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by: string
          departamento?: string
          duracion?: number | null
          duration_weeks?: number | null
          end_month?: number | null
          end_week?: number | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          mayor_id: string
          proyecto_id: string
          start_month?: number | null
          start_week?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string
          departamento?: string
          duracion?: number | null
          duration_weeks?: number | null
          end_month?: number | null
          end_week?: number | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          mayor_id?: string
          proyecto_id?: string
          start_month?: number | null
          start_week?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cronograma_gantt_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cronograma_gantt_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cronograma_gantt_mayor"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cronograma_gantt_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cronograma_gantt_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_cronograma_gantt_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_gantt_activity: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_month: string
          end_week: number
          id: string
          line_id: string
          start_month: string
          start_week: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_month: string
          end_week: number
          id?: string
          line_id: string
          start_month: string
          start_week: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_month?: string
          end_week?: number
          id?: string
          line_id?: string
          start_month?: string
          start_week?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_gantt_activity_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_line"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_gantt_activity_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "v_planning_gantt_for_construction"
            referencedColumns: ["source_activity_id"]
          },
        ]
      }
      cronograma_gantt_line: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          es_importado: boolean | null
          estado_sync: string | null
          id: string
          is_discount: boolean
          label: string | null
          line_no: number
          mayor_id: string | null
          order_index: number
          percent: number | null
          plan_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          es_importado?: boolean | null
          estado_sync?: string | null
          id?: string
          is_discount?: boolean
          label?: string | null
          line_no: number
          mayor_id?: string | null
          order_index?: number
          percent?: number | null
          plan_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          es_importado?: boolean | null
          estado_sync?: string | null
          id?: string
          is_discount?: boolean
          label?: string | null
          line_no?: number
          mayor_id?: string | null
          order_index?: number
          percent?: number | null
          plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_gantt_line_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_gantt_plan: {
        Row: {
          cliente_id: string
          created_at: string | null
          created_by: string | null
          id: string
          months_count: number
          proyecto_id: string
          start_month: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          months_count?: number
          proyecto_id: string
          start_month: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          months_count?: number
          proyecto_id?: string
          start_month?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cronograma_gantt_reference_lines: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          label: string | null
          plan_id: string
          position_month: string
          position_week: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          plan_id: string
          position_month: string
          position_week: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          plan_id?: string
          position_month?: string
          position_week?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_gantt_reference_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_gantt_reference_lines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_matriz_manual: {
        Row: {
          cliente_id: string
          concepto: string
          created_at: string
          id: string
          mes: number
          proyecto_id: string
          sobrescribe: boolean
          updated_at: string
          valor: string
        }
        Insert: {
          cliente_id: string
          concepto: string
          created_at?: string
          id?: string
          mes: number
          proyecto_id: string
          sobrescribe?: boolean
          updated_at?: string
          valor: string
        }
        Update: {
          cliente_id?: string
          concepto?: string
          created_at?: string
          id?: string
          mes?: number
          proyecto_id?: string
          sobrescribe?: boolean
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      cronograma_vinculos_parametrico: {
        Row: {
          cliente_id: string
          created_at: string | null
          cronograma_line_id: string
          id: string
          last_synced_at: string | null
          last_synced_total: number | null
          mayor_id: string
          override_importe: boolean | null
          proyecto_id: string
          source: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          cronograma_line_id: string
          id?: string
          last_synced_at?: string | null
          last_synced_total?: number | null
          mayor_id: string
          override_importe?: boolean | null
          proyecto_id: string
          source?: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          cronograma_line_id?: string
          id?: string
          last_synced_at?: string | null
          last_synced_total?: number | null
          mayor_id?: string
          override_importe?: boolean | null
          proyecto_id?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_vinculos_parametrico_cronograma_line_id_fkey"
            columns: ["cronograma_line_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_line"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_vinculos_parametrico_cronograma_line_id_fkey"
            columns: ["cronograma_line_id"]
            isOneToOne: false
            referencedRelation: "v_planning_gantt_for_construction"
            referencedColumns: ["source_activity_id"]
          },
          {
            foreignKeyName: "cronograma_vinculos_parametrico_mayor_id_fkey"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
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
            foreignKeyName: "design_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
          {
            foreignKeyName: "design_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "design_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
          design_phase: string | null
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
          design_phase?: string | null
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
          design_phase?: string | null
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
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
      event_alerts: {
        Row: {
          alert_type: string
          alert_value: number
          channel: string | null
          created_at: string
          due_at: string | null
          error: string | null
          event_id: string
          id: string
          is_triggered: boolean | null
          sent_at: string | null
          sound_enabled: boolean | null
          sound_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          alert_value: number
          channel?: string | null
          created_at?: string
          due_at?: string | null
          error?: string | null
          event_id: string
          id?: string
          is_triggered?: boolean | null
          sent_at?: string | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          alert_value?: number
          channel?: string | null
          created_at?: string
          due_at?: string | null
          error?: string | null
          event_id?: string
          id?: string
          is_triggered?: boolean | null
          sent_at?: string | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "personal_calendar_events"
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
          expense_date: string
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
          expense_date?: string
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
          expense_date?: string
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
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
      external_team_members: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          position: string | null
          project_id: string
          responsibilities: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          position?: string | null
          project_id: string
          responsibilities?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          position?: string | null
          project_id?: string
          responsibilities?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_team_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "external_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
      gantt_activity_log: {
        Row: {
          avance_real_pct: number | null
          causa_retraso: string | null
          created_at: string
          end_real: string | null
          estado: string
          id: string
          nota: string | null
          project_id: string
          source_activity_id: string
          start_real: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          avance_real_pct?: number | null
          causa_retraso?: string | null
          created_at?: string
          end_real?: string | null
          estado: string
          id?: string
          nota?: string | null
          project_id: string
          source_activity_id: string
          start_real?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          avance_real_pct?: number | null
          causa_retraso?: string | null
          created_at?: string
          end_real?: string | null
          estado?: string
          id?: string
          nota?: string | null
          project_id?: string
          source_activity_id?: string
          start_real?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gantt_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "gantt_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      general_ledger_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          created_by: string
          departamentos_inserted: number
          duration_seconds: number | null
          error_categories: Json
          error_summary: Json
          file_name: string
          file_size: number
          id: string
          import_type: string
          mayores_inserted: number
          partidas_inserted: number
          processed_sheets: string[] | null
          sheet_summaries: Json
          status: string
          subpartidas_inserted: number
          total_rows_failed: number
          total_rows_processed: number
          total_rows_successful: number
          updated_at: string
          validation_warnings: string[] | null
        }
        Insert: {
          created_at?: string
          created_by: string
          departamentos_inserted?: number
          duration_seconds?: number | null
          error_categories?: Json
          error_summary?: Json
          file_name: string
          file_size: number
          id?: string
          import_type: string
          mayores_inserted?: number
          partidas_inserted?: number
          processed_sheets?: string[] | null
          sheet_summaries?: Json
          status?: string
          subpartidas_inserted?: number
          total_rows_failed?: number
          total_rows_processed?: number
          total_rows_successful?: number
          updated_at?: string
          validation_warnings?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string
          departamentos_inserted?: number
          duration_seconds?: number | null
          error_categories?: Json
          error_summary?: Json
          file_name?: string
          file_size?: number
          id?: string
          import_type?: string
          mayores_inserted?: number
          partidas_inserted?: number
          processed_sheets?: string[] | null
          sheet_summaries?: Json
          status?: string
          subpartidas_inserted?: number
          total_rows_failed?: number
          total_rows_processed?: number
          total_rows_successful?: number
          updated_at?: string
          validation_warnings?: string[] | null
        }
        Relationships: []
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
      material_dropdown_options: {
        Row: {
          created_at: string
          created_by: string
          dropdown_type: string
          id: string
          is_active: boolean
          option_label: string
          option_value: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dropdown_type: string
          id?: string
          is_active?: boolean
          option_label: string
          option_value: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dropdown_type?: string
          id?: string
          is_active?: boolean
          option_label?: string
          option_value?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      material_finance_requests: {
        Row: {
          attended_by: string | null
          attended_date: string | null
          client_id: string
          created_at: string
          exported_to_treasury: boolean | null
          id: string
          is_attended: boolean | null
          material_name: string | null
          material_requirement_id: string
          notes: string | null
          payment_reference: string | null
          project_id: string
          purchase_order_number: string | null
          quantity: number | null
          request_date: string
          requested_by: string
          selected_for_payment: boolean | null
          status: string
          supplier_id: string | null
          treasury_export_date: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          attended_by?: string | null
          attended_date?: string | null
          client_id: string
          created_at?: string
          exported_to_treasury?: boolean | null
          id?: string
          is_attended?: boolean | null
          material_name?: string | null
          material_requirement_id: string
          notes?: string | null
          payment_reference?: string | null
          project_id: string
          purchase_order_number?: string | null
          quantity?: number | null
          request_date?: string
          requested_by: string
          selected_for_payment?: boolean | null
          status?: string
          supplier_id?: string | null
          treasury_export_date?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          attended_by?: string | null
          attended_date?: string | null
          client_id?: string
          created_at?: string
          exported_to_treasury?: boolean | null
          id?: string
          is_attended?: boolean | null
          material_name?: string | null
          material_requirement_id?: string
          notes?: string | null
          payment_reference?: string | null
          project_id?: string
          purchase_order_number?: string | null
          quantity?: number | null
          request_date?: string
          requested_by?: string
          selected_for_payment?: boolean | null
          status?: string
          supplier_id?: string | null
          treasury_export_date?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      material_requirements: {
        Row: {
          adjustment_additive: number | null
          adjustment_deductive: number | null
          brand: string | null
          budget_item_id: string | null
          certifications: Json | null
          created_at: string
          created_by: string
          cuenta_mayor: string | null
          delivery_date_actual: string | null
          delivery_date_required: string | null
          descripcion_producto: string | null
          environmental_impact: Json | null
          id: string
          is_delivered: boolean | null
          material_code: string | null
          material_name: string
          material_type: string
          model: string | null
          notas_procuracion: string | null
          notes: string | null
          partida: string | null
          phase_id: string | null
          priority: string | null
          project_id: string
          purchase_order_number: string | null
          quality_standards: Json | null
          quantity_delivered: number | null
          quantity_ordered: number | null
          quantity_remaining: number | null
          quantity_required: number
          quantity_used: number | null
          quantity_wasted: number | null
          requisito_almacenamiento: string | null
          specifications: Json | null
          status: string | null
          storage_location: string | null
          storage_requirements: Json | null
          sub_partida: number | null
          supplier_id: string | null
          sustainability_rating: number | null
          total_cost: number | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string
          warranty_period: number | null
          warranty_terms: string | null
        }
        Insert: {
          adjustment_additive?: number | null
          adjustment_deductive?: number | null
          brand?: string | null
          budget_item_id?: string | null
          certifications?: Json | null
          created_at?: string
          created_by: string
          cuenta_mayor?: string | null
          delivery_date_actual?: string | null
          delivery_date_required?: string | null
          descripcion_producto?: string | null
          environmental_impact?: Json | null
          id?: string
          is_delivered?: boolean | null
          material_code?: string | null
          material_name: string
          material_type: string
          model?: string | null
          notas_procuracion?: string | null
          notes?: string | null
          partida?: string | null
          phase_id?: string | null
          priority?: string | null
          project_id: string
          purchase_order_number?: string | null
          quality_standards?: Json | null
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          quantity_remaining?: number | null
          quantity_required?: number
          quantity_used?: number | null
          quantity_wasted?: number | null
          requisito_almacenamiento?: string | null
          specifications?: Json | null
          status?: string | null
          storage_location?: string | null
          storage_requirements?: Json | null
          sub_partida?: number | null
          supplier_id?: string | null
          sustainability_rating?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_of_measure: string
          updated_at?: string
          warranty_period?: number | null
          warranty_terms?: string | null
        }
        Update: {
          adjustment_additive?: number | null
          adjustment_deductive?: number | null
          brand?: string | null
          budget_item_id?: string | null
          certifications?: Json | null
          created_at?: string
          created_by?: string
          cuenta_mayor?: string | null
          delivery_date_actual?: string | null
          delivery_date_required?: string | null
          descripcion_producto?: string | null
          environmental_impact?: Json | null
          id?: string
          is_delivered?: boolean | null
          material_code?: string | null
          material_name?: string
          material_type?: string
          model?: string | null
          notas_procuracion?: string | null
          notes?: string | null
          partida?: string | null
          phase_id?: string | null
          priority?: string | null
          project_id?: string
          purchase_order_number?: string | null
          quality_standards?: Json | null
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          quantity_remaining?: number | null
          quantity_required?: number
          quantity_used?: number | null
          quantity_wasted?: number | null
          requisito_almacenamiento?: string | null
          specifications?: Json | null
          status?: string | null
          storage_location?: string | null
          storage_requirements?: Json | null
          sub_partida?: number | null
          supplier_id?: string | null
          sustainability_rating?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
          warranty_period?: number | null
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requirements_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requirements_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "material_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requirements_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_explanations: {
        Row: {
          created_at: string
          description: string
          id: string
          order_index: number
          plan_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_index?: number
          plan_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          plan_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_explanations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_plan"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "module_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_featured_images: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          month: number
          title: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          month: number
          title?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          month?: number
          title?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_featured_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_manuals: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_manuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          client_id: string | null
          complement_uuid: string
          created_at: string
          fecha_pago: string
          file_path: string
          forma_pago: string
          id: string
          moneda: string | null
          monto_pago: number
          project_id: string | null
          received_date: string | null
          status: string | null
          updated_at: string
          xml_content: string
        }
        Insert: {
          cfdi_document_id: string
          client_id?: string | null
          complement_uuid: string
          created_at?: string
          fecha_pago: string
          file_path: string
          forma_pago: string
          id?: string
          moneda?: string | null
          monto_pago: number
          project_id?: string | null
          received_date?: string | null
          status?: string | null
          updated_at?: string
          xml_content: string
        }
        Update: {
          cfdi_document_id?: string
          client_id?: string | null
          complement_uuid?: string
          created_at?: string
          fecha_pago?: string
          file_path?: string
          forma_pago?: string
          id?: string
          moneda?: string | null
          monto_pago?: number
          project_id?: string | null
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
          {
            foreignKeyName: "payment_complements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_complements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_complements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_complements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "payment_complements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
          description: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_by: string | null
          paid_date: string | null
          payment_plan_id: string
          payment_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_by?: string | null
          paid_date?: string | null
          payment_plan_id: string
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_by?: string | null
          paid_date?: string | null
          payment_plan_id?: string
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          approved_at: string | null
          approved_by: string | null
          client_project_id: string
          created_at: string
          created_by: string
          id: string
          is_current_plan: boolean
          notes: string | null
          plan_name: string
          plan_sequence: number
          plan_type: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_project_id: string
          created_at?: string
          created_by: string
          id?: string
          is_current_plan?: boolean
          notes?: string | null
          plan_name: string
          plan_sequence?: number
          plan_type: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_project_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_current_plan?: boolean
          notes?: string | null
          plan_name?: string
          plan_sequence?: number
          plan_type?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "payment_plans_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          location: string | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          location?: string | null
          start_date: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_audit_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_audit_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_budget_snapshots: {
        Row: {
          budget_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          settings: Json | null
          snapshot_data: Json
          snapshot_date: string
          totals: Json
          version_number: number
          version_type: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          settings?: Json | null
          snapshot_data: Json
          snapshot_date?: string
          totals: Json
          version_number: number
          version_type?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          settings?: Json | null
          snapshot_data?: Json
          snapshot_date?: string
          totals?: Json
          version_number?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_budget_snapshots_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "planning_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_budgets: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          id: string
          name: string
          project_id: string | null
          settings: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          id?: string
          name: string
          project_id?: string | null
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          name?: string
          project_id?: string | null
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_concepto_attachments: {
        Row: {
          concepto_id: string
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          concepto_id: string
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          concepto_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_concepto_attachments_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "planning_conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_concepto_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_concepto_tu_links: {
        Row: {
          concepto_id: string
          created_at: string
          created_by: string
          id: string
          quantity: number
          total: number
          tu_tx_id: string
        }
        Insert: {
          concepto_id: string
          created_at?: string
          created_by: string
          id?: string
          quantity?: number
          total?: number
          tu_tx_id: string
        }
        Update: {
          concepto_id?: string
          created_at?: string
          created_by?: string
          id?: string
          quantity?: number
          total?: number
          tu_tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_concepto_tu_links_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "planning_conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_concepto_tu_links_tu_tx_id_fkey"
            columns: ["tu_tx_id"]
            isOneToOne: false
            referencedRelation: "unified_financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_conceptos: {
        Row: {
          active: boolean
          cantidad: number | null
          cantidad_real: number | null
          change_reason: string | null
          code: string | null
          created_at: string
          desperdicio_pct: number | null
          honorarios_pct: number | null
          id: string
          is_postventa: boolean
          long_description: string | null
          notas_md: string | null
          order_index: number
          partida_id: string
          precio_real: number | null
          props: Json | null
          provider: string | null
          provider_id: string | null
          provider_notes: string | null
          pu: number | null
          short_description: string
          sumable: boolean
          total: number | null
          total_real: number | null
          unit: string
          updated_at: string
          wbs_code: string | null
        }
        Insert: {
          active?: boolean
          cantidad?: number | null
          cantidad_real?: number | null
          change_reason?: string | null
          code?: string | null
          created_at?: string
          desperdicio_pct?: number | null
          honorarios_pct?: number | null
          id?: string
          is_postventa?: boolean
          long_description?: string | null
          notas_md?: string | null
          order_index?: number
          partida_id: string
          precio_real?: number | null
          props?: Json | null
          provider?: string | null
          provider_id?: string | null
          provider_notes?: string | null
          pu?: number | null
          short_description: string
          sumable?: boolean
          total?: number | null
          total_real?: number | null
          unit: string
          updated_at?: string
          wbs_code?: string | null
        }
        Update: {
          active?: boolean
          cantidad?: number | null
          cantidad_real?: number | null
          change_reason?: string | null
          code?: string | null
          created_at?: string
          desperdicio_pct?: number | null
          honorarios_pct?: number | null
          id?: string
          is_postventa?: boolean
          long_description?: string | null
          notas_md?: string | null
          order_index?: number
          partida_id?: string
          precio_real?: number | null
          props?: Json | null
          provider?: string | null
          provider_id?: string | null
          provider_notes?: string | null
          pu?: number | null
          short_description?: string
          sumable?: boolean
          total?: number | null
          total_real?: number | null
          unit?: string
          updated_at?: string
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_conceptos_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "planning_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_conceptos_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_partidas: {
        Row: {
          active: boolean
          budget_id: string
          created_at: string
          desperdicio_pct_override: number | null
          honorarios_pct_override: number | null
          id: string
          name: string
          notes: string | null
          order_index: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          budget_id: string
          created_at?: string
          desperdicio_pct_override?: number | null
          honorarios_pct_override?: number | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          budget_id?: string
          created_at?: string
          desperdicio_pct_override?: number | null
          honorarios_pct_override?: number | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_partidas_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "planning_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_price_observations: {
        Row: {
          budget_id: string | null
          concepto_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          date: string
          exchange_rate: number | null
          id: string
          metadata: Json | null
          observation_date: string | null
          project_id: string | null
          props: Json | null
          provider: string | null
          pu: number
          pu_mxn: number
          region: string | null
          source: string
          unit: string
          version_number: number | null
          wbs_code: string | null
        }
        Insert: {
          budget_id?: string | null
          concepto_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json | null
          observation_date?: string | null
          project_id?: string | null
          props?: Json | null
          provider?: string | null
          pu: number
          pu_mxn: number
          region?: string | null
          source: string
          unit: string
          version_number?: number | null
          wbs_code?: string | null
        }
        Update: {
          budget_id?: string | null
          concepto_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json | null
          observation_date?: string | null
          project_id?: string | null
          props?: Json | null
          provider?: string | null
          pu?: number
          pu_mxn?: number
          region?: string | null
          source?: string
          unit?: string
          version_number?: number | null
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_price_observations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "planning_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_price_observations_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "planning_conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_price_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_price_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "planning_price_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_price_observations_wbs_code_fkey"
            columns: ["wbs_code"]
            isOneToOne: false
            referencedRelation: "planning_wbs_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      planning_template_conceptos: {
        Row: {
          code: string | null
          created_at: string
          default_values: Json | null
          id: string
          long_description: string | null
          order_index: number
          provider: string | null
          short_description: string
          sumable: boolean | null
          template_partida_id: string
          unit: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          default_values?: Json | null
          id?: string
          long_description?: string | null
          order_index: number
          provider?: string | null
          short_description: string
          sumable?: boolean | null
          template_partida_id: string
          unit: string
        }
        Update: {
          code?: string | null
          created_at?: string
          default_values?: Json | null
          id?: string
          long_description?: string | null
          order_index?: number
          provider?: string | null
          short_description?: string
          sumable?: boolean | null
          template_partida_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_template_conceptos_template_partida_id_fkey"
            columns: ["template_partida_id"]
            isOneToOne: false
            referencedRelation: "planning_template_partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_template_fields: {
        Row: {
          created_at: string
          default_value: string | null
          formula: string | null
          helptext: string | null
          id: string
          key: string
          label: string
          role: string
          template_id: string
          type: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          formula?: string | null
          helptext?: string | null
          id?: string
          key: string
          label: string
          role: string
          template_id: string
          type: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          default_value?: string | null
          formula?: string | null
          helptext?: string | null
          id?: string
          key?: string
          label?: string
          role?: string
          template_id?: string
          type?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "planning_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "planning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_template_partidas: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          order_index: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_template_partidas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "planning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_template_tests: {
        Row: {
          created_at: string
          expected_grand_total: number
          expected_outputs: Json | null
          id: string
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          template_id: string
          test_inputs: Json
          test_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_grand_total: number
          expected_outputs?: Json | null
          id?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          template_id: string
          test_inputs: Json
          test_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_grand_total?: number
          expected_outputs?: Json | null
          id?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          template_id?: string
          test_inputs?: Json
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_template_tests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "planning_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_templates: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          name: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          name: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          name?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      planning_tu_mapping: {
        Row: {
          budget_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          partida_id: string
          tu_departamento: string | null
          tu_mayor_id: string | null
          tu_partida_id: string | null
          tu_subpartida_id: string | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          partida_id: string
          tu_departamento?: string | null
          tu_mayor_id?: string | null
          tu_partida_id?: string | null
          tu_subpartida_id?: string | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          partida_id?: string
          tu_departamento?: string | null
          tu_mayor_id?: string | null
          tu_partida_id?: string | null
          tu_subpartida_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_tu_mapping_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "planning_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tu_mapping_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "planning_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tu_mapping_tu_mayor_id_fkey"
            columns: ["tu_mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tu_mapping_tu_partida_id_fkey"
            columns: ["tu_partida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tu_mapping_tu_subpartida_id_fkey"
            columns: ["tu_subpartida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_subpartidas"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_v2_audit_log: {
        Row: {
          action: string
          budget_id: string | null
          change_reason: string | null
          changed_at: string
          changed_by: string
          field_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          budget_id?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          budget_id?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_v2_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_v2_events: {
        Row: {
          budget_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          payload: Json
          snapshot_id: string | null
          triggered_at: string
          triggered_by: string
          webhooks_failed: number | null
          webhooks_sent: number | null
        }
        Insert: {
          budget_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          payload: Json
          snapshot_id?: string | null
          triggered_at?: string
          triggered_by: string
          webhooks_failed?: number | null
          webhooks_sent?: number | null
        }
        Update: {
          budget_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          payload?: Json
          snapshot_id?: string | null
          triggered_at?: string
          triggered_by?: string
          webhooks_failed?: number | null
          webhooks_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_v2_events_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "planning_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_v2_events_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "planning_budget_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_v2_events_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_v2_user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["planning_v2_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["planning_v2_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["planning_v2_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_v2_user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_v2_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_v2_user_settings: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visible_columns: Json
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visible_columns?: Json
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visible_columns?: Json
        }
        Relationships: []
      }
      planning_v2_webhooks: {
        Row: {
          created_at: string
          created_by: string
          events: string[]
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metadata: Json | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          events: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          events?: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_v2_webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_wbs_codes: {
        Row: {
          code: string
          created_at: string
          departamento: string | null
          description: string | null
          mayor: string | null
          partida: string | null
          subpartida: string | null
        }
        Insert: {
          code: string
          created_at?: string
          departamento?: string | null
          description?: string | null
          mayor?: string | null
          partida?: string | null
          subpartida?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          departamento?: string | null
          description?: string | null
          mayor?: string | null
          partida?: string | null
          subpartida?: string | null
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
      presupuesto_ejecutivo: {
        Row: {
          cantidad: number
          cliente_id: string
          created_at: string
          created_by: string
          departamento: string
          id: string
          importe: number
          mayor_id: string
          partida_id: string
          precio_unitario: number
          presupuesto_parametrico_id: string
          proyecto_id: string
          subpartida_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          cliente_id: string
          created_at?: string
          created_by: string
          departamento?: string
          id?: string
          importe?: number
          mayor_id: string
          partida_id: string
          precio_unitario?: number
          presupuesto_parametrico_id: string
          proyecto_id: string
          subpartida_id: string
          unidad: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cliente_id?: string
          created_at?: string
          created_by?: string
          departamento?: string
          id?: string
          importe?: number
          mayor_id?: string
          partida_id?: string
          precio_unitario?: number
          presupuesto_parametrico_id?: string
          proyecto_id?: string
          subpartida_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_mayor"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_parametrico"
            columns: ["presupuesto_parametrico_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_parametrico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_partida"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_ejecutivo_subpartida"
            columns: ["subpartida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_subpartidas"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_ejecutivo_partida: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string
          id: string
          importe_ejecutivo: number
          parametrico_id: string
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by: string
          id?: string
          importe_ejecutivo?: number
          parametrico_id: string
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string
          id?: string
          importe_ejecutivo?: number
          parametrico_id?: string
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_ejecutivo_partida_parametrico_id_fkey"
            columns: ["parametrico_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_parametrico"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_ejecutivo_subpartida: {
        Row: {
          cantidad: number
          cliente_id: string
          codigo_snapshot: string | null
          created_at: string
          created_by: string
          id: string
          importe: number
          nombre_snapshot: string
          partida_ejecutivo_id: string
          precio_unitario: number
          proyecto_id: string
          subpartida_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          cliente_id: string
          codigo_snapshot?: string | null
          created_at?: string
          created_by: string
          id?: string
          importe: number
          nombre_snapshot: string
          partida_ejecutivo_id: string
          precio_unitario: number
          proyecto_id: string
          subpartida_id: string
          unidad: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cliente_id?: string
          codigo_snapshot?: string | null
          created_at?: string
          created_by?: string
          id?: string
          importe?: number
          nombre_snapshot?: string
          partida_ejecutivo_id?: string
          precio_unitario?: number
          proyecto_id?: string
          subpartida_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_ejecutivo_subpartida_partida_ejecutivo_id_fkey"
            columns: ["partida_ejecutivo_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_ejecutivo_partida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_ejecutivo_subpartida_subpartida_id_fkey"
            columns: ["subpartida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_subpartidas"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_parametrico: {
        Row: {
          cantidad_requerida: number
          cliente_id: string
          created_at: string
          created_by: string
          departamento: string
          id: string
          mayor_id: string
          monto_total: number
          orden: number | null
          partida_id: string
          precio_unitario: number
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          cantidad_requerida?: number
          cliente_id: string
          created_at?: string
          created_by: string
          departamento?: string
          id?: string
          mayor_id: string
          monto_total?: number
          orden?: number | null
          partida_id: string
          precio_unitario?: number
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          cantidad_requerida?: number
          cliente_id?: string
          created_at?: string
          created_by?: string
          departamento?: string
          id?: string
          mayor_id?: string
          monto_total?: number
          orden?: number | null
          partida_id?: string
          precio_unitario?: number
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_presupuesto_parametrico_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_mayor"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_partida"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_presupuesto_parametrico_proyecto"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
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
          birth_date: string | null
          created_at: string
          department: string | null
          department_enum: Database["public"]["Enums"]["department_type"] | null
          email: string
          full_name: string
          hire_date: string | null
          id: string
          immediate_supervisor_id: string | null
          phone: string | null
          position: string | null
          position_enum:
            | Database["public"]["Enums"]["position_hierarchy"]
            | null
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
          birth_date?: string | null
          created_at?: string
          department?: string | null
          department_enum?:
            | Database["public"]["Enums"]["department_type"]
            | null
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          immediate_supervisor_id?: string | null
          phone?: string | null
          position?: string | null
          position_enum?:
            | Database["public"]["Enums"]["position_hierarchy"]
            | null
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
          birth_date?: string | null
          created_at?: string
          department?: string | null
          department_enum?:
            | Database["public"]["Enums"]["department_type"]
            | null
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          immediate_supervisor_id?: string | null
          phone?: string | null
          position?: string | null
          position_enum?:
            | Database["public"]["Enums"]["position_hierarchy"]
            | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_immediate_supervisor_id_fkey"
            columns: ["immediate_supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "progress_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          camera_settings: Json | null
          coordinates: Json | null
          description: string | null
          equipment_id: string | null
          file_path: string | null
          geolocation: Json | null
          id: string
          inspection_id: string | null
          is_before_photo: boolean | null
          markup_data: Json | null
          milestone_id: string | null
          phase_id: string | null
          photo_type: string | null
          photo_url: string
          photographer_name: string | null
          project_id: string
          quality_rating: number | null
          tags: string[] | null
          taken_at: string
          taken_by: string
          taken_date: string | null
          technical_specifications: Json | null
          title: string | null
          uploaded_by_temp: string | null
          visibility: string | null
          weather_conditions: string | null
          work_report_id: string | null
        }
        Insert: {
          before_photo_id?: string | null
          camera_angle?: string | null
          camera_settings?: Json | null
          coordinates?: Json | null
          description?: string | null
          equipment_id?: string | null
          file_path?: string | null
          geolocation?: Json | null
          id?: string
          inspection_id?: string | null
          is_before_photo?: boolean | null
          markup_data?: Json | null
          milestone_id?: string | null
          phase_id?: string | null
          photo_type?: string | null
          photo_url: string
          photographer_name?: string | null
          project_id: string
          quality_rating?: number | null
          tags?: string[] | null
          taken_at?: string
          taken_by: string
          taken_date?: string | null
          technical_specifications?: Json | null
          title?: string | null
          uploaded_by_temp?: string | null
          visibility?: string | null
          weather_conditions?: string | null
          work_report_id?: string | null
        }
        Update: {
          before_photo_id?: string | null
          camera_angle?: string | null
          camera_settings?: Json | null
          coordinates?: Json | null
          description?: string | null
          equipment_id?: string | null
          file_path?: string | null
          geolocation?: Json | null
          id?: string
          inspection_id?: string | null
          is_before_photo?: boolean | null
          markup_data?: Json | null
          milestone_id?: string | null
          phase_id?: string | null
          photo_type?: string | null
          photo_url?: string
          photographer_name?: string | null
          project_id?: string
          quality_rating?: number | null
          tags?: string[] | null
          taken_at?: string
          taken_by?: string
          taken_date?: string | null
          technical_specifications?: Json | null
          title?: string | null
          uploaded_by_temp?: string | null
          visibility?: string | null
          weather_conditions?: string | null
          work_report_id?: string | null
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
            foreignKeyName: "progress_photos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "construction_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
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
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "progress_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_photos_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
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
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      project_chat: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          project_id: string
          sender_avatar: string | null
          sender_id: string
          sender_name: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          project_id: string
          sender_avatar?: string | null
          sender_id: string
          sender_name?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string
          sender_avatar?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_chat_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_project_chat_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_project_chat_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
            foreignKeyName: "project_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      quality_inspections: {
        Row: {
          actual_date: string | null
          approval_date: string | null
          approved_by: string | null
          budget_item_id: string | null
          certifications_issued: Json | null
          corrective_actions: Json | null
          cost: number | null
          created_at: string
          created_by: string
          deficiencies: Json | null
          documents: Json | null
          duration_hours: number | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          inspection_code: string | null
          inspection_criteria: Json
          inspection_name: string
          inspection_type: string
          inspector_certification: string | null
          inspector_name: string
          milestone_id: string | null
          overall_rating: number | null
          phase_id: string | null
          photos: Json | null
          project_id: string
          regulatory_compliance: Json | null
          remarks: string | null
          results: Json | null
          scheduled_date: string
          status: string | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          actual_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          budget_item_id?: string | null
          certifications_issued?: Json | null
          corrective_actions?: Json | null
          cost?: number | null
          created_at?: string
          created_by: string
          deficiencies?: Json | null
          documents?: Json | null
          duration_hours?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_code?: string | null
          inspection_criteria?: Json
          inspection_name: string
          inspection_type: string
          inspector_certification?: string | null
          inspector_name: string
          milestone_id?: string | null
          overall_rating?: number | null
          phase_id?: string | null
          photos?: Json | null
          project_id: string
          regulatory_compliance?: Json | null
          remarks?: string | null
          results?: Json | null
          scheduled_date: string
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          actual_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          budget_item_id?: string | null
          certifications_issued?: Json | null
          corrective_actions?: Json | null
          cost?: number | null
          created_at?: string
          created_by?: string
          deficiencies?: Json | null
          documents?: Json | null
          duration_hours?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_code?: string | null
          inspection_criteria?: Json
          inspection_name?: string
          inspection_type?: string
          inspector_certification?: string | null
          inspector_name?: string
          milestone_id?: string | null
          overall_rating?: number | null
          phase_id?: string | null
          photos?: Json | null
          project_id?: string
          regulatory_compliance?: Json | null
          remarks?: string | null
          results?: Json | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "quality_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "construction_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
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
          {
            foreignKeyName: "sales_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
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
      security_audit_log: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
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
          colonia: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string
          credit_limit: number | null
          current_balance: number | null
          dias_credito: number | null
          email: string | null
          estado_fiscal: string | null
          id: string
          limite_credito: number | null
          localidad: string | null
          municipio: string | null
          nombre_vialidad: string | null
          notes: string | null
          numero_exterior: string | null
          numero_interior: string | null
          ofrece_credito: boolean | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          razon_social: string | null
          regimen_fiscal: string | null
          rfc: string | null
          saldo_actual: number | null
          state: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_category: Database["public"]["Enums"]["supplier_category"]
          tax_id: string | null
          tipo_vialidad: string | null
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
          colonia?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          credit_limit?: number | null
          current_balance?: number | null
          dias_credito?: number | null
          email?: string | null
          estado_fiscal?: string | null
          id?: string
          limite_credito?: number | null
          localidad?: string | null
          municipio?: string | null
          nombre_vialidad?: string | null
          notes?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          ofrece_credito?: boolean | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_actual?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_category?: Database["public"]["Enums"]["supplier_category"]
          tax_id?: string | null
          tipo_vialidad?: string | null
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
          colonia?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          credit_limit?: number | null
          current_balance?: number | null
          dias_credito?: number | null
          email?: string | null
          estado_fiscal?: string | null
          id?: string
          limite_credito?: number | null
          localidad?: string | null
          municipio?: string | null
          nombre_vialidad?: string | null
          notes?: string | null
          numero_exterior?: string | null
          numero_interior?: string | null
          ofrece_credito?: boolean | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_actual?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_category?: Database["public"]["Enums"]["supplier_category"]
          tax_id?: string | null
          tipo_vialidad?: string | null
          updated_at?: string
          uso_cfdi_default?: string | null
          website?: string | null
        }
        Relationships: []
      }
      transaction_allocations: {
        Row: {
          allocated_amount: number
          allocated_quantity: number
          allocation_notes: string | null
          budget_item_id: string
          created_at: string
          created_by: string
          id: string
          unified_transaction_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          allocated_quantity?: number
          allocation_notes?: string | null
          budget_item_id: string
          created_at?: string
          created_by: string
          id?: string
          unified_transaction_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          allocated_quantity?: number
          allocation_notes?: string | null
          budget_item_id?: string
          created_at?: string
          created_by?: string
          id?: string
          unified_transaction_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_allocations_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "construction_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "v_construction_budget_rollup"
            referencedColumns: ["budget_item_id"]
          },
          {
            foreignKeyName: "transaction_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_unified_transaction_id_fkey"
            columns: ["unified_transaction_id"]
            isOneToOne: false
            referencedRelation: "unified_financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_material_payment_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          material_finance_request_id: string
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          material_finance_request_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          material_finance_request_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_material_payment_item_material_finance_request_id_fkey"
            columns: ["material_finance_request_id"]
            isOneToOne: false
            referencedRelation: "material_finance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_material_payment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "treasury_material_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_material_payments: {
        Row: {
          account_id: string | null
          account_type: string | null
          created_at: string
          created_by: string
          id: string
          material_count: number
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reference_code: string
          status: string
          supplier_id: string | null
          supplier_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_type?: string | null
          created_at?: string
          created_by: string
          id?: string
          material_count?: number
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_code: string
          status?: string
          supplier_id?: string | null
          supplier_name: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_type?: string | null
          created_at?: string
          created_by?: string
          id?: string
          material_count?: number
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference_code?: string
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_material_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_material_payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_material_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_payment_references: {
        Row: {
          account_id: string
          account_type: string
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          payment_date: string | null
          project_id: string | null
          reference_code: string
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          account_type: string
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          project_id?: string | null
          reference_code: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_type?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          project_id?: string | null
          reference_code?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_payment_references_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_payment_references_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_payment_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_payment_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "treasury_payment_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_transactions: {
        Row: {
          account_id: string
          account_type: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          comments: string | null
          cost_per_unit: number | null
          created_at: string
          created_by: string
          cuenta_mayor: string | null
          department: string | null
          description: string
          id: string
          invoice_number: string | null
          invoice_url: string | null
          material_payment_reference: string | null
          notes: string | null
          partida: string | null
          payment_reference_id: string | null
          project_id: string | null
          quantity: number | null
          reference_number: string | null
          requires_approval: boolean | null
          status: string
          sub_partida: string | null
          supplier_id: string | null
          transaction_date: string
          transaction_type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_type: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          comments?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by: string
          cuenta_mayor?: string | null
          department?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          material_payment_reference?: string | null
          notes?: string | null
          partida?: string | null
          payment_reference_id?: string | null
          project_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          requires_approval?: boolean | null
          status?: string
          sub_partida?: string | null
          supplier_id?: string | null
          transaction_date: string
          transaction_type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_type?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          comments?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string
          cuenta_mayor?: string | null
          department?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          material_payment_reference?: string | null
          notes?: string | null
          partida?: string | null
          payment_reference_id?: string | null
          project_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          requires_approval?: boolean | null
          status?: string
          sub_partida?: string | null
          supplier_id?: string | null
          transaction_date?: string
          transaction_type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_treasury_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fk_treasury_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treasury_supplier_id"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_financial_transactions: {
        Row: {
          cantidad_requerida: number
          cliente_proveedor_id: string | null
          created_at: string
          created_by: string
          departamento: string
          descripcion: string | null
          empresa_proyecto_id: string | null
          fecha: string
          folio_factura: string | null
          id: string
          mayor_id: string | null
          monto_total: number
          partida_id: string | null
          precio_unitario: number
          referencia_unica: string
          subpartida_id: string | null
          sucursal_id: string | null
          tiene_factura: boolean
          tipo_entidad: string | null
          tipo_movimiento: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad_requerida?: number
          cliente_proveedor_id?: string | null
          created_at?: string
          created_by: string
          departamento: string
          descripcion?: string | null
          empresa_proyecto_id?: string | null
          fecha?: string
          folio_factura?: string | null
          id?: string
          mayor_id?: string | null
          monto_total?: number
          partida_id?: string | null
          precio_unitario?: number
          referencia_unica: string
          subpartida_id?: string | null
          sucursal_id?: string | null
          tiene_factura?: boolean
          tipo_entidad?: string | null
          tipo_movimiento: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad_requerida?: number
          cliente_proveedor_id?: string | null
          created_at?: string
          created_by?: string
          departamento?: string
          descripcion?: string | null
          empresa_proyecto_id?: string | null
          fecha?: string
          folio_factura?: string | null
          id?: string
          mayor_id?: string | null
          monto_total?: number
          partida_id?: string | null
          precio_unitario?: number
          referencia_unica?: string
          subpartida_id?: string | null
          sucursal_id?: string | null
          tiene_factura?: boolean
          tipo_entidad?: string | null
          tipo_movimiento?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_financial_transactions_empresa_proyecto_id_fkey"
            columns: ["empresa_proyecto_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_empresa_proyecto_id_fkey"
            columns: ["empresa_proyecto_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_empresa_proyecto_id_fkey"
            columns: ["empresa_proyecto_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_mayor_id_fkey"
            columns: ["mayor_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_mayor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_subpartida_id_fkey"
            columns: ["subpartida_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts_subpartidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_financial_transactions_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "branch_offices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_assignments: {
        Row: {
          branch_office_id: string
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          branch_office_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          branch_office_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_assignments_branch_office_id_fkey"
            columns: ["branch_office_id"]
            isOneToOne: false
            referencedRelation: "branch_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      work_reports: {
        Row: {
          achievements: Json | null
          approval_date: string | null
          approved_by: string | null
          client_signature: string | null
          created_at: string
          created_by: string
          delays_encountered: Json | null
          deliveries_received: Json | null
          equipment_used: Json | null
          humidity_percentage: number | null
          id: string
          inspections_conducted: Json | null
          materials_consumed: Json | null
          overall_progress_notes: string | null
          personnel_present: Json | null
          photos: Json | null
          planned_next_day: Json | null
          productivity_rating: number | null
          project_id: string
          quality_compliance_rating: number | null
          quality_issues: Json | null
          report_date: string
          safety_compliance_rating: number | null
          safety_incidents: Json | null
          shift: string | null
          supervisor_signature: string | null
          temperature_celsius: number | null
          updated_at: string
          visitors: Json | null
          weather_conditions: string | null
          wind_conditions: string | null
          work_performed: Json
        }
        Insert: {
          achievements?: Json | null
          approval_date?: string | null
          approved_by?: string | null
          client_signature?: string | null
          created_at?: string
          created_by: string
          delays_encountered?: Json | null
          deliveries_received?: Json | null
          equipment_used?: Json | null
          humidity_percentage?: number | null
          id?: string
          inspections_conducted?: Json | null
          materials_consumed?: Json | null
          overall_progress_notes?: string | null
          personnel_present?: Json | null
          photos?: Json | null
          planned_next_day?: Json | null
          productivity_rating?: number | null
          project_id: string
          quality_compliance_rating?: number | null
          quality_issues?: Json | null
          report_date?: string
          safety_compliance_rating?: number | null
          safety_incidents?: Json | null
          shift?: string | null
          supervisor_signature?: string | null
          temperature_celsius?: number | null
          updated_at?: string
          visitors?: Json | null
          weather_conditions?: string | null
          wind_conditions?: string | null
          work_performed?: Json
        }
        Update: {
          achievements?: Json | null
          approval_date?: string | null
          approved_by?: string | null
          client_signature?: string | null
          created_at?: string
          created_by?: string
          delays_encountered?: Json | null
          deliveries_received?: Json | null
          equipment_used?: Json | null
          humidity_percentage?: number | null
          id?: string
          inspections_conducted?: Json | null
          materials_consumed?: Json | null
          overall_progress_notes?: string | null
          personnel_present?: Json | null
          photos?: Json | null
          planned_next_day?: Json | null
          productivity_rating?: number | null
          project_id?: string
          quality_compliance_rating?: number | null
          quality_issues?: Json | null
          report_date?: string
          safety_compliance_rating?: number | null
          safety_incidents?: Json | null
          shift?: string | null
          supervisor_signature?: string | null
          temperature_celsius?: number | null
          updated_at?: string
          visitors?: Json | null
          weather_conditions?: string | null
          wind_conditions?: string | null
          work_performed?: Json
        }
        Relationships: [
          {
            foreignKeyName: "work_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      financial_summary_by_client_project: {
        Row: {
          client_id: string | null
          client_name: string | null
          construction_budget: number | null
          estimated_budget: number | null
          net_profit: number | null
          profit_margin: number | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          sales_pipeline_stage: string | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_v2_clients_ro: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      planning_v2_projects_ro: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["client_status"] | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_clients_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      v_construction_budget_rollup: {
        Row: {
          budget_item_id: string | null
          cantidad_base: number | null
          completion_percentage: number | null
          comprado_qty: number | null
          comprado_total: number | null
          created_at: string | null
          current_eac_method: string | null
          eac_total: number | null
          eac_unit_price: number | null
          is_baseline_locked: boolean | null
          item_name: string | null
          manual_eac_price: number | null
          mayor: string | null
          partida: string | null
          precio_base: number | null
          precio_prom_ponderado: number | null
          project_id: string | null
          saldo_qty: number | null
          source_budget_item_id: string | null
          subpartida: string | null
          supply_status: string | null
          total_base: number | null
          unidad: string | null
          updated_at: string | null
          variacion_pct: number | null
          variacion_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_summary_by_client_project"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_v2_projects_ro"
            referencedColumns: ["id"]
          },
        ]
      }
      v_planning_gantt_for_construction: {
        Row: {
          amount: number | null
          duration_days_plan: number | null
          end_date_plan: string | null
          end_month: string | null
          end_week: number | null
          is_discount: boolean | null
          mayor_codigo: string | null
          mayor_id: string | null
          mayor_nombre: string | null
          nombre_actividad: string | null
          order_index: number | null
          plan_id: string | null
          project_id: string | null
          source_activity_id: string | null
          start_date_plan: string | null
          start_month: string | null
          start_week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_gantt_line_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cronograma_gantt_plan"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analyze_import_quality: {
        Args: { history_id: string }
        Returns: Json
      }
      bulk_delete_unified_transactions: {
        Args: { transaction_ids: string[] }
        Returns: Json
      }
      calculate_complement_due_date: {
        Args: { payment_date: string }
        Returns: string
      }
      categorize_import_errors: {
        Args: { errors: string[] }
        Returns: Json
      }
      cleanup_deprecated_client_documents: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      client_has_project_access: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      client_has_project_access_by_profile_id: {
        Args: { profile_id_param: string; project_id_param: string }
        Returns: boolean
      }
      create_default_design_phases: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      delete_client_cascade: {
        Args: { client_id_param: string }
        Returns: undefined
      }
      delete_project_cascade: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      employee_has_project_access: {
        Args:
          | { profile_id_param: string; project_id_param: string }
          | { project_id_param: string }
        Returns: boolean
      }
      ensure_department_exists: {
        Args: { dept_name: string }
        Returns: string
      }
      fix_budget_discrepancies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_material_payment_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_payment_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unified_transaction_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_financial_summary_by_client: {
        Args: { client_filter?: string }
        Returns: {
          active_projects: number
          client_id: string
          client_name: string
          net_profit: number
          profit_margin: number
          total_expenses: number
          total_income: number
          total_projects: number
        }[]
      }
      get_financial_summary_by_client_project: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_id: string
          client_name: string
          construction_budget: number
          estimated_budget: number
          net_profit: number
          profit_margin: number
          project_id: string
          project_name: string
          project_status: string
          sales_pipeline_stage: string
          total_expenses: number
          total_income: number
        }[]
      }
      get_migration_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          details: string
          metric: string
        }[]
      }
      get_next_parametrico_order: {
        Args: { cliente_id_param: string; proyecto_id_param: string }
        Returns: number
      }
      get_parametric_budget_totals: {
        Args: { cliente_id_param: string; proyecto_id_param: string }
        Returns: {
          cliente_id: string
          mayor_codigo: string
          mayor_id: string
          mayor_nombre: string
          orden_minimo: number
          proyecto_id: string
          total_mayor: number
        }[]
      }
      get_profitability_analysis: {
        Args: {
          analysis_type?: string
          limit_results?: number
          period_end?: string
          period_start?: string
        }
        Returns: {
          additional_data: Json
          costs: number
          gross_margin: number
          gross_profit: number
          id: string
          name: string
          revenue: number
          transaction_count: number
        }[]
      }
      get_project_cumulative_documents: {
        Args:
          | { project_id_param: string }
          | { project_id_param: string; user_department?: string }
        Returns: {
          created_at: string
          department: string
          description: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          name: string
          uploaded_by: string
          uploader_name: string
        }[]
      }
      get_project_team_members: {
        Args: { project_id_param: string }
        Returns: {
          department: string
          email: string
          full_name: string
          profile_id: string
          user_id: string
          user_position: string
          user_role: string
        }[]
      }
      get_unified_project_documents: {
        Args: { project_id_param: string }
        Returns: {
          category_name: string
          client_id: string
          created_at: string
          department: string
          description: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          phase_name: string
          project_id: string
          uploaded_by: string
          uploader_name: string
        }[]
      }
      get_upcoming_alerts: {
        Args: { user_uuid: string }
        Returns: {
          alert_id: string
          alert_type: string
          alert_value: number
          event_id: string
          event_start_date: string
          event_title: string
          sound_enabled: boolean
          sound_type: string
        }[]
      }
      get_upcoming_client_project_alerts: {
        Args: { user_uuid: string }
        Returns: {
          alert_id: string
          alert_type: string
          alert_value: number
          client_name: string
          event_id: string
          event_start_date: string
          event_title: string
          project_id: string
          project_name: string
          sound_enabled: boolean
          sound_type: string
        }[]
      }
      get_user_branch_offices: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { user_uuid?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_by_department: {
        Args: { department_param: string }
        Returns: {
          department: string
          email: string
          full_name: string
          profile_id: string
          user_id: string
          user_position: string
          user_role: string
        }[]
      }
      get_users_by_position: {
        Args: { position_param: string }
        Returns: {
          department: string
          email: string
          full_name: string
          profile_id: string
          user_id: string
          user_position: string
          user_role: string
        }[]
      }
      has_module_permission: {
        Args:
          | {
              _module: Database["public"]["Enums"]["module_name"]
              _permission: string
              _user_id: string
            }
          | { _module: string; _user_id: string }
        Returns: boolean
      }
      has_planning_v2_role: {
        Args: {
          _role: Database["public"]["Enums"]["planning_v2_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_default_budget_items: {
        Args: { budget_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      log_planning_v2_change: {
        Args: {
          p_action: string
          p_budget_id?: string
          p_change_reason?: string
          p_field_name: string
          p_new_value: string
          p_old_value: string
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
      log_security_event: {
        Args:
          | { event_data?: Json; event_type: string }
          | { p_event_data?: Json; p_event_type: string; p_user_id?: string }
        Returns: undefined
      }
      mask_sensitive_data: {
        Args: { data_type?: string; data_value: string }
        Returns: string
      }
      migrate_design_budget_to_construction: {
        Args: { p_project_id: string }
        Returns: Json
      }
      planning_v2_bulk_import: {
        Args: { _budget_id: string; _conceptos: Json; _partida_name: string }
        Returns: Json
      }
      planning_v2_delete_budget: {
        Args: { p_budget_id: string }
        Returns: undefined
      }
      recalc_pep_total: {
        Args: { pep_id: string }
        Returns: undefined
      }
      refresh_financial_summary: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      safe_delete_chart_account: {
        Args: { record_id: string; table_name: string }
        Returns: Json
      }
      safe_mass_delete_chart_accounts: {
        Args: { record_ids: string[]; table_name: string }
        Returns: Json
      }
      sync_construction_budget_snapshot: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      test_chat_access: {
        Args: { test_project_id: string }
        Returns: {
          can_send_message: boolean
          can_view_chat: boolean
          profile_id: string
          user_role: string
        }[]
      }
      trigger_planning_v2_event: {
        Args: {
          p_budget_id: string
          p_event_type: string
          p_payload: Json
          p_snapshot_id: string
        }
        Returns: string
      }
      update_design_phase_days_elapsed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_approval_secure: {
        Args: { _approval_status: string; _user_id: string }
        Returns: undefined
      }
      update_user_role_secure: {
        Args: {
          _new_role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: undefined
      }
      user_can_access_project: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      validate_bulk_delete_permissions: {
        Args: { record_ids: string[]; table_name: string }
        Returns: boolean
      }
      validate_departamento: {
        Args: { departamento_value: string }
        Returns: boolean
      }
      validate_import_departments: {
        Args: { departments: string[] }
        Returns: Json
      }
      validate_mayor: {
        Args: { mayor_id_value: string }
        Returns: boolean
      }
      validate_partida: {
        Args: { partida_id_value: string }
        Returns: boolean
      }
      validate_subpartida: {
        Args: { subpartida_id_value: string }
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
      department_type:
        | "ventas"
        | "diseño"
        | "construcción"
        | "finanzas"
        | "contabilidad"
        | "general"
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
      plan_type: "sales_to_design" | "design_to_construction"
      planning_v2_role: "viewer" | "editor" | "publisher"
      position_hierarchy:
        | "director"
        | "gerente"
        | "coordinador"
        | "supervisor"
        | "especialista"
        | "auxiliar"
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
      department_type: [
        "ventas",
        "diseño",
        "construcción",
        "finanzas",
        "contabilidad",
        "general",
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
      plan_type: ["sales_to_design", "design_to_construction"],
      planning_v2_role: ["viewer", "editor", "publisher"],
      position_hierarchy: [
        "director",
        "gerente",
        "coordinador",
        "supervisor",
        "especialista",
        "auxiliar",
      ],
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
