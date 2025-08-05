-- Fix Treasury Module Foreign Keys and Architecture (Fixed)

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

-- Create policy for suppliers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'Employees and admins can manage suppliers') THEN
        CREATE POLICY "Employees and admins can manage suppliers" ON public.suppliers
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('admin', 'employee')
          )
        );
    END IF;
END $$;

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
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1;