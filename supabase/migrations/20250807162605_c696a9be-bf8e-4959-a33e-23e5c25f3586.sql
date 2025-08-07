-- Eliminar triggers relacionados con planes de pago
DROP TRIGGER IF EXISTS trigger_sync_payment_status ON payment_installments;
DROP TRIGGER IF EXISTS trigger_notify_payment_status_update ON payment_installments;

-- Eliminar funciones relacionadas con planes de pago
DROP FUNCTION IF EXISTS public.sync_payment_status_with_sales();
DROP FUNCTION IF EXISTS public.create_payment_plan_from_sales(uuid, text, numeric, text, jsonb);
DROP FUNCTION IF EXISTS public.get_project_payment_status(uuid);
DROP FUNCTION IF EXISTS public.notify_payment_status_update();

-- Eliminar vista de planes de pago
DROP VIEW IF EXISTS public.payment_plans_with_sales;

-- Eliminar foreign keys que referencian las tablas de pagos
ALTER TABLE IF EXISTS public.client_payment_proofs DROP CONSTRAINT IF EXISTS client_payment_proofs_payment_installment_id_fkey;

-- Eliminar tablas de planes de pago e ingresos
DROP TABLE IF EXISTS public.payment_installments CASCADE;
DROP TABLE IF EXISTS public.payment_plans CASCADE;
DROP TABLE IF EXISTS public.incomes CASCADE;

-- Actualizar trigger de transición ventas -> diseño (solo documentos requeridos)
CREATE OR REPLACE FUNCTION public.auto_create_project_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo crear proyecto si el cliente pasa de 'nuevo_lead' a 'en_contacto' y no tiene proyecto
  IF OLD.sales_pipeline_stage = 'nuevo_lead' 
     AND NEW.sales_pipeline_stage = 'en_contacto' 
     AND NOT EXISTS (SELECT 1 FROM public.projects WHERE client_id = NEW.client_id) THEN
    
    INSERT INTO public.projects (
      client_id,
      name,
      description,
      status
    ) VALUES (
      NEW.client_id,
      'Proyecto para ' || (SELECT full_name FROM public.clients WHERE id = NEW.client_id),
      'Proyecto creado automáticamente al convertir lead',
      'planning'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Actualizar trigger de transición diseño -> construcción (solo presupuesto aprobado)
CREATE OR REPLACE FUNCTION public.auto_transition_to_construction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if project should transition from design to construction
  IF NEW.status = 'design' 
     AND NEW.construction_budget > 0
     AND (OLD.status IS NULL OR OLD.status != 'construction') THEN
    
    -- Transition to construction if budget is approved
    NEW.status = 'construction';
    NEW.moved_to_construction_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;