-- FASE 1: Corregir el plan de pago de Jorge Garza
UPDATE public.payment_plans 
SET status = 'active', 
    updated_at = now()
WHERE plan_name LIKE '%Jorge Garza%' AND status = 'draft';

-- Agregar índices solo para las tablas que existen con las columnas correctas
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON public.payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_project_client ON public.payment_plans(client_project_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_plan_status ON public.payment_installments(payment_plan_id, status);

-- Verificar si las columnas existen antes de crear índices
DO $$
BEGIN
    -- Solo crear índices si las columnas existen
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_project_client ON public.expenses(project_id, client_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_incomes_project_client ON public.incomes(project_id, client_id);
    END IF;
END $$;