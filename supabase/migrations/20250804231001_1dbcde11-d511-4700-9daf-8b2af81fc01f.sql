-- Create payment plans integration with sales module
-- This connects payment plans directly with the client_projects table

-- First, ensure payment_plans table has proper foreign key relationship
ALTER TABLE public.payment_plans 
DROP CONSTRAINT IF EXISTS payment_plans_client_project_id_fkey;

ALTER TABLE public.payment_plans 
ADD CONSTRAINT payment_plans_client_project_id_fkey 
FOREIGN KEY (client_project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

-- Create function to sync payment status between modules
CREATE OR REPLACE FUNCTION public.sync_payment_status_with_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment installment is marked as paid, update project payment status
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if all installments for this plan are paid
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_installments 
      WHERE payment_plan_id = NEW.payment_plan_id 
      AND status != 'paid'
    ) THEN
      -- All installments paid, update project status
      UPDATE public.client_projects 
      SET sales_pipeline_stage = 'pagado_completo'
      WHERE id = (
        SELECT client_project_id 
        FROM public.payment_plans 
        WHERE id = NEW.payment_plan_id
      );
    ELSE
      -- Partial payment, update to partial payment status
      UPDATE public.client_projects 
      SET sales_pipeline_stage = 'pago_parcial'
      WHERE id = (
        SELECT client_project_id 
        FROM public.payment_plans 
        WHERE id = NEW.payment_plan_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status synchronization
DROP TRIGGER IF EXISTS trigger_sync_payment_status ON public.payment_installments;
CREATE TRIGGER trigger_sync_payment_status
  AFTER UPDATE ON public.payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_status_with_sales();

-- Create view for finance module to see sales data
CREATE OR REPLACE VIEW public.payment_plans_with_sales AS
SELECT 
  pp.*,
  cp.project_name,
  cp.client_id,
  cp.sales_pipeline_stage,
  cp.status as project_status,
  c.full_name as client_name,
  c.email as client_email,
  c.phone as client_phone
FROM public.payment_plans pp
LEFT JOIN public.client_projects cp ON pp.client_project_id = cp.id
LEFT JOIN public.clients c ON cp.client_id = c.id;

-- Grant permissions on the view
GRANT SELECT ON public.payment_plans_with_sales TO authenticated;

-- Create function to create payment plan from sales module
CREATE OR REPLACE FUNCTION public.create_payment_plan_from_sales(
  p_client_project_id UUID,
  p_plan_name TEXT,
  p_total_amount NUMERIC,
  p_currency TEXT DEFAULT 'MXN',
  p_installments_data JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
  v_installment JSONB;
BEGIN
  -- Create payment plan
  INSERT INTO public.payment_plans (
    client_project_id,
    plan_name,
    total_amount,
    currency,
    status,
    created_by
  ) VALUES (
    p_client_project_id,
    p_plan_name,
    p_total_amount,
    p_currency,
    'active',
    (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  ) RETURNING id INTO v_plan_id;
  
  -- Create installments if provided
  FOR v_installment IN SELECT * FROM jsonb_array_elements(p_installments_data)
  LOOP
    INSERT INTO public.payment_installments (
      payment_plan_id,
      installment_number,
      amount,
      due_date,
      status,
      description
    ) VALUES (
      v_plan_id,
      (v_installment->>'installment_number')::INTEGER,
      (v_installment->>'amount')::NUMERIC,
      (v_installment->>'due_date')::DATE,
      COALESCE(v_installment->>'status', 'pending'),
      v_installment->>'description'
    );
  END LOOP;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get payment status for sales module
CREATE OR REPLACE FUNCTION public.get_project_payment_status(p_project_id UUID)
RETURNS TABLE(
  total_amount NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  overdue_amount NUMERIC,
  payment_percentage NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pi.amount), 0) as total_amount,
    COALESCE(SUM(CASE WHEN pi.status = 'paid' THEN pi.amount ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN pi.status = 'pending' THEN pi.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN pi.status = 'overdue' THEN pi.amount ELSE 0 END), 0) as overdue_amount,
    CASE 
      WHEN COALESCE(SUM(pi.amount), 0) > 0 
      THEN (COALESCE(SUM(CASE WHEN pi.status = 'paid' THEN pi.amount ELSE 0 END), 0) / SUM(pi.amount)) * 100
      ELSE 0 
    END as payment_percentage,
    CASE 
      WHEN COUNT(*) = 0 THEN 'no_plan'
      WHEN COUNT(*) = COUNT(CASE WHEN pi.status = 'paid' THEN 1 END) THEN 'completed'
      WHEN COUNT(CASE WHEN pi.status = 'paid' THEN 1 END) > 0 THEN 'partial'
      ELSE 'pending'
    END as status
  FROM public.payment_plans pp
  LEFT JOIN public.payment_installments pi ON pp.id = pi.payment_plan_id
  WHERE pp.client_project_id = p_project_id
  AND pp.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;