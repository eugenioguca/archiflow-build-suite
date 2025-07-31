-- Crear buckets de almacenamiento para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);

-- Crear tabla para documentos del proyecto  
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla de documentos
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para documentos del proyecto
CREATE POLICY "Los usuarios pueden ver documentos de proyectos" 
ON public.project_documents FOR SELECT 
USING (true);

CREATE POLICY "Los usuarios pueden subir documentos" 
ON public.project_documents FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden actualizar sus documentos" 
ON public.project_documents FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden eliminar sus documentos" 
ON public.project_documents FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Agregar campos faltantes a progress_photos si no existen (sin referencias FK por ahora)
ALTER TABLE public.progress_photos 
ADD COLUMN IF NOT EXISTS phase_id TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS taken_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS uploaded_by_temp UUID;

-- Actualizar campos existentes
UPDATE public.progress_photos SET title = 'Foto de progreso' WHERE title IS NULL;
UPDATE public.progress_photos SET file_path = photo_url WHERE file_path IS NULL;
UPDATE public.progress_photos SET taken_date = taken_at WHERE taken_date IS NULL;

-- Políticas de Storage para documentos del proyecto
CREATE POLICY "Los usuarios pueden ver documentos del proyecto" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'project-documents');

CREATE POLICY "Los usuarios pueden subir documentos del proyecto" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden actualizar sus documentos del proyecto" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden eliminar sus documentos del proyecto" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();