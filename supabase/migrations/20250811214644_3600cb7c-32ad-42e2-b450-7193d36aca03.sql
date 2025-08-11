-- Create chart of accounts tables for dependent fields
CREATE TABLE public.chart_of_accounts_mayor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departamento TEXT NOT NULL CHECK (departamento IN ('ventas', 'diseño', 'construccion', 'finanzas', 'contabilidad', 'recursos_humanos', 'direccion_general')),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

CREATE TABLE public.chart_of_accounts_partidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mayor_id UUID NOT NULL REFERENCES public.chart_of_accounts_mayor(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

CREATE TABLE public.chart_of_accounts_subpartidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.chart_of_accounts_partidas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create unified financial transactions table
CREATE TABLE public.unified_financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  sucursal_id UUID REFERENCES public.branch_offices(id),
  referencia_unica TEXT NOT NULL UNIQUE,
  empresa_proyecto_id UUID REFERENCES public.client_projects(id),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  monto NUMERIC NOT NULL DEFAULT 0,
  departamento TEXT NOT NULL CHECK (departamento IN ('ventas', 'diseño', 'construccion', 'finanzas', 'contabilidad', 'recursos_humanos', 'direccion_general')),
  mayor_id UUID REFERENCES public.chart_of_accounts_mayor(id),
  partida_id UUID REFERENCES public.chart_of_accounts_partidas(id),
  subpartida_id UUID REFERENCES public.chart_of_accounts_subpartidas(id),
  cliente_proveedor_id UUID,
  tipo_entidad TEXT CHECK (tipo_entidad IN ('cliente', 'proveedor')),
  tiene_factura BOOLEAN NOT NULL DEFAULT false,
  folio_factura TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create function to generate unique reference
CREATE OR REPLACE FUNCTION public.generate_unified_transaction_reference()
RETURNS TEXT AS $$
DECLARE
  sequence_num INTEGER;
  reference_code TEXT;
BEGIN
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(referencia_unica, '-', 3) AS INTEGER)
  ), 0) + 1 INTO sequence_num
  FROM public.unified_financial_transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate reference code: UFT-YYYYMMDD-###
  reference_code := 'UFT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN reference_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference
CREATE OR REPLACE FUNCTION public.set_unified_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referencia_unica IS NULL OR NEW.referencia_unica = '' THEN
    NEW.referencia_unica := public.generate_unified_transaction_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_unified_transaction_reference
  BEFORE INSERT ON public.unified_financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_unified_transaction_reference();

-- Create indexes for performance
CREATE INDEX idx_chart_mayor_departamento ON public.chart_of_accounts_mayor(departamento);
CREATE INDEX idx_chart_partidas_mayor ON public.chart_of_accounts_partidas(mayor_id);
CREATE INDEX idx_chart_subpartidas_partida ON public.chart_of_accounts_subpartidas(partida_id);
CREATE INDEX idx_unified_transactions_fecha ON public.unified_financial_transactions(fecha);
CREATE INDEX idx_unified_transactions_departamento ON public.unified_financial_transactions(departamento);
CREATE INDEX idx_unified_transactions_referencia ON public.unified_financial_transactions(referencia_unica);

-- Enable RLS
ALTER TABLE public.chart_of_accounts_mayor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts_subpartidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Employees and admins can manage chart of accounts mayor" 
ON public.chart_of_accounts_mayor FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Employees and admins can manage chart of accounts partidas" 
ON public.chart_of_accounts_partidas FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Employees and admins can manage chart of accounts subpartidas" 
ON public.chart_of_accounts_subpartidas FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Employees and admins can manage unified financial transactions" 
ON public.unified_financial_transactions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

-- Insert some sample data for testing
INSERT INTO public.chart_of_accounts_mayor (departamento, codigo, nombre, created_by) VALUES
('ventas', 'VEN001', 'Ingresos por Ventas', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('ventas', 'VEN002', 'Comisiones y Bonificaciones', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('construccion', 'CON001', 'Materiales de Construcción', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('construccion', 'CON002', 'Mano de Obra', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('finanzas', 'FIN001', 'Gastos Administrativos', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('contabilidad', 'CNT001', 'Servicios Profesionales', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

INSERT INTO public.chart_of_accounts_partidas (mayor_id, codigo, nombre, created_by) VALUES
((SELECT id FROM public.chart_of_accounts_mayor WHERE codigo = 'VEN001'), 'VEN001-001', 'Ventas Directas', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_mayor WHERE codigo = 'VEN001'), 'VEN001-002', 'Ventas por Referidos', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_mayor WHERE codigo = 'CON001'), 'CON001-001', 'Cemento y Agregados', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_mayor WHERE codigo = 'CON001'), 'CON001-002', 'Acero y Varilla', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

INSERT INTO public.chart_of_accounts_subpartidas (partida_id, codigo, nombre, created_by) VALUES
((SELECT id FROM public.chart_of_accounts_partidas WHERE codigo = 'VEN001-001'), 'VEN001-001-001', 'Casa Habitación', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_partidas WHERE codigo = 'VEN001-001'), 'VEN001-001-002', 'Edificios Comerciales', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_partidas WHERE codigo = 'CON001-001'), 'CON001-001-001', 'Cemento Portland', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM public.chart_of_accounts_partidas WHERE codigo = 'CON001-001'), 'CON001-001-002', 'Grava y Arena', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));