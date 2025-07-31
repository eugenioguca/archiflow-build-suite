-- Crear bucket para fotos de progreso si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket progress-photos
CREATE POLICY "Los usuarios pueden ver fotos de progreso" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'progress-photos');

CREATE POLICY "Los usuarios pueden subir fotos de progreso" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid() = owner);

CREATE POLICY "Los usuarios pueden actualizar sus fotos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'progress-photos' AND auth.uid() = owner);

CREATE POLICY "Los usuarios pueden eliminar sus fotos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'progress-photos' AND auth.uid() = owner);