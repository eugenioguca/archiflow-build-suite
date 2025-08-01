-- Create client_payments table for tracking payments received from clients
CREATE TABLE public.client_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  invoice_id UUID NOT NULL, -- references cfdi_documents or incomes
  amount_paid NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  complement_issued BOOLEAN DEFAULT false,
  complement_due_date DATE, -- calculated based on payment_date + legal requirement
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage client payments" 
ON public.client_payments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Add trigger for updated_at
CREATE TRIGGER update_client_payments_updated_at
BEFORE UPDATE ON public.client_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate complement due date (17th of following month)
CREATE OR REPLACE FUNCTION calculate_complement_due_date(payment_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Complement must be issued by the 17th of the month following the payment
  RETURN DATE_TRUNC('month', payment_date + INTERVAL '1 month') + INTERVAL '16 days';
END;
$$;

-- Add computed column for complement_due_date
ALTER TABLE public.client_payments 
ALTER COLUMN complement_due_date 
SET DEFAULT calculate_complement_due_date(CURRENT_DATE);