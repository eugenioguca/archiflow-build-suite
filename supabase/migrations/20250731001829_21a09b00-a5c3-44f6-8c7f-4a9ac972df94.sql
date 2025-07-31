-- Crear tipos primero
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

CREATE TYPE public.payable_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'overdue',
  'cancelled'
);

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

-- Crear tabla de cuentas por pagar
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
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