-- Paso 4: Renombrar columnas y actualizar referencias
ALTER TABLE construction_budget_items RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_phases RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_timelines RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_expenses RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_materials RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_teams RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_deliveries RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_budget_alerts RENAME COLUMN construction_project_id TO project_id;
ALTER TABLE construction_budget_changes RENAME COLUMN construction_project_id TO project_id;

-- Paso 5: Actualizar los IDs para usar client_projects.id directamente
UPDATE construction_budget_items 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_items.project_id = cp.id;

UPDATE construction_phases 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_phases.project_id = cp.id;

UPDATE construction_timelines 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_timelines.project_id = cp.id;

UPDATE construction_expenses 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_expenses.project_id = cp.id;

UPDATE construction_materials 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_materials.project_id = cp.id;

UPDATE construction_teams 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_teams.project_id = cp.id;

UPDATE construction_deliveries 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_deliveries.project_id = cp.id;

UPDATE construction_budget_alerts 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_alerts.project_id = cp.id;

UPDATE construction_budget_changes 
SET project_id = cp.project_id
FROM construction_projects cp
WHERE construction_budget_changes.project_id = cp.id;

-- Paso 6: Agregar nuevas foreign key constraints hacia client_projects
ALTER TABLE construction_budget_items 
ADD CONSTRAINT construction_budget_items_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_phases 
ADD CONSTRAINT construction_phases_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_timelines 
ADD CONSTRAINT construction_timelines_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_expenses 
ADD CONSTRAINT construction_expenses_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_materials 
ADD CONSTRAINT construction_materials_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_teams 
ADD CONSTRAINT construction_teams_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_deliveries 
ADD CONSTRAINT construction_deliveries_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_budget_alerts 
ADD CONSTRAINT construction_budget_alerts_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;

ALTER TABLE construction_budget_changes 
ADD CONSTRAINT construction_budget_changes_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;