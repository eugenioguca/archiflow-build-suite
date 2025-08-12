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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove the unique constraint that was causing issues and recreate it properly
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_monthly_image 
ON monthly_featured_images (month, year) 
WHERE is_active = true;

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