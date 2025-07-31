-- FASE 1: Crear tabla de proveedores
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'México',
  postal_code TEXT,
  tax_id TEXT,
  bank_account TEXT,
  bank_name TEXT,
  payment_terms INTEGER DEFAULT 30,
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  supplier_category supplier_category NOT NULL DEFAULT 'materials',
  status supplier_status NOT NULL DEFAULT 'active',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Crear tipos para proveedores
CREATE TYPE public.supplier_category AS ENUM (
  'materials',
  'equipment',
  'services',
  'subcontractor',
  'utilities',
  'other'
);

CREATE TYPE public.supplier_status AS ENUM (
  'active',
  'inactive',
  'blocked',
  'pending_approval'
);

-- Crear tabla de cuentas por pagar
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  expense_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  payment_status payable_status DEFAULT 'pending',
  payment_date DATE,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TYPE public.payable_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'overdue',
  'cancelled'
);

-- Actualizar tabla de gastos para incluir proveedor
ALTER TABLE public.expenses 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para proveedores
CREATE POLICY "Only employees and admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Políticas RLS para cuentas por pagar
CREATE POLICY "Only employees and admins can manage accounts payable" 
ON public.accounts_payable 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- FASE 2: Mejorar tabla de proyectos para fases customizables
ALTER TABLE public.projects 
ADD COLUMN phases JSONB DEFAULT '[]',
ADD COLUMN team_members JSONB DEFAULT '[]',
ADD COLUMN custom_fields JSONB DEFAULT '{}',
ADD COLUMN project_type TEXT DEFAULT 'construccion',
ADD COLUMN location TEXT;

-- FASE 3: Mejorar tabla de clientes para ventas
ALTER TABLE public.clients 
ADD COLUMN conversion_date DATE,
ADD COLUMN conversion_notes TEXT,
ADD COLUMN sales_pipeline_stage TEXT DEFAULT 'lead',
ADD COLUMN probability_percentage INTEGER DEFAULT 0,
ADD COLUMN estimated_value NUMERIC DEFAULT 0,
ADD COLUMN last_activity_date DATE;

-- FASE 4: Crear tabla para actividades de venta
CREATE TABLE public.sales_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  outcome TEXT,
  next_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only employees and admins can manage sales activities" 
ON public.sales_activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- FASE 5: Mejorar documentos para visualización
ALTER TABLE public.documents 
ADD COLUMN file_size BIGINT,
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN document_status TEXT DEFAULT 'active',
ADD COLUMN tags TEXT[],
ADD COLUMN access_level TEXT DEFAULT 'internal';

-- FASE 6: Crear tabla para configuración de cliente
CREATE TABLE public.client_portal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  can_view_photos BOOLEAN DEFAULT true,
  can_view_documents BOOLEAN DEFAULT true,
  can_view_finances BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own portal settings" 
ON public.client_portal_settings 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM public.clients c 
  JOIN public.profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Employees and admins can manage client portal settings" 
ON public.client_portal_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));