-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.update_alliance_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update clients_referred count
    UPDATE public.commercial_alliances 
    SET clients_referred = clients_referred + 1,
        updated_at = now()
    WHERE id = NEW.alliance_id AND NEW.alliance_id IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle alliance change
    IF OLD.alliance_id IS DISTINCT FROM NEW.alliance_id THEN
      -- Decrease count for old alliance
      IF OLD.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred - 1,
            updated_at = now()
        WHERE id = OLD.alliance_id;
      END IF;
      -- Increase count for new alliance
      IF NEW.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred + 1,
            updated_at = now()
        WHERE id = NEW.alliance_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease count when client is deleted
    IF OLD.alliance_id IS NOT NULL THEN
      UPDATE public.commercial_alliances 
      SET clients_referred = clients_referred - 1,
          updated_at = now()
      WHERE id = OLD.alliance_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;