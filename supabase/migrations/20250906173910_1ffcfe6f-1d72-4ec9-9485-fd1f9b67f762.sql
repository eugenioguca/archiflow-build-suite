-- Añadir campos faltantes a la tabla client_projects para información del proyecto en PDFs

-- Agregar campo para superficie del terreno
ALTER TABLE client_projects 
ADD COLUMN land_surface_area numeric;

-- Agregar comentarios para clarificar el uso de los campos existentes y nuevos
COMMENT ON COLUMN client_projects.project_location IS 'Ubicación del proyecto (texto libre)';
COMMENT ON COLUMN client_projects.land_surface_area IS 'Superficie del terreno en metros cuadrados';  
COMMENT ON COLUMN client_projects.construction_area IS 'Área de construcción en metros cuadrados';