-- Eliminar funciones existentes y recrearlas con nuevos parámetros
DROP FUNCTION IF EXISTS public.insert_default_construction_budget_items(uuid);
DROP FUNCTION IF EXISTS public.check_budget_alerts(uuid);

CREATE OR REPLACE FUNCTION public.insert_default_construction_budget_items(project_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id UUID;
BEGIN
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;

  INSERT INTO public.construction_budget_items (
    project_id, 
    codigo, 
    descripcion, 
    unidad, 
    cantidad,
    precio_unitario, 
    total, 
    categoria,
    created_by
  ) VALUES
  (project_id_param, 'CON-001', 'Concreto premezclado f''c=200 kg/cm²', 'm³', 150, 2800, 420000, 'Concreto', admin_profile_id),
  (project_id_param, 'ACE-001', 'Varilla de acero #4 (1/2")', 'ton', 25, 22000, 550000, 'Acero', admin_profile_id),
  (project_id_param, 'BLO-001', 'Block de concreto 15x20x40 cm', 'pza', 2000, 15, 30000, 'Mampostería', admin_profile_id),
  (project_id_param, 'CEM-001', 'Cemento Portland gris 50kg', 'bulto', 200, 250, 50000, 'Cemento', admin_profile_id),
  (project_id_param, 'GRA-001', 'Grava de 3/4"', 'm³', 80, 400, 32000, 'Agregados', admin_profile_id),
  (project_id_param, 'ARE-001', 'Arena de río', 'm³', 60, 350, 21000, 'Agregados', admin_profile_id),
  (project_id_param, 'LAM-001', 'Lámina galvanizada calibre 26', 'm²', 100, 180, 18000, 'Techos', admin_profile_id),
  (project_id_param, 'TUB-001', 'Tubería PVC sanitario 4"', 'm', 50, 120, 6000, 'Instalaciones', admin_profile_id),
  (project_id_param, 'CAB-001', 'Cable eléctrico calibre 12 AWG', 'm', 200, 25, 5000, 'Instalaciones', admin_profile_id),
  (project_id_param, 'PIN-001', 'Pintura vinílica interior', 'lt', 80, 180, 14400, 'Acabados', admin_profile_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_budget_alerts(project_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_budget NUMERIC;
  spent_amount NUMERIC;
  budget_percentage NUMERIC;
BEGIN
  SELECT construction_budget, spent_budget INTO project_budget, spent_amount
  FROM client_projects 
  WHERE id = project_id_param;
  
  IF project_budget > 0 THEN
    budget_percentage := (spent_amount / project_budget) * 100;
    
    IF budget_percentage >= 100 THEN
      INSERT INTO construction_budget_alerts (
        project_id,
        alert_type,
        threshold_percentage,
        current_percentage,
        message
      ) VALUES (
        project_id_param,
        'budget_exceeded',
        100,
        budget_percentage,
        'CRÍTICO: El presupuesto ha sido excedido en ' || ROUND(budget_percentage - 100, 2) || '%'
      );
    ELSIF budget_percentage >= 90 THEN
      INSERT INTO construction_budget_alerts (
        project_id,
        alert_type,
        threshold_percentage,
        current_percentage,
        message
      ) VALUES (
        project_id_param,
        'budget_warning',
        90,
        budget_percentage,
        'ADVERTENCIA: Se ha utilizado ' || ROUND(budget_percentage, 2) || '% del presupuesto'
      );
    END IF;
  END IF;
END;
$function$;