-- Fase 1: Corregir la conexión Cliente-Proyecto

-- 1. Función para crear automáticamente construction_projects cuando client_projects pasa a 'cliente_cerrado'
CREATE OR REPLACE FUNCTION public.auto_create_construction_project()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para auto-crear construction_projects
DROP TRIGGER IF EXISTS auto_create_construction_project_trigger ON client_projects;
CREATE TRIGGER auto_create_construction_project_trigger
  AFTER UPDATE ON client_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_construction_project();

-- 3. Migrar datos existentes de client_projects que ya están en 'cliente_cerrado' pero no tienen construction_project
DO $$
DECLARE
  client_project RECORD;
  construction_project_id UUID;
BEGIN
  -- Buscar client_projects cerrados sin construction_project
  FOR client_project IN 
    SELECT cp.* 
    FROM client_projects cp
    LEFT JOIN construction_projects consp ON consp.project_id = cp.id
    WHERE cp.sales_pipeline_stage = 'cliente_cerrado' 
    AND consp.id IS NULL
  LOOP
    -- Crear construction_project para cada cliente cerrado
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
      client_project.id,
      COALESCE(client_project.land_square_meters * 0.8, 100),
      COALESCE(client_project.budget, 0),
      0,
      COALESCE(client_project.conversion_date, CURRENT_DATE),
      COALESCE(client_project.conversion_date, CURRENT_DATE) + INTERVAL '6 months',
      0,
      'pending',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
    ) RETURNING id INTO construction_project_id;
    
    -- Insertar partidas por defecto
    PERFORM insert_default_construction_budget_items(construction_project_id);
    
    -- Log de migración
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
      COALESCE(client_project.budget, 0),
      COALESCE(client_project.budget, 0),
      100,
      'data_migration',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
      'Migración de datos existentes - proyecto creado retroactivamente'
    );
  END LOOP;
END $$;