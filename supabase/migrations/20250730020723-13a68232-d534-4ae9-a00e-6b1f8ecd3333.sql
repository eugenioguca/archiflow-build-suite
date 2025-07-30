-- Agregar campo avatar_url a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Crear bucket para avatares de usuarios
INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true);

-- Políticas para el bucket de avatares
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);