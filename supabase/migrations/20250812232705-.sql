-- Add birth_date to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Create table for company promotions
CREATE TABLE IF NOT EXISTS company_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for operation manuals
CREATE TABLE IF NOT EXISTS operation_manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  category TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for monthly featured images
CREATE TABLE IF NOT EXISTS monthly_featured_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('monthly-images', 'monthly-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('operation-manuals', 'operation-manuals', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE company_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_featured_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_promotions
CREATE POLICY "Everyone can view active promotions" ON company_promotions
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promotions" ON company_promotions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for operation_manuals
CREATE POLICY "Employees can view manuals" ON operation_manuals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Admins can manage manuals" ON operation_manuals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for monthly_featured_images
CREATE POLICY "Everyone can view active monthly images" ON monthly_featured_images
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage monthly images" ON monthly_featured_images
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for monthly-images bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'monthly-images');

CREATE POLICY "Admins can upload monthly images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'monthly-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update monthly images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'monthly-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete monthly images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'monthly-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for operation-manuals bucket
CREATE POLICY "Employees can download manuals" ON storage.objects
FOR SELECT USING (
  bucket_id = 'operation-manuals' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Admins can upload manuals" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'operation-manuals' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update manuals" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'operation-manuals' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete manuals" ON storage.objects
FOR DELETE USING (
  bucket_id = 'operation-manuals' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for promotions bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'promotions');

CREATE POLICY "Admins can upload promotion images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'promotions' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update promotion images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'promotions' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete promotion images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'promotions' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);