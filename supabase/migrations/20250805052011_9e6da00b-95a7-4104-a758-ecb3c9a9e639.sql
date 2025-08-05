-- Revisar los valores permitidos para sales_pipeline_stage
SELECT 
    enumlabel as allowed_values
FROM pg_enum
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'sales_pipeline_stage'
);

-- Corregir el trigger para usar valores válidos del enum
CREATE OR REPLACE FUNCTION public.sync_payment_status_with_sales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- When payment installment is marked as paid, update project payment status
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if all installments for this plan are paid
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_installments 
      WHERE payment_plan_id = NEW.payment_plan_id 
      AND status != 'paid'
    ) THEN
      -- All installments paid, update project status to cliente_cerrado (final stage)
      UPDATE public.client_projects 
      SET sales_pipeline_stage = 'cliente_cerrado'
      WHERE id = (
        SELECT client_project_id 
        FROM public.payment_plans 
        WHERE id = NEW.payment_plan_id
      );
    -- Si hay pagos parciales, mantener en 'en_contacto' no cambiar el stage
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;