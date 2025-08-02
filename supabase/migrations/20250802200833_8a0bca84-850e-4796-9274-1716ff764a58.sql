-- Create table for progress photos
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  phase_id UUID,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  altitude DECIMAL(8, 2),
  gps_accuracy DECIMAL(6, 2),
  weather_conditions TEXT,
  temperature_celsius DECIMAL(4, 1),
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_before_photo BOOLEAN DEFAULT false,
  is_after_photo BOOLEAN DEFAULT false,
  comparison_set_id UUID,
  quality_score INTEGER DEFAULT 5,
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for material requirements
CREATE TABLE public.material_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  budget_item_id UUID,
  phase_id UUID,
  material_code TEXT,
  material_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  unit_of_measure TEXT NOT NULL,
  quantity_required DECIMAL(12, 4) NOT NULL,
  quantity_ordered DECIMAL(12, 4) DEFAULT 0,
  quantity_delivered DECIMAL(12, 4) DEFAULT 0,
  quantity_used DECIMAL(12, 4) DEFAULT 0,
  quantity_remaining DECIMAL(12, 4) DEFAULT 0,
  quantity_wasted DECIMAL(12, 4) DEFAULT 0,
  unit_cost DECIMAL(12, 2) DEFAULT 0,
  total_cost DECIMAL(12, 2) DEFAULT 0,
  supplier_id UUID,
  supplier_quote_url TEXT,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  quality_specifications JSONB DEFAULT '{}',
  safety_requirements JSONB DEFAULT '{}',
  storage_requirements TEXT,
  priority_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'required',
  procurement_notes TEXT,
  quality_approved BOOLEAN DEFAULT false,
  quality_approved_by UUID,
  quality_approved_at TIMESTAMP WITH TIME ZONE,
  waste_reason TEXT,
  cost_variance_percentage DECIMAL(5, 2) DEFAULT 0,
  lead_time_days INTEGER,
  min_stock_level DECIMAL(12, 4) DEFAULT 0,
  max_stock_level DECIMAL(12, 4) DEFAULT 0,
  reorder_point DECIMAL(12, 4) DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_code TEXT UNIQUE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'México',
  tax_id TEXT,
  website TEXT,
  specialties TEXT[] DEFAULT '{}',
  materials_categories TEXT[] DEFAULT '{}',
  quality_rating INTEGER DEFAULT 5,
  delivery_rating INTEGER DEFAULT 5,
  price_competitiveness_rating INTEGER DEFAULT 5,
  payment_terms TEXT,
  delivery_radius_km INTEGER,
  minimum_order_amount DECIMAL(12, 2),
  certifications JSONB DEFAULT '{}',
  insurance_info JSONB DEFAULT '{}',
  preferred BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for progress_photos
CREATE POLICY "Employees and admins can manage progress photos" 
ON public.progress_photos 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Create RLS policies for material_requirements
CREATE POLICY "Employees and admins can manage material requirements" 
ON public.material_requirements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Create RLS policies for suppliers
CREATE POLICY "Employees and admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_progress_photos_updated_at
  BEFORE UPDATE ON public.progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_requirements_updated_at
  BEFORE UPDATE ON public.material_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_progress_photos_project_id ON public.progress_photos(project_id);
CREATE INDEX idx_progress_photos_phase_id ON public.progress_photos(phase_id);
CREATE INDEX idx_progress_photos_taken_at ON public.progress_photos(taken_at);
CREATE INDEX idx_progress_photos_category ON public.progress_photos(category);

CREATE INDEX idx_material_requirements_project_id ON public.material_requirements(project_id);
CREATE INDEX idx_material_requirements_phase_id ON public.material_requirements(phase_id);
CREATE INDEX idx_material_requirements_budget_item_id ON public.material_requirements(budget_item_id);
CREATE INDEX idx_material_requirements_supplier_id ON public.material_requirements(supplier_id);
CREATE INDEX idx_material_requirements_status ON public.material_requirements(status);

CREATE INDEX idx_suppliers_company_name ON public.suppliers(company_name);
CREATE INDEX idx_suppliers_active ON public.suppliers(active);
CREATE INDEX idx_suppliers_preferred ON public.suppliers(preferred);