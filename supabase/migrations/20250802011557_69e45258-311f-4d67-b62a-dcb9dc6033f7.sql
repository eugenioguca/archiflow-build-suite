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

-- Simplificar tabla clients - solo datos básicos únicos
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS project_size,
DROP COLUMN IF EXISTS decision_maker_name,
DROP COLUMN IF EXISTS decision_maker_role,
DROP COLUMN IF EXISTS company_size,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS conversion_notes,
DROP COLUMN IF EXISTS sales_pipeline_stage,
DROP COLUMN IF EXISTS lead_referral_details,
DROP COLUMN IF EXISTS curp,
DROP COLUMN IF EXISTS state_name,
DROP COLUMN IF EXISTS service_type,
DROP COLUMN IF EXISTS payment_plan,
DROP COLUMN IF EXISTS land_square_meters,
DROP COLUMN IF EXISTS branch_office_id,
DROP COLUMN IF EXISTS last_activity_date,
DROP COLUMN IF EXISTS estimated_value,
DROP COLUMN IF EXISTS probability_percentage,
DROP COLUMN IF EXISTS conversion_date,
DROP COLUMN IF EXISTS location_details,
DROP COLUMN IF EXISTS preferred_contact_method,
DROP COLUMN IF EXISTS next_contact_date,
DROP COLUMN IF EXISTS last_contact_date,
DROP COLUMN IF EXISTS lead_score,
DROP COLUMN IF EXISTS social_media,
DROP COLUMN IF EXISTS timeline_months,
DROP COLUMN IF EXISTS project_type,
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS lead_source,
DROP COLUMN IF EXISTS assigned_advisor_id,
DROP COLUMN IF EXISTS budget,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS alliance_id;

-- Mantener solo campos básicos del cliente
-- clients ahora solo tendrá: id, profile_id, full_name, email, phone, address, notes, created_at, updated_at

-- Migrar datos existentes a client_projects
INSERT INTO public.client_projects (
  client_id,
  project_name,
  project_description,
  budget,
  timeline_months,
  land_square_meters,
  service_type,
  project_type,
  status,
  sales_pipeline_stage,
  priority,
  estimated_value,
  probability_percentage,
  conversion_date,
  last_contact_date,
  next_contact_date,
  last_activity_date,
  location_details,
  payment_plan,
  conversion_notes,
  notes,
  tags,
  assigned_advisor_id,
  branch_office_id,
  alliance_id,
  lead_referral_details,
  curp,
  created_at,
  updated_at
)
SELECT 
  id as client_id,
  'Proyecto Principal - ' || full_name as project_name,
  'Proyecto migrado automáticamente' as project_description,
  budget,
  timeline_months,
  land_square_meters,
  service_type,
  project_type,
  status,
  sales_pipeline_stage,
  priority,
  estimated_value,
  probability_percentage,
  conversion_date,
  last_contact_date,
  next_contact_date,
  last_activity_date,
  location_details,
  payment_plan,
  conversion_notes,
  notes,
  tags,
  assigned_advisor_id,
  branch_office_id,
  alliance_id,
  lead_referral_details,
  curp,
  created_at,
  updated_at
FROM public.clients;

-- Actualizar referencias en otras tablas para que apunten a project_id
-- Primero agregar columna project_id donde no existe
ALTER TABLE public.client_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);

-- Actualizar client_documents para vincular al proyecto
UPDATE public.client_documents 
SET project_id = (
  SELECT cp.id 
  FROM public.client_projects cp 
  WHERE cp.client_id = client_documents.client_id 
  LIMIT 1
);

-- Trigger para mantener updated_at actualizado
CREATE TRIGGER update_client_projects_updated_at
BEFORE UPDATE ON public.client_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_client_projects_client_id ON public.client_projects(client_id);
CREATE INDEX idx_client_projects_status ON public.client_projects(status);
CREATE INDEX idx_client_projects_sales_stage ON public.client_projects(sales_pipeline_stage);
CREATE INDEX idx_client_documents_project_id ON public.client_documents(project_id);

-- Función para auto-crear proyecto al crear cliente
CREATE OR REPLACE FUNCTION public.auto_create_first_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.client_projects (
    client_id,
    project_name,
    project_description,
    service_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'Proyecto Principal - ' || NEW.full_name,
    'Primer proyecto del cliente',
    'diseño',
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear proyecto automáticamente al crear cliente
CREATE TRIGGER auto_create_first_project_trigger
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_first_project();