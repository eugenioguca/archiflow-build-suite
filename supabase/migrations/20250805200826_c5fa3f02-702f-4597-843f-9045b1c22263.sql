-- Fase 1: Crear trigger para sincronizar construction_budget con project_budgets
CREATE OR REPLACE FUNCTION public.sync_construction_budget()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER trigger_sync_construction_budget
  AFTER UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_construction_budget();

-- Validar transición a construcción requiere presupuesto
CREATE OR REPLACE FUNCTION public.validate_construction_transition()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Crear trigger de validación
CREATE TRIGGER trigger_validate_construction_transition
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_construction_transition();