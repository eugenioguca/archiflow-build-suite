-- Create client payment proofs table
CREATE TABLE public.client_payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  project_id UUID NOT NULL,
  payment_installment_id UUID REFERENCES public.payment_installments(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view their own payment proofs"
ON public.client_payment_proofs FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Clients can create their own payment proofs"
ON public.client_payment_proofs FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Employees and admins can manage payment proofs"
ON public.client_payment_proofs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create function to update timestamps
CREATE TRIGGER update_client_payment_proofs_updated_at
BEFORE UPDATE ON public.client_payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for new payment proofs
CREATE OR REPLACE FUNCTION public.notify_payment_proof_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
BEGIN
  -- Get assigned advisor and client name
  SELECT cp.assigned_advisor_id, c.full_name 
  INTO advisor_user_id, client_name
  FROM public.client_projects cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.id = NEW.project_id;
  
  -- Create notification for advisor if exists
  IF advisor_user_id IS NOT NULL THEN
    -- Get user_id from advisor profile
    SELECT p.user_id INTO advisor_user_id
    FROM public.profiles p
    WHERE p.id = advisor_user_id;
    
    INSERT INTO public.module_notifications (
      user_id,
      client_id,
      source_module,
      target_module,
      notification_type,
      title,
      message
    ) VALUES (
      advisor_user_id,
      NEW.client_id,
      'client_portal',
      'sales',
      'payment_proof_uploaded',
      'Nuevo comprobante de pago',
      'El cliente ' || client_name || ' ha subido un comprobante de pago para revisión'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_payment_proof_uploaded
AFTER INSERT ON public.client_payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_proof_uploaded();

-- Add table to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_payment_proofs;