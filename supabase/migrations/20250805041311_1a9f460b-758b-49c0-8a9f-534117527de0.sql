-- ELIMINAR TODOS LOS DATOS DEL MÓDULO DE FINANZAS
-- Limpiar todas las tablas relacionadas con finanzas/tesorería

-- Eliminar todas las transacciones de tesorería
DELETE FROM public.treasury_transactions;

-- Eliminar todas las cuentas bancarias
DELETE FROM public.bank_accounts;

-- Eliminar todas las cuentas de efectivo  
DELETE FROM public.cash_accounts;

-- Eliminar referencias de pagos de tesorería
DELETE FROM public.treasury_payment_references;

-- Eliminar pagos de materiales de tesorería
DELETE FROM public.treasury_material_payments;

-- Eliminar elementos de pagos de materiales
DELETE FROM public.treasury_material_payment_items;

-- Eliminar solicitudes de finanzas de materiales
DELETE FROM public.material_finance_requests;

-- Eliminar transacciones de efectivo si existen
DELETE FROM public.cash_transactions WHERE true;

-- Resetear secuencias si existen
-- Las tablas ahora están completamente limpias para pruebas reales

-- ARREGLAR ERRORES DE RELACIONES DE BASE DE DATOS
-- Crear tabla suppliers si no existe (necesaria para las relaciones)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    rfc TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Habilitar RLS en suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Crear política para suppliers
CREATE POLICY "Employees and admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Crear tabla material_requirements si no existe  
CREATE TABLE IF NOT EXISTS public.material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    material_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_of_measure TEXT NOT NULL,
    estimated_cost NUMERIC,
    supplier_id UUID REFERENCES public.suppliers(id),
    status TEXT DEFAULT 'pending',
    required_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Habilitar RLS en material_requirements
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;

-- Crear política para material_requirements
CREATE POLICY "Employees and admins can manage material requirements" 
ON public.material_requirements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Arreglar foreign keys faltantes en treasury_payment_references
ALTER TABLE public.treasury_payment_references 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- Arreglar foreign keys faltantes en material_finance_requests
ALTER TABLE public.material_finance_requests 
ADD COLUMN IF NOT EXISTS material_requirement_id UUID REFERENCES public.material_requirements(id);

-- Agregar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON public.suppliers(company_name);
CREATE INDEX IF NOT EXISTS idx_material_requirements_project_id ON public.material_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_material_requirements_supplier_id ON public.material_requirements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_treasury_payment_references_supplier_id ON public.treasury_payment_references(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_finance_requests_material_requirement_id ON public.material_finance_requests(material_requirement_id);

-- VERIFICAR QUE TODAS LAS TABLAS ESTÉN LIMPIAS
-- Los datos ahora están completamente eliminados y las relaciones están arregladas