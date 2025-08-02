-- Migración para consolidar arquitectura de construcción en client_projects
-- Paso 1: Agregar campos de construcción a client_projects
ALTER TABLE client_projects 
ADD COLUMN IF NOT EXISTS construction_area NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS construction_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS construction_start_date DATE,
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE,
ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
ADD COLUMN IF NOT EXISTS overall_progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS permit_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS permit_expiry_date DATE,
ADD COLUMN IF NOT EXISTS project_manager_id UUID,
ADD COLUMN IF NOT EXISTS construction_supervisor_id UUID,
ADD COLUMN IF NOT EXISTS location_coordinates JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS weather_considerations TEXT,
ADD COLUMN IF NOT EXISTS safety_requirements TEXT;

-- Paso 2: Migrar datos de construction_projects a client_projects
UPDATE client_projects 
SET 
  construction_area = COALESCE(cp.construction_area, client_projects.land_square_meters * 0.8, 100),
  construction_budget = COALESCE(cp.total_budget, client_projects.budget, 0),
  spent_budget = COALESCE(cp.spent_budget, 0),
  construction_start_date = cp.start_date,
  estimated_completion_date = cp.estimated_completion_date,
  actual_completion_date = cp.actual_completion_date,
  overall_progress_percentage = COALESCE(cp.overall_progress_percentage, 0),
  permit_status = COALESCE(cp.permit_status, 'pending'),
  permit_expiry_date = cp.permit_expiry_date,
  project_manager_id = cp.project_manager_id,
  construction_supervisor_id = cp.construction_supervisor_id,
  location_coordinates = COALESCE(cp.location_coordinates, '{}'),
  weather_considerations = cp.weather_considerations,
  safety_requirements = cp.safety_requirements
FROM construction_projects cp
WHERE cp.project_id = client_projects.id;

-- Paso 3: Actualizar tablas relacionadas para usar client_projects.id directamente
-- Actualizar construction_budget_items
ALTER TABLE construction_budget_items 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_budget_items 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_items.project_id = cp.id;

-- Actualizar construction_phases
ALTER TABLE construction_phases 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_phases 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_phases.project_id = cp.id;

-- Actualizar construction_timelines
ALTER TABLE construction_timelines 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_timelines 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_timelines.project_id = cp.id;

-- Actualizar construction_expenses
ALTER TABLE construction_expenses 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_expenses 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_expenses.project_id = cp.id;

-- Actualizar construction_materials
ALTER TABLE construction_materials 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_materials 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_materials.project_id = cp.id;

-- Actualizar construction_teams
ALTER TABLE construction_teams 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_teams 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_teams.project_id = cp.id;

-- Actualizar construction_deliveries
ALTER TABLE construction_deliveries 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_deliveries 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_deliveries.project_id = cp.id;

-- Actualizar construction_budget_alerts
ALTER TABLE construction_budget_alerts 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_budget_alerts 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_alerts.project_id = cp.id;

-- Actualizar construction_budget_changes
ALTER TABLE construction_budget_changes 
RENAME COLUMN construction_project_id TO project_id;

UPDATE construction_budget_changes 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_changes.project_id = cp.id;

-- Paso 4: Actualizar funciones para usar la nueva estructura
CREATE OR REPLACE FUNCTION public.insert_default_construction_budget_items(project_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id UUID;
BEGIN
  -- Get first admin profile as creator
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
  alert_message TEXT;
BEGIN
  -- Get project budget and spending from client_projects
  SELECT construction_budget, spent_budget INTO project_budget, spent_amount
  FROM client_projects 
  WHERE id = project_id_param;
  
  IF project_budget > 0 THEN
    budget_percentage := (spent_amount / project_budget) * 100;
    
    -- Create alert if budget exceeds 100%
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
    -- Create warning if budget exceeds 90%
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

-- Actualizar función de auto-creación para usar client_projects directamente
CREATE OR REPLACE FUNCTION public.auto_create_construction_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_area NUMERIC;
  client_budget NUMERIC;
BEGIN
  -- Solo crear datos de construcción si pasa a 'cliente_cerrado' y no se han inicializado
  IF NEW.sales_pipeline_stage = 'cliente_cerrado' 
     AND (OLD.sales_pipeline_stage != 'cliente_cerrado' OR OLD.sales_pipeline_stage IS NULL)
     AND NEW.construction_area IS NULL THEN
    
    -- Obtener datos del cliente para heredar
    SELECT 
      COALESCE(NEW.land_square_meters * 0.8, 100) AS construction_area,
      COALESCE(NEW.budget, 0) AS budget
    INTO client_area, client_budget;
    
    -- Inicializar campos de construcción en client_projects
    UPDATE public.client_projects SET
      construction_area = client_area,
      construction_budget = client_budget,
      spent_budget = 0,
      construction_start_date = CURRENT_DATE,
      estimated_completion_date = CURRENT_DATE + INTERVAL '6 months',
      overall_progress_percentage = 0,
      permit_status = 'pending'
    WHERE id = NEW.id;
    
    -- Insertar fases por defecto de construcción
    INSERT INTO public.construction_phases (
      project_id,
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
    (NEW.id, 'Trabajos Preliminares', 'preliminares', 1, 'Limpieza del terreno, trazo y nivelación', client_budget * 0.05, 0, 0, 'not_started', 3, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Cimentación', 'cimentacion', 2, 'Excavación, zapatas y contratrabes', client_budget * 0.15, 0, 0, 'not_started', 5, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Estructura', 'estructura', 3, 'Columnas, trabes y losa', client_budget * 0.25, 0, 0, 'not_started', 6, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Albañilería', 'albanileria', 4, 'Muros, tabiques y elementos de mampostería', client_budget * 0.15, 0, 0, 'not_started', 4, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Instalaciones', 'instalaciones', 5, 'Instalaciones eléctricas, hidráulicas y sanitarias', client_budget * 0.20, 0, 0, 'not_started', 3, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Acabados', 'acabados', 6, 'Pisos, azulejos, pintura y detalles', client_budget * 0.15, 0, 0, 'not_started', 4, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Exteriores', 'exteriores', 7, 'Fachadas, jardín y obras exteriores', client_budget * 0.03, 0, 0, 'not_started', 2, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    (NEW.id, 'Limpieza Final', 'limpieza', 8, 'Limpieza general y entrega', client_budget * 0.02, 0, 0, 'not_started', 2, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));
    
    -- Insertar partidas por defecto del presupuesto
    PERFORM insert_default_construction_budget_items(NEW.id);
    
    -- Log de creación
    INSERT INTO public.construction_budget_changes (
      project_id,
      previous_budget,
      new_budget,
      change_amount,
      change_percentage,
      change_reason,
      authorized_by,
      notes
    ) VALUES (
      NEW.id,
      0,
      client_budget,
      client_budget,
      100,
      'project_creation',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
      'Proyecto de construcción inicializado automáticamente al cerrar cliente'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;