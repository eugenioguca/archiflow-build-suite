-- Create promotions storage bucket for company promotions images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for promotions bucket
-- Allow public read access to promotion images
CREATE POLICY "Public can view promotion images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'promotions');

-- Allow admins to upload promotion images
CREATE POLICY "Admins can upload promotion images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'promotions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Allow admins to update promotion images
CREATE POLICY "Admins can update promotion images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'promotions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Allow admins to delete promotion images
CREATE POLICY "Admins can delete promotion images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'promotions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);