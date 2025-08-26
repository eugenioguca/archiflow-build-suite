-- Actualizar la función para generar referencias más cortas y compactas
CREATE OR REPLACE FUNCTION public.generate_unified_transaction_reference()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_prefix TEXT := 'OME'; -- Tres primeras letras de la empresa (puedes cambiar esto)
  date_suffix TEXT;
  random_letters TEXT := '';
  reference_code TEXT;
  i INTEGER;
  letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  -- Generar sufijo de fecha (ddmmyy)
  date_suffix := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  
  -- Generar 4 letras aleatorias
  FOR i IN 1..4 LOOP
    random_letters := random_letters || SUBSTR(letters, 1 + (RANDOM() * 25)::INTEGER, 1);
  END LOOP;
  
  -- Generar código de referencia: ABC-ddmmyy-WXYZ
  reference_code := company_prefix || '-' || date_suffix || '-' || random_letters;
  
  RETURN reference_code;
END;
$function$;