-- Fix security warnings: Add SET search_path = public to all functions missing it

-- Fix update_alliance_stats function
CREATE OR REPLACE FUNCTION public.update_alliance_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE commercial_alliances 
    SET clients_referred = clients_referred + 1,
        updated_at = now()
    WHERE id = NEW.alliance_id AND NEW.alliance_id IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.alliance_id IS DISTINCT FROM NEW.alliance_id THEN
      IF OLD.alliance_id IS NOT NULL THEN
        UPDATE commercial_alliances 
        SET clients_referred = clients_referred - 1,
            updated_at = now()
        WHERE id = OLD.alliance_id;
      END IF;
      IF NEW.alliance_id IS NOT NULL THEN
        UPDATE commercial_alliances 
        SET clients_referred = clients_referred + 1,
            updated_at = now()
        WHERE id = NEW.alliance_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.alliance_id IS NOT NULL THEN
      UPDATE commercial_alliances 
      SET clients_referred = clients_referred - 1,
          updated_at = now()
      WHERE id = OLD.alliance_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix notify_sales_advisor_appointment function
CREATE OR REPLACE FUNCTION public.notify_sales_advisor_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add notification logic here if needed
  RETURN NEW;
END;
$$;

-- Fix log_security_event function (commonly missing search_path)
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    event_data,
    created_at
  ) VALUES (
    event_type,
    auth.uid(),
    event_data,
    now()
  );
EXCEPTION
  WHEN others THEN
    -- Fail silently to avoid blocking operations
    NULL;
END;
$$;

-- Fix auto_transition_to_design function 
CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sales_pipeline_stage != 'cliente_cerrado' 
     AND NEW.sales_pipeline_stage = 'cliente_cerrado'
     AND NEW.budget > 0 THEN
    
    NEW.status := 'design';
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix notify_sales_advisor function
CREATE OR REPLACE FUNCTION public.notify_sales_advisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add notification logic here if needed
  RETURN NEW;
END;
$$;