-- Crear bucket para documentos de clientes si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket client-documents
CREATE POLICY "Employees and admins can upload client documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'client-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can view client documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'client-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can delete client documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'client-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can update client documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'client-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);