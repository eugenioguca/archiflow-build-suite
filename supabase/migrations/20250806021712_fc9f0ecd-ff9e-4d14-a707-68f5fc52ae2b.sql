-- Mejorar la función de migración existente para manejar ambos estados y ser más robusta
CREATE OR REPLACE FUNCTION public.migrate_design_budget_to_construction(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id UUID;
  budget_item RECORD;
  migration_result jsonb := '{"items_migrated": 0, "status": "success", "message": ""}';
  items_count integer := 0;
BEGIN
  -- Get admin profile as creator
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- Check if construction budget items already exist for this project
  IF EXISTS (
    SELECT 1 FROM public.construction_budget_items 
    WHERE project_id = p_project_id
  ) THEN
    migration_result := jsonb_build_object(
      'items_migrated', 0,
      'status', 'already_exists',
      'message', 'Construction budget items already exist for this project'
    );
    RETURN migration_result;
  END IF;
  
  -- Migrate budget items from project_budgets/budget_items to construction_budget_items
  -- Support both 'approved' and 'accepted' status for backward compatibility
  FOR budget_item IN (
    SELECT bi.*, pb.status as budget_status
    FROM public.budget_items bi
    JOIN public.project_budgets pb ON pb.id = bi.budget_id
    WHERE pb.project_id = p_project_id 
    AND pb.status IN ('approved', 'accepted')
    ORDER BY bi.item_order
  )
  LOOP
    INSERT INTO public.construction_budget_items (
      project_id,
      item_code,
      item_name,
      item_description,
      category,
      subcategory,
      unit_of_measure,
      quantity,
      unit_price,
      total_price,
      item_order,
      status,
      created_by,
      budget_version
    ) VALUES (
      p_project_id,
      COALESCE('ITEM-' || budget_item.item_order, 'ITEM-' || budget_item.item_order),
      budget_item.item_name,
      budget_item.description,
      'General', -- Default category
      NULL,
      'PZA', -- Default unit
      COALESCE(budget_item.quantity, 1),
      budget_item.unit_price,
      budget_item.total_price,
      budget_item.item_order,
      'pending',
      admin_profile_id,
      1
    );
    
    items_count := items_count + 1;
    
    -- Log the migration
    INSERT INTO public.budget_change_log (
      budget_item_id,
      project_id,
      changed_by,
      change_type,
      old_value,
      new_value,
      change_reason,
      change_comments
    ) VALUES (
      (SELECT id FROM public.construction_budget_items WHERE project_id = p_project_id AND item_order = budget_item.item_order LIMIT 1),
      p_project_id,
      admin_profile_id,
      'created',
      NULL,
      'Migrated from design budget',
      'Automatic migration from approved design budget',
      'Budget automatically loaded from design module for construction phase'
    );
  END LOOP;
  
  -- Update migration result
  migration_result := jsonb_build_object(
    'items_migrated', items_count,
    'status', CASE WHEN items_count > 0 THEN 'success' ELSE 'no_items' END,
    'message', CASE 
      WHEN items_count > 0 THEN 'Successfully migrated ' || items_count || ' budget items to construction'
      ELSE 'No approved design budget found to migrate'
    END
  );
  
  RETURN migration_result;
END;
$function$;

-- Crear trigger para migración automática cuando el presupuesto se apruebe
CREATE OR REPLACE FUNCTION public.auto_migrate_budget_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  migration_result jsonb;
BEGIN
  -- Solo migrar cuando el estado cambie a 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Ejecutar la migración
    SELECT public.migrate_design_budget_to_construction(NEW.project_id) INTO migration_result;
    
    -- Log the migration result (opcional, para debugging)
    RAISE NOTICE 'Budget migration result: %', migration_result;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_auto_migrate_budget ON public.project_budgets;
CREATE TRIGGER trigger_auto_migrate_budget
  AFTER UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_migrate_budget_on_approval();

-- Migrar el proyecto existente que ya tiene un presupuesto en estado 'draft'
-- Primero actualizamos el estado a 'approved' para el proyecto específico
UPDATE public.project_budgets 
SET status = 'approved' 
WHERE project_id = 'cb7df726-bd7a-4d30-b265-cb5fb33076c5' 
AND status = 'draft';

-- El trigger se ejecutará automáticamente y migrará los items