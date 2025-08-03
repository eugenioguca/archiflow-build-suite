-- Add missing fields to material_requirements table
ALTER TABLE public.material_requirements 
ADD COLUMN IF NOT EXISTS adjustment_additive numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_deductive numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_delivered boolean DEFAULT false;

-- Create material_finance_requests table
CREATE TABLE IF NOT EXISTS public.material_finance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_requirement_id uuid NOT NULL,
  project_id uuid NOT NULL,
  client_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  request_date timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending, attended, cancelled
  is_attended boolean DEFAULT false,
  attended_by uuid,
  attended_date timestamp with time zone,
  purchase_order_number text,
  supplier_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for material_finance_requests
ALTER TABLE public.material_finance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for material_finance_requests
CREATE POLICY "Employees and admins can manage material finance requests"
ON public.material_finance_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create function to auto-create finance requests when material status changes to 'required'
CREATE OR REPLACE FUNCTION public.auto_create_material_finance_request()
RETURNS TRIGGER AS $$
DECLARE
  project_client_id UUID;
  requester_profile_id UUID;
BEGIN
  -- Only create request when status changes to 'required'
  IF NEW.status = 'required' AND (OLD.status IS NULL OR OLD.status != 'required') THEN
    -- Get client_id from project
    SELECT client_id INTO project_client_id
    FROM public.client_projects
    WHERE id = NEW.project_id;
    
    -- Get current user's profile
    SELECT id INTO requester_profile_id
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Insert finance request if not exists
    INSERT INTO public.material_finance_requests (
      material_requirement_id,
      project_id,
      client_id,
      requested_by,
      supplier_id
    ) VALUES (
      NEW.id,
      NEW.project_id,
      project_client_id,
      COALESCE(requester_profile_id, NEW.created_by),
      NEW.supplier_id
    )
    ON CONFLICT (material_requirement_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_auto_create_material_finance_request
  AFTER INSERT OR UPDATE ON public.material_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_material_finance_request();

-- Add unique constraint to prevent duplicate finance requests
ALTER TABLE public.material_finance_requests 
ADD CONSTRAINT unique_material_finance_request 
UNIQUE (material_requirement_id);

-- Create updated_at trigger
CREATE TRIGGER update_material_finance_requests_updated_at
  BEFORE UPDATE ON public.material_finance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();