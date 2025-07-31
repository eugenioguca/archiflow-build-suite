-- Migración para unificar el sistema de archivos (documentos y fotos)
-- Eliminar tabla project_documents duplicada y usar solo la tabla documents

-- Primero, migrar datos de project_documents a documents si existen
INSERT INTO documents (
  id, name, description, file_path, file_type, category, 
  project_id, uploaded_by, created_at, file_size, version,
  document_status, access_level
)
SELECT 
  id, name, description, file_path, file_type, 'project' as category,
  project_id, uploaded_by, created_at, file_size, 1 as version,
  'active' as document_status, 'internal' as access_level
FROM project_documents
WHERE NOT EXISTS (
  SELECT 1 FROM documents d WHERE d.id = project_documents.id
);

-- Eliminar tabla project_documents ya que es redundante
DROP TABLE IF EXISTS project_documents;

-- Crear tabla unificada de archivos que incluya documentos y fotos
CREATE TABLE IF NOT EXISTS project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_category TEXT NOT NULL CHECK (file_category IN ('document', 'photo', 'video', 'other')),
  category TEXT, -- categoría específica del archivo (contract, invoice, progress, etc.)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_size BIGINT,
  version INTEGER DEFAULT 1,
  document_status TEXT DEFAULT 'active' CHECK (document_status IN ('active', 'archived', 'deleted')),
  access_level TEXT DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'restricted')),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Validación: al menos uno de project_id o client_id debe estar presente
  CONSTRAINT project_files_must_have_project_or_client CHECK (
    project_id IS NOT NULL OR client_id IS NOT NULL
  )
);

-- Habilitar RLS para project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Políticas para project_files
CREATE POLICY "Employees and admins can manage all files" 
ON project_files 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Clients can view their project files" 
ON project_files 
FOR SELECT 
TO authenticated
USING (
  -- Archivos de proyectos del cliente
  project_id IN (
    SELECT pr.id FROM projects pr
    JOIN clients c ON pr.client_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ) OR
  -- Archivos directamente asignados al cliente
  client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Migrar datos de documents a project_files
INSERT INTO project_files (
  id, name, description, file_path, file_type, file_category, category,
  project_id, client_id, uploaded_by, file_size, version,
  document_status, access_level, tags, created_at
)
SELECT 
  id, name, description, file_path, file_type, 
  'document' as file_category, category,
  project_id, client_id, uploaded_by, file_size, version,
  document_status, access_level, tags, created_at
FROM documents
WHERE NOT EXISTS (
  SELECT 1 FROM project_files pf WHERE pf.id = documents.id
);

-- Migrar datos de progress_photos a project_files
INSERT INTO project_files (
  id, name, description, file_path, file_type, file_category, category,
  project_id, uploaded_by, file_size, metadata, created_at
)
SELECT 
  id, 
  COALESCE(title, 'Foto de progreso') as name,
  description, 
  COALESCE(file_path, photo_url) as file_path,
  'image/jpeg' as file_type,
  'photo' as file_category,
  'progress' as category,
  project_id, 
  taken_by as uploaded_by,
  NULL as file_size,
  jsonb_build_object(
    'taken_date', taken_date,
    'phase_id', phase_id,
    'taken_at', taken_at
  ) as metadata,
  taken_at as created_at
FROM progress_photos
WHERE NOT EXISTS (
  SELECT 1 FROM project_files pf WHERE pf.file_path = COALESCE(progress_photos.file_path, progress_photos.photo_url)
);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Crear índices para mejor rendimiento
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_client_id ON project_files(client_id);
CREATE INDEX idx_project_files_uploaded_by ON project_files(uploaded_by);
CREATE INDEX idx_project_files_file_category ON project_files(file_category);
CREATE INDEX idx_project_files_created_at ON project_files(created_at DESC);