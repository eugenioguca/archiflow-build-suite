-- Add treasury material payment tracking tables and fields

-- Add payment selection and export status to material finance requests
ALTER TABLE public.material_finance_requests 
ADD COLUMN selected_for_payment boolean DEFAULT false,
ADD COLUMN exported_to_treasury boolean DEFAULT false,
ADD COLUMN treasury_export_date timestamp with time zone,
ADD COLUMN payment_reference text;

-- Create treasury material payments table to track material payments by supplier
CREATE TABLE public.treasury_material_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  material_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  processed_by uuid REFERENCES public.profiles(id),
  processed_at timestamp with time zone,
  account_type text, -- 'bank' or 'cash'
  account_id uuid, -- references bank_accounts or cash_accounts
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create junction table for tracking which materials are in each payment
CREATE TABLE public.treasury_material_payment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid REFERENCES public.treasury_material_payments(id) ON DELETE CASCADE NOT NULL,
  material_finance_request_id uuid REFERENCES public.material_finance_requests(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add treasury payment reference to treasury_transactions for tracking
ALTER TABLE public.treasury_transactions 
ADD COLUMN material_payment_reference text;

-- Enable RLS on new tables
ALTER TABLE public.treasury_material_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_material_payment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for treasury material payments
CREATE POLICY "Employees and admins can manage treasury material payments"
ON public.treasury_material_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create RLS policies for treasury material payment items
CREATE POLICY "Employees and admins can manage treasury material payment items"
ON public.treasury_material_payment_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create function to generate payment reference codes
CREATE OR REPLACE FUNCTION public.generate_material_payment_reference()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  sequence_num INTEGER;
  reference_code TEXT;
BEGIN
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_code, '-', 4) AS INTEGER)
  ), 0) + 1 INTO sequence_num
  FROM public.treasury_material_payments
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate reference code: MAT-YYYYMMDD-###
  reference_code := 'MAT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN reference_code;
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_treasury_material_payments_updated_at
  BEFORE UPDATE ON public.treasury_material_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();