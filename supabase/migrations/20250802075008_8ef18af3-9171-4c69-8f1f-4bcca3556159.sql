-- Corregir la función de auto-creación de proyecto de construcción
CREATE OR REPLACE FUNCTION public.auto_create_construction_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  construction_project_id UUID;
  client_area NUMERIC;
  client_budget NUMERIC;
BEGIN
  -- Solo crear si pasa de cualquier estado a 'cliente_cerrado' y no existe construction_project
  IF NEW.sales_pipeline_stage = 'cliente_cerrado' 
     AND (OLD.sales_pipeline_stage != 'cliente_cerrado' OR OLD.sales_pipeline_stage IS NULL)
     AND NOT EXISTS (SELECT 1 FROM construction_projects WHERE project_id = NEW.id) THEN
    
    -- Obtener datos del cliente para heredar
    SELECT 
      COALESCE(NEW.land_square_meters * 0.8, 100) AS construction_area,
      COALESCE(NEW.budget, 0) AS budget
    INTO client_area, client_budget;
    
    -- Crear construction_project automáticamente
    INSERT INTO public.construction_projects (
      project_id,
      construction_area,
      total_budget,
      spent_budget,
      start_date,
      estimated_completion_date,
      overall_progress_percentage,
      permit_status,
      created_by
    ) VALUES (
      NEW.id,
      client_area,
      client_budget,
      0,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '6 months',
      0,
      'pending',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
    ) RETURNING id INTO construction_project_id;
    
    -- Insertar fases por defecto de construcción
    INSERT INTO public.construction_phases (
      construction_project_id,
      phase_name,
      phase_type,
      phase_order,
      description,
      estimated_budget,
      actual_cost,
      progress_percentage,
      status,
      required_team_size,
      created_by
    ) VALUES
    (construction_project_id, 'Trabajos Preliminares', 'preliminares', 1, 'Limpieza del terreno, trazo y nivelación', client_budget * 0.05, 0, 0, 'not_started', 3, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Cimentación', 'cimentacion', 2, 'Excavación, zapatas y contratrabes', client_budget * 0.15, 0, 0, 'not_started', 5, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Estructura', 'estructura', 3, 'Columnas, trabes y losa', client_budget * 0.25, 0, 0, 'not_started', 6, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Albañilería', 'albanileria', 4, 'Muros, tabiques y elementos de mampostería', client_budget * 0.15, 0, 0, 'not_started', 4, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Instalaciones', 'instalaciones', 5, 'Instalaciones eléctricas, hidráulicas y sanitarias', client_budget * 0.20, 0, 0, 'not_started', 3, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Acabados', 'acabados', 6, 'Pisos, azulejos, pintura y detalles', client_budget * 0.15, 0, 0, 'not_started', 4, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Exteriores', 'exteriores', 7, 'Fachadas, jardín y obras exteriores', client_budget * 0.03, 0, 0, 'not_started', 2, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (construction_project_id, 'Limpieza Final', 'limpieza', 8, 'Limpieza general y entrega', client_budget * 0.02, 0, 0, 'not_started', 2, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));
    
    -- Insertar partidas por defecto del presupuesto
    PERFORM insert_default_construction_budget_items(construction_project_id);
    
    -- Log de creación
    INSERT INTO public.construction_budget_changes (
      construction_project_id,
      previous_budget,
      new_budget,
      change_amount,
      change_percentage,
      change_reason,
      authorized_by,
      notes
    ) VALUES (
      construction_project_id,
      0,
      client_budget,
      client_budget,
      100,
      'project_creation',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
      'Proyecto de construcción creado automáticamente al cerrar cliente'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Poblar los proyectos de construcción existentes que no tienen fases
DO $$
DECLARE
  cp_record RECORD;
  admin_profile_id UUID;
BEGIN
  -- Obtener el ID del primer perfil admin
  SELECT id INTO admin_profile_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  -- Para cada proyecto de construcción sin fases, crear las fases por defecto
  FOR cp_record IN 
    SELECT cp.id, cp.total_budget 
    FROM construction_projects cp
    WHERE NOT EXISTS (
      SELECT 1 FROM construction_phases ph WHERE ph.construction_project_id = cp.id
    )
  LOOP
    -- Insertar fases por defecto
    INSERT INTO public.construction_phases (
      construction_project_id,
      phase_name,
      phase_type,
      phase_order,
      description,
      estimated_budget,
      actual_cost,
      progress_percentage,
      status,
      required_team_size,
      created_by
    ) VALUES
    (cp_record.id, 'Trabajos Preliminares', 'preliminares', 1, 'Limpieza del terreno, trazo y nivelación', cp_record.total_budget * 0.05, 0, 0, 'not_started', 3, admin_profile_id),
    (cp_record.id, 'Cimentación', 'cimentacion', 2, 'Excavación, zapatas y contratrabes', cp_record.total_budget * 0.15, 0, 0, 'not_started', 5, admin_profile_id),
    (cp_record.id, 'Estructura', 'estructura', 3, 'Columnas, trabes y losa', cp_record.total_budget * 0.25, 0, 0, 'not_started', 6, admin_profile_id),
    (cp_record.id, 'Albañilería', 'albanileria', 4, 'Muros, tabiques y elementos de mampostería', cp_record.total_budget * 0.15, 0, 0, 'not_started', 4, admin_profile_id),
    (cp_record.id, 'Instalaciones', 'instalaciones', 5, 'Instalaciones eléctricas, hidráulicas y sanitarias', cp_record.total_budget * 0.20, 0, 0, 'not_started', 3, admin_profile_id),
    (cp_record.id, 'Acabados', 'acabados', 6, 'Pisos, azulejos, pintura y detalles', cp_record.total_budget * 0.15, 0, 0, 'not_started', 4, admin_profile_id),
    (cp_record.id, 'Exteriores', 'exteriores', 7, 'Fachadas, jardín y obras exteriores', cp_record.total_budget * 0.03, 0, 0, 'not_started', 2, admin_profile_id),
    (cp_record.id, 'Limpieza Final', 'limpieza', 8, 'Limpieza general y entrega', cp_record.total_budget * 0.02, 0, 0, 'not_started', 2, admin_profile_id);
    
    -- Si no hay partidas de presupuesto, crearlas
    IF NOT EXISTS (SELECT 1 FROM construction_budget_items WHERE construction_project_id = cp_record.id) THEN
      PERFORM insert_default_construction_budget_items(cp_record.id);
    END IF;
    
  END LOOP;
END $$;