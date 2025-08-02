-- Crear bucket para documentos de clientes si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para que empleados y admins puedan gestionar documentos de clientes
CREATE POLICY "Employees and admins can view client documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can upload client documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can update client documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can delete client documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);