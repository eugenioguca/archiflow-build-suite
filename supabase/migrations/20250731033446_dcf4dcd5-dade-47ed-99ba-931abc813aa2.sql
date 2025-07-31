-- Crear buckets de almacenamiento para documentos y fotos de progreso
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);

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

-- Crear tabla para fotos de progreso
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id TEXT, -- ID de la fase (puede ser null para fotos generales)
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  taken_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en las tablas
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Políticas para documentos del proyecto
CREATE POLICY "Los usuarios pueden ver documentos de proyectos" 
ON public.project_documents FOR SELECT 
USING (true); -- Por simplicidad, todos pueden ver documentos

CREATE POLICY "Los usuarios pueden subir documentos" 
ON public.project_documents FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden actualizar sus documentos" 
ON public.project_documents FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden eliminar sus documentos" 
ON public.project_documents FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Políticas para fotos de progreso
CREATE POLICY "Los usuarios pueden ver fotos de progreso" 
ON public.progress_photos FOR SELECT 
USING (true); -- Por simplicidad, todos pueden ver fotos

CREATE POLICY "Los usuarios pueden subir fotos" 
ON public.progress_photos FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden actualizar sus fotos" 
ON public.progress_photos FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Los usuarios pueden eliminar sus fotos" 
ON public.progress_photos FOR DELETE 
USING (auth.uid() = uploaded_by);

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

-- Políticas de Storage para fotos de progreso
CREATE POLICY "Los usuarios pueden ver fotos de progreso" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'progress-photos');

CREATE POLICY "Los usuarios pueden subir fotos de progreso" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden actualizar sus fotos de progreso" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden eliminar sus fotos de progreso" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_photos_updated_at
  BEFORE UPDATE ON public.progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();