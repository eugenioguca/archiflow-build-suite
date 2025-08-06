-- FASE 1: Hardening de Base de Datos - Aplicar SET search_path TO 'public' en funciones
-- Corrección de las 24 funciones identificadas por el linter

-- 1. Actualizar función calculate_complement_due_date
CREATE OR REPLACE FUNCTION public.calculate_complement_due_date(payment_date date)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Complement must be issued by the 17th of the month following the payment
  RETURN DATE_TRUNC('month', payment_date + INTERVAL '1 month') + INTERVAL '16 days';
END;
$function$;

-- 2. Actualizar función update_cash_flow_calculations
CREATE OR REPLACE FUNCTION public.update_cash_flow_calculations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.projected_net_flow = NEW.projected_income - NEW.projected_expenses;
  NEW.actual_net_flow = NEW.actual_income - NEW.actual_expenses;
  NEW.variance = NEW.actual_net_flow - NEW.projected_net_flow;
  RETURN NEW;
END;
$function$;

-- 3. Actualizar función update_cash_account_balance
CREATE OR REPLACE FUNCTION public.update_cash_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update balance for new transaction
    IF NEW.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    ELSIF NEW.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction effect
    IF OLD.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    ELSIF OLD.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    END IF;
    
    -- Apply new transaction effect
    IF NEW.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    ELSIF NEW.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse transaction effect
    IF OLD.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    ELSIF OLD.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 4. Actualizar función update_advance_justified_amount
CREATE OR REPLACE FUNCTION public.update_advance_justified_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.employee_advances 
    SET amount_justified = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.advance_justifications 
      WHERE advance_id = NEW.advance_id AND approved = true
    ),
    updated_at = now()
    WHERE id = NEW.advance_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.employee_advances 
    SET amount_justified = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.advance_justifications 
      WHERE advance_id = OLD.advance_id AND approved = true
    ),
    updated_at = now()
    WHERE id = OLD.advance_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 5. Actualizar función insert_default_budget_items
CREATE OR REPLACE FUNCTION public.insert_default_budget_items(budget_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.budget_items (budget_id, item_name, description, unit_price, total_price, item_order) VALUES
  (budget_id_param, 'Tierra', 'Trabajos de excavación y movimiento de tierra', 0, 0, 1),
  (budget_id_param, 'Cimentación', 'Zapatas, contratrabes y cadenas de desplante', 0, 0, 2),
  (budget_id_param, 'Muros PB', 'Muros de planta baja', 0, 0, 3),
  (budget_id_param, 'Losa', 'Losa de entrepiso y azotea', 0, 0, 4),
  (budget_id_param, 'Muros PA', 'Muros de planta alta', 0, 0, 5),
  (budget_id_param, 'Tapalosa/Pretiles', 'Pretiles y acabados de losa', 0, 0, 6),
  (budget_id_param, 'Aplanados int/ext', 'Aplanados interiores y exteriores', 0, 0, 7),
  (budget_id_param, 'Carpinterías', 'Puertas y elementos de madera', 0, 0, 8),
  (budget_id_param, 'Cancelería', 'Ventanas y canceles', 0, 0, 9),
  (budget_id_param, 'Pintura', 'Pintura interior y exterior', 0, 0, 10),
  (budget_id_param, 'Limpieza', 'Limpieza general de obra', 0, 0, 11),
  (budget_id_param, 'Jardín', 'Trabajos de jardinería y paisajismo', 0, 0, 12);
END;
$function$;

-- FASE 5: Crear tabla de auditoría para logging de seguridad
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  event_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en tabla de auditoría
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de auditoría
CREATE POLICY "Only admins can view security audit logs"
  ON public.security_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Función para logging de eventos de seguridad
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_event_data jsonb DEFAULT '{}',
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    event_data
  ) VALUES (
    p_event_type,
    p_user_id,
    p_event_data
  );
END;
$function$;