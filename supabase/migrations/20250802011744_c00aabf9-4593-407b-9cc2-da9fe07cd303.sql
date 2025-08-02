-- Crear nueva tabla para proyectos específicos de clientes
CREATE TABLE public.client_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_description TEXT,
  project_location TEXT,
  project_size TEXT,
  budget NUMERIC DEFAULT 0,
  timeline_months INTEGER,
  land_square_meters NUMERIC,
  service_type TEXT DEFAULT 'diseño',
  project_type project_type,
  status client_status DEFAULT 'potential',
  sales_pipeline_stage TEXT DEFAULT 'lead',
  priority priority_level DEFAULT 'medium',
  estimated_value NUMERIC DEFAULT 0,
  probability_percentage INTEGER DEFAULT 0,
  conversion_date DATE,
  last_contact_date DATE,
  next_contact_date DATE,
  last_activity_date DATE,
  location_details JSONB DEFAULT '{}',
  payment_plan JSONB DEFAULT '{}',
  conversion_notes TEXT,
  notes TEXT,
  tags TEXT[],
  assigned_advisor_id UUID REFERENCES public.profiles(id),
  branch_office_id UUID REFERENCES public.branch_offices(id),
  alliance_id UUID REFERENCES public.commercial_alliances(id),
  lead_referral_details TEXT,
  curp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en client_projects
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

-- Políticas para client_projects
CREATE POLICY "Clients can view their own projects" 
ON public.client_projects 
FOR SELECT 
USING (client_id IN (
  SELECT c.id 
  FROM clients c 
  JOIN profiles p ON p.id = c.profile_id 
  WHERE p.user_id = auth.uid() AND p.role = 'client'
));

CREATE POLICY "Employees and admins can manage client projects" 
ON public.client_projects 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Trigger para mantener updated_at actualizado
CREATE TRIGGER update_client_projects_updated_at
BEFORE UPDATE ON public.client_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_client_projects_client_id ON public.client_projects(client_id);
CREATE INDEX idx_client_projects_status ON public.client_projects(status);
CREATE INDEX idx_client_projects_sales_stage ON public.client_projects(sales_pipeline_stage);