-- Eliminar constraint existente que referencia la tabla projects vacía
ALTER TABLE progress_photos DROP CONSTRAINT progress_photos_project_id_fkey;

-- Crear nuevo constraint que referencia client_projects (la tabla que realmente usa la aplicación)
ALTER TABLE progress_photos ADD CONSTRAINT progress_photos_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE;