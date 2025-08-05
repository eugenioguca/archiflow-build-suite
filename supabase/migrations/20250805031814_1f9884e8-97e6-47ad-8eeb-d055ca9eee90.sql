-- Fix Treasury Module Foreign Keys and Architecture

-- First, let's check if suppliers table exists, if not create it
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    rfc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    active BOOLEAN DEFAULT true
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy for suppliers
CREATE POLICY "Employees and admins can manage suppliers" ON public.suppliers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Add missing columns to treasury_transactions if they don't exist
ALTER TABLE public.treasury_transactions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to treasury_payment_references if they don't exist  
ALTER TABLE public.treasury_payment_references
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);

-- Add missing columns to material_finance_requests if they don't exist
ALTER TABLE public.material_finance_requests
ADD COLUMN IF NOT EXISTS material_name TEXT,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC GENERATED ALWAYS AS (unit_cost * quantity) STORED;

-- Create material_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.client_projects(id) NOT NULL,
    material_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    supplier_id UUID REFERENCES public.suppliers(id),
    status TEXT DEFAULT 'pending',
    required_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on material_requirements
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;

-- Create policy for material_requirements
CREATE POLICY "Employees and admins can manage material requirements" ON public.material_requirements
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Update material_finance_requests to reference material_requirements properly
ALTER TABLE public.material_finance_requests
ADD COLUMN IF NOT EXISTS material_requirement_id UUID REFERENCES public.material_requirements(id);

-- Create function to inherit client_id from project
CREATE OR REPLACE FUNCTION public.inherit_client_from_project()
RETURNS TRIGGER AS $$
BEGIN
  -- If project_id is provided but client_id is null, inherit from project
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM public.client_projects
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-inheriting client_id
DROP TRIGGER IF EXISTS inherit_client_treasury_transactions ON public.treasury_transactions;
CREATE TRIGGER inherit_client_treasury_transactions
  BEFORE INSERT OR UPDATE ON public.treasury_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_from_project();

DROP TRIGGER IF EXISTS inherit_client_payment_references ON public.treasury_payment_references;
CREATE TRIGGER inherit_client_payment_references
  BEFORE INSERT OR UPDATE ON public.treasury_payment_references
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_from_project();

DROP TRIGGER IF EXISTS inherit_client_material_requests ON public.material_finance_requests;
CREATE TRIGGER inherit_client_material_requests
  BEFORE INSERT OR UPDATE ON public.material_finance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_from_project();