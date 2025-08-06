-- CONTINUACIÓN FASE 1: Actualizar las funciones restantes con SET search_path TO 'public'

-- 6. Actualizar función validate_construction_transition
CREATE OR REPLACE FUNCTION public.validate_construction_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si el status cambia a 'construction', validar que tenga construction_budget
  IF NEW.status = 'construction' AND (OLD.status IS NULL OR OLD.status != 'construction') THEN
    -- Verificar que tenga construction_budget > 0
    IF NEW.construction_budget IS NULL OR NEW.construction_budget <= 0 THEN
      RAISE EXCEPTION 'No se puede pasar a construcción sin un presupuesto de obra aprobado. Debe crear y aprobar un presupuesto en el módulo de diseño.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 7. Actualizar función sync_construction_budget
CREATE OR REPLACE FUNCTION public.sync_construction_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cuando se actualiza el total_amount de project_budgets, actualizar construction_budget
  IF TG_OP = 'UPDATE' AND OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
    UPDATE public.client_projects 
    SET construction_budget = NEW.total_amount,
        updated_at = now()
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 8. Actualizar función update_bank_account_balance
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_type = 'bank' THEN
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      ELSIF NEW.transaction_type = 'expense' THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
    ELSIF NEW.account_type = 'cash' THEN
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.cash_accounts 
        SET current_balance = current_balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      ELSIF NEW.transaction_type = 'expense' THEN
        UPDATE public.cash_accounts 
        SET current_balance = current_balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

-- FASE 3: Función para masking de datos sensibles (PII Protection)
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  data_value text,
  data_type text DEFAULT 'general'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo mascarar para usuarios no admin
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  ) THEN
    RETURN data_value; -- Admins ven todo
  END IF;
  
  -- Aplicar masking según el tipo de dato
  CASE data_type
    WHEN 'curp' THEN
      RETURN CASE 
        WHEN LENGTH(data_value) >= 4 THEN 
          LEFT(data_value, 4) || 'X' || RIGHT(data_value, 4)
        ELSE 'XXXX'
      END;
    WHEN 'rfc' THEN
      RETURN CASE 
        WHEN LENGTH(data_value) >= 4 THEN 
          LEFT(data_value, 4) || 'XXXX' || RIGHT(data_value, 3)
        ELSE 'XXXX'
      END;
    WHEN 'financial' THEN
      RETURN '***PROTEGIDO***';
    ELSE
      RETURN data_value; -- No mascarar por defecto
  END CASE;
END;
$function$;