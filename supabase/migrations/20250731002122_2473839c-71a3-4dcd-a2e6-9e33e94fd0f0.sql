-- FASE 2: Mejorar tabla de proyectos para fases customizables
ALTER TABLE public.projects 
ADD COLUMN phases JSONB DEFAULT '[]',
ADD COLUMN team_members JSONB DEFAULT '[]',
ADD COLUMN custom_fields JSONB DEFAULT '{}',
ADD COLUMN project_type TEXT DEFAULT 'construccion',
ADD COLUMN location TEXT;

-- FASE 3: Mejorar tabla de clientes para ventas
ALTER TABLE public.clients 
ADD COLUMN conversion_date DATE,
ADD COLUMN conversion_notes TEXT,
ADD COLUMN sales_pipeline_stage TEXT DEFAULT 'lead',
ADD COLUMN probability_percentage INTEGER DEFAULT 0,
ADD COLUMN estimated_value NUMERIC DEFAULT 0,
ADD COLUMN last_activity_date DATE;

-- FASE 4: Crear tabla para actividades de venta
CREATE TABLE public.sales_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  outcome TEXT,
  next_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only employees and admins can manage sales activities" 
ON public.sales_activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- FASE 5: Mejorar documentos para visualización
ALTER TABLE public.documents 
ADD COLUMN file_size BIGINT,
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN document_status TEXT DEFAULT 'active',
ADD COLUMN tags TEXT[],
ADD COLUMN access_level TEXT DEFAULT 'internal';

-- FASE 6: Crear tabla para configuración de cliente
CREATE TABLE public.client_portal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  can_view_photos BOOLEAN DEFAULT true,
  can_view_documents BOOLEAN DEFAULT true,
  can_view_finances BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own portal settings" 
ON public.client_portal_settings 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM public.clients c 
  JOIN public.profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Employees and admins can manage client portal settings" 
ON public.client_portal_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Crear trigger para sales_activities
CREATE TRIGGER update_sales_activities_updated_at
  BEFORE UPDATE ON public.sales_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_portal_settings_updated_at
  BEFORE UPDATE ON public.client_portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();