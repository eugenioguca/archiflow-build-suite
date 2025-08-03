-- FASE 1: Corregir el plan de pago de Jorge Garza
UPDATE public.payment_plans 
SET status = 'active', 
    updated_at = now()
WHERE plan_name LIKE '%Jorge Garza%' AND status = 'draft';

-- Agregar índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON public.payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_project_client ON public.payment_plans(project_id, client_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_plan_status ON public.payment_installments(payment_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_project_client ON public.expenses(project_id, client_id);
CREATE INDEX IF NOT EXISTS idx_incomes_project_client ON public.incomes(project_id, client_id);