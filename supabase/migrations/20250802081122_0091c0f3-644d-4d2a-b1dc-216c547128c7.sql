-- Migración paso a paso para evitar conflictos de foreign keys
-- Paso 1: Eliminar restricciones temporalmente y agregar campos a client_projects
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

-- Paso 3: Eliminar foreign key constraints temporalmente
ALTER TABLE construction_budget_items DROP CONSTRAINT IF EXISTS construction_budget_items_construction_project_id_fkey;
ALTER TABLE construction_phases DROP CONSTRAINT IF EXISTS construction_phases_construction_project_id_fkey;
ALTER TABLE construction_timelines DROP CONSTRAINT IF EXISTS construction_timelines_construction_project_id_fkey;
ALTER TABLE construction_expenses DROP CONSTRAINT IF EXISTS construction_expenses_construction_project_id_fkey;
ALTER TABLE construction_materials DROP CONSTRAINT IF EXISTS construction_materials_construction_project_id_fkey;
ALTER TABLE construction_teams DROP CONSTRAINT IF EXISTS construction_teams_construction_project_id_fkey;
ALTER TABLE construction_deliveries DROP CONSTRAINT IF EXISTS construction_deliveries_construction_project_id_fkey;
ALTER TABLE construction_budget_alerts DROP CONSTRAINT IF EXISTS construction_budget_alerts_construction_project_id_fkey;
ALTER TABLE construction_budget_changes DROP CONSTRAINT IF EXISTS construction_budget_changes_construction_project_id_fkey;