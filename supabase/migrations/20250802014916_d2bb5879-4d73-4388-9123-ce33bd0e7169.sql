-- Eliminar el trigger problemático que referencia alliance_id en clients
DROP TRIGGER IF EXISTS update_alliance_client_stats ON public.clients;

-- Crear un nuevo trigger que funcione con la tabla client_projects
CREATE OR REPLACE FUNCTION public.update_alliance_stats_from_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Decrease count when project is deleted
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
$function$;

-- Crear el trigger en la tabla client_projects donde sí existe alliance_id
CREATE TRIGGER update_alliance_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.client_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_alliance_stats_from_projects();