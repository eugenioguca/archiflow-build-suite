-- Create function to auto-populate construction project from client project
CREATE OR REPLACE FUNCTION public.create_construction_project_from_client(client_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  construction_project_id UUID;
  client_budget NUMERIC;
  client_area NUMERIC;
  client_name TEXT;
BEGIN
  -- Get client project data
  SELECT 
    cp.budget, 
    cp.land_square_meters,
    c.full_name
  INTO client_budget, client_area, client_name
  FROM client_projects cp
  JOIN clients c ON cp.client_id = c.id
  WHERE cp.id = client_project_id;
  
  -- Create construction project with inherited data
  INSERT INTO public.construction_projects (
    project_id,
    construction_area,
    total_budget,
    spent_budget,
    start_date,
    estimated_completion_date,
    overall_progress_percentage,
    permit_status,
    created_by
  ) VALUES (
    client_project_id,
    COALESCE(client_area * 0.8, 100), -- 80% of land area as default construction area
    COALESCE(client_budget, 0),
    0,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 months', -- Default 6 months completion
    0,
    'pending',
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  ) RETURNING id INTO construction_project_id;
  
  RETURN construction_project_id;
END;
$$;

-- Create budget items table for construction projects
CREATE TABLE IF NOT EXISTS public.construction_budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad NUMERIC NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'delivered')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS on construction budget items
ALTER TABLE public.construction_budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for construction budget items
CREATE POLICY "Employees and admins can manage construction budget items"
ON public.construction_budget_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Create trigger to update total when price or quantity changes
CREATE OR REPLACE FUNCTION public.update_budget_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total = NEW.cantidad * NEW.precio_unitario;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_construction_budget_item_total
  BEFORE INSERT OR UPDATE ON public.construction_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_item_total();

-- Function to insert default budget items for a construction project
CREATE OR REPLACE FUNCTION public.insert_default_construction_budget_items(construction_project_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_profile_id UUID;
BEGIN
  -- Get first admin profile as creator
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;

  INSERT INTO public.construction_budget_items (
    construction_project_id, 
    codigo, 
    descripcion, 
    unidad, 
    cantidad,
    precio_unitario, 
    total, 
    categoria,
    created_by
  ) VALUES
  (construction_project_id_param, 'CON-001', 'Concreto premezclado f''c=200 kg/cm²', 'm³', 150, 2800, 420000, 'Concreto', admin_profile_id),
  (construction_project_id_param, 'ACE-001', 'Varilla de acero #4 (1/2")', 'ton', 25, 22000, 550000, 'Acero', admin_profile_id),
  (construction_project_id_param, 'BLO-001', 'Block de concreto 15x20x40 cm', 'pza', 2000, 15, 30000, 'Mampostería', admin_profile_id),
  (construction_project_id_param, 'CEM-001', 'Cemento Portland gris 50kg', 'bulto', 200, 250, 50000, 'Cemento', admin_profile_id),
  (construction_project_id_param, 'GRA-001', 'Grava de 3/4"', 'm³', 80, 400, 32000, 'Agregados', admin_profile_id),
  (construction_project_id_param, 'ARE-001', 'Arena de río', 'm³', 60, 350, 21000, 'Agregados', admin_profile_id),
  (construction_project_id_param, 'LAM-001', 'Lámina galvanizada calibre 26', 'm²', 100, 180, 18000, 'Techos', admin_profile_id),
  (construction_project_id_param, 'TUB-001', 'Tubería PVC sanitario 4"', 'm', 50, 120, 6000, 'Instalaciones', admin_profile_id),
  (construction_project_id_param, 'CAB-001', 'Cable eléctrico calibre 12 AWG', 'm', 200, 25, 5000, 'Instalaciones', admin_profile_id),
  (construction_project_id_param, 'PIN-001', 'Pintura vinílica interior', 'lt', 80, 180, 14400, 'Acabados', admin_profile_id);
END;
$$;