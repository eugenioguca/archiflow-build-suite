-- Crear tabla de ingresos para un ERP completo
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category income_category NOT NULL,
  invoice_number TEXT,
  invoice_date DATE,
  tax_amount NUMERIC DEFAULT 0,
  payment_status income_payment_status DEFAULT 'pending',
  payment_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tipos enum para ingresos
CREATE TYPE income_category AS ENUM ('construction_service', 'consultation', 'project_management', 'maintenance', 'other');
CREATE TYPE income_payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

-- Habilitar RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ingresos
CREATE POLICY "Only employees and admins can manage incomes" 
ON public.incomes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Crear tabla de cuentas por cobrar
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id UUID REFERENCES incomes(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE NOT NULL,
  status receivable_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TYPE receivable_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only employees and admins can manage accounts receivable" 
ON public.accounts_receivable 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Crear tabla de configuración de la plataforma (solo para admins)
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage platform settings" 
ON public.platform_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insertar configuraciones por defecto
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES 
('primary_color', '"#0070f3"'),
('secondary_color', '"#00a8ff"'),
('company_logo', '"/placeholder.svg"'),
('dashboard_background', '"/placeholder.svg"'),
('company_name', '"Mi Empresa"');

-- Trigger para actualizar timestamps
CREATE TRIGGER update_incomes_updated_at
  BEFORE UPDATE ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();