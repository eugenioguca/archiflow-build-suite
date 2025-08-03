-- Create payment plans table
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment installments table
CREATE TABLE public.payment_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  marked_paid_by UUID REFERENCES public.profiles(id),
  marked_paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_plans
CREATE POLICY "Employees and admins can manage payment plans" 
ON public.payment_plans 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Clients can view their own payment plans" 
ON public.payment_plans 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM public.clients c 
  JOIN public.profiles p ON p.id = c.profile_id 
  WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
));

-- RLS Policies for payment_installments
CREATE POLICY "Employees and admins can manage payment installments" 
ON public.payment_installments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Clients can view their own payment installments" 
ON public.payment_installments 
FOR SELECT 
USING (payment_plan_id IN (
  SELECT pp.id FROM public.payment_plans pp
  JOIN public.clients c ON pp.client_id = c.id
  JOIN public.profiles p ON p.id = c.profile_id 
  WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
));

-- Finance users can update payment status
CREATE POLICY "Finance users can update payment status" 
ON public.payment_installments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.department = 'finance'
));

-- Create indexes for performance
CREATE INDEX idx_payment_plans_project_id ON public.payment_plans(project_id);
CREATE INDEX idx_payment_plans_client_id ON public.payment_plans(client_id);
CREATE INDEX idx_payment_installments_payment_plan_id ON public.payment_installments(payment_plan_id);
CREATE INDEX idx_payment_installments_status ON public.payment_installments(status);
CREATE INDEX idx_payment_installments_due_date ON public.payment_installments(due_date);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();