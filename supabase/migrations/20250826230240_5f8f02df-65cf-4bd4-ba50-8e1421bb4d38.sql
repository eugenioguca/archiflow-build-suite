-- Crear trigger automático para generar referencias cortas en formato OME-DDMMYY-XXXX

CREATE OR REPLACE FUNCTION public.generate_reference_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Si referencia_unica está vacía o es NULL, generar una nueva
  IF NEW.referencia_unica IS NULL OR NEW.referencia_unica = '' THEN
    NEW.referencia_unica := generate_unified_transaction_reference();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear el trigger que se ejecuta antes de insertar
DROP TRIGGER IF EXISTS trigger_generate_reference_before_insert ON public.unified_financial_transactions;
CREATE TRIGGER trigger_generate_reference_before_insert
  BEFORE INSERT ON public.unified_financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_reference_before_insert();